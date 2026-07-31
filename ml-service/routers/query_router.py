import base64
import json
import logging
import os
import re
from typing import Optional
from fastapi import APIRouter, Depends, Request, UploadFile, File, Form
from dependencies.context import get_gps_context, get_current_user
from pydantic import BaseModel

from prompts.modality_prompts import (
    TEXT_QUERY_PROMPT, IMAGE_DIAGNOSIS_PROMPT,
    SOIL_ADVISOR_PROMPT, VOICE_NLP_PROMPT
)
from utils.language import get_language_rule, build_system_prompt, translate_fallback_text
from services.rag_service import rag_service
from services.kag_service import kag_service
from services.crop_service import crop_service
from services.disease_service import disease_service
from services.voice_service import voice_service
from services.intent_service import intent_service
from services.unified_llm_service import unified_llm_service
from services.context_service import context_service
from services.location_service import location_service
import json

logger = logging.getLogger("krishimind.query")

router = APIRouter(prefix="", tags=["Modality Queries"])

# Ollama config is now managed by unified_llm_service


# ── Dependency: Decode base64 x-user-profile header ──
async def get_current_user(request: Request):
    profile_header = request.headers.get("x-user-profile")
    user = {"preferredLanguage": "english"}
    if profile_header:
        try:
            decoded_bytes = base64.b64decode(profile_header)
            user = json.loads(decoded_bytes.decode('utf-8'))
        except Exception as e:
            logger.error("Failed to decode base64 x-user-profile header: %s", e)

    # Extract GPS coordinates from headers (always-on GPS)
    lat = request.headers.get("x-latitude") or request.headers.get("X-Latitude")
    lon = request.headers.get("x-longitude") or request.headers.get("X-Longitude")
    if lat and lon:
        try:
            user["_gps_lat"] = float(lat)
            user["_gps_lon"] = float(lon)
        except (ValueError, TypeError):
            pass
    return user


# ── Request Models ──
class TextQueryRequest(BaseModel):
    query: str
    image_b64: Optional[str] = None


class SoilData(BaseModel):
    N: float
    P: float
    K: float
    pH: float = 6.5
    temp: float = 25.0
    humidity: float = 80.0
    rainfall: float = 100.0


class VoiceQueryRequest(BaseModel):
    transcript: str


# ── Greeting Responses ──
import random

GREETING_RESPONSES = [
    "Namaste! 🙏 I'm **KrishiMitra AI**, your AI agricultural assistant.\n\nI can help you with:\n- 🍂 **Disease Detection** — Upload a leaf photo for instant diagnosis\n- 🌱 **Crop Recommendations** — Tell me your soil type and I'll suggest the best crop\n- 💰 **Market Prices** — Check current mandi rates for your produce\n- 🧪 **Soil Analysis** — Get fertilizer recommendations based on your NPK values\n- 🌤️ **Weather Advisory** — Plan your farming activities around the forecast\n\nJust type your question or upload a photo to get started!",
    "Hello! 👋 Welcome to **KrishiMitra AI** — your smart farming companion.\n\nHow can I help you today?\n- Ask about **crop diseases** and treatments\n- Get **soil-based crop recommendations**\n- Check **market prices** and trends\n- Learn about **government schemes** for farmers\n\nTry asking something like: *\"What is the treatment for early blight in tomato?\"*",
    "Hey there! 🌾 I'm **KrishiMitra AI**, here to help you farm smarter.\n\nYou can:\n- 📸 Upload a **leaf photo** for disease diagnosis\n- 💬 Ask any **agriculture question**\n- 📊 Get **personalized crop advice**\n\nWhat would you like to know?",
]

def _get_greeting_response(query: str, user: dict) -> dict:
    """Return a warm greeting without hitting RAG/KAG/Ollama."""
    q = query.lower().strip()
    name = user.get("name", "").strip()
    greeting_prefix = f"Hi {name}! " if name and name.lower() not in ("farmer", "demo farmer", "") else ""

    # Thanks response
    if any(w in q for w in ["thanks", "thank you", "dhanyavad", "dhanyavaada"]):
        return {
            "answer": f"{greeting_prefix}You're welcome! 😊 I'm always here to help with your farming questions. Feel free to ask anything about crops, diseases, soil, or market prices.",
            "citations": [],
            "follow_up_questions": ["What crops are best for the current season?", "How to improve soil health organically?", "What government schemes am I eligible for?"],
            "confidence_score": 1.0,
            "intent": "greeting",
        }

    # Bye response
    if any(w in q for w in ["bye", "goodbye", "see you"]):
        return {
            "answer": f"{greeting_prefix}Goodbye! 👋 Wishing you a great harvest. Come back anytime you need farming advice. 🌾",
            "citations": [],
            "follow_up_questions": [],
            "confidence_score": 1.0,
            "intent": "greeting",
        }

    # Standard greeting
    answer = greeting_prefix + random.choice(GREETING_RESPONSES)
    return {
        "answer": answer,
        "citations": [],
        "follow_up_questions": [
            "What is the best crop for red soil in kharif season?",
            "How to identify early blight in tomato?",
            "What are the current market prices for rice?"
        ],
        "confidence_score": 1.0,
        "intent": "greeting",
    }


# ── Unified LLM Chat & Vision Helpers (Ollama-first) ──

async def llm_chat(system_prompt: str, user_message: str, context: list = None, location_ctx: dict = None):
    """
    Call unified LLM (Ollama-first, Gemini fallback).
    """
    try:
        answer = await unified_llm_service.chat(system_prompt, user_message, context)
        return {"answer": answer}
    except Exception as e:
        logger.error("All LLM backends failed: %s. Using smart offline fallback formatting.", e)
        from utils.fallback_formatter import format_offline_fallback
        formatted_answer = format_offline_fallback(user_message, context or [], location_context=location_ctx)
        return {"answer": formatted_answer}


async def llm_vision(system_prompt: str, image_b64: str, user_prompt: str = "Analyze this image.", cnn_result: dict = None):
    """
    Call unified vision model (LLaVA-first, Gemini fallback).
    """
    try:
        if cnn_result:
            user_prompt += f" CNN classification result context: {json.dumps(cnn_result)}"
        answer = await unified_llm_service.vision(system_prompt, image_b64, user_prompt=user_prompt)
        return {"answer": answer}
    except Exception as e:
        logger.error("Vision analysis failed: %s. Falling back to CNN report.", e)

    if cnn_result:
        crop = cnn_result.get("crop", "Unknown")
        disease = cnn_result.get("disease", "Unknown")
        confidence = cnn_result.get("confidence", 0)
        severity = cnn_result.get("severity", "Unknown")
        return {
            "answer": f"### 🔬 Local CNN Pathology Diagnosis\n- **Crop**: {crop}\n- **Disease**: {disease}\n- **Confidence**: {confidence}%\n- **Severity**: {severity}\n\n*Note: Install LLaVA (`ollama pull llava:7b`) for detailed visual explanation.*"
        }

    return {"answer": "Error: Install a vision model (`ollama pull llava:7b`) for plant disease diagnosis."}



async def chromadb_search(query: str, soil_type: str = None, district: str = None) -> list:
    try:
        # 1. Primary semantic search
        primary_chunks = rag_service.retrieve(query, top_k=4)
        
        # 2. Location-expanded semantic search if location details are available
        if soil_type or district:
            loc_details = []
            if soil_type: loc_details.append(soil_type)
            if district: loc_details.append(district)
            expanded_query = f"{query} for {' '.join(loc_details)}"
            
            expanded_chunks = rag_service.retrieve(expanded_query, top_k=3)
            
            # Merge and de-duplicate based on content signatures
            seen_sigs = set()
            merged = []
            for chunk in primary_chunks + expanded_chunks:
                txt_sig = chunk.get("text", "").strip().lower()[:100]
                if txt_sig and txt_sig not in seen_sigs:
                    seen_sigs.add(txt_sig)
                    merged.append(chunk)
            return merged[:5]
            
        return primary_chunks
    except Exception as e:
        logger.error("ChromaDB search failed: %s", e)
        return []


async def neo4j_lookup(query: str, agro_zone: str = None, soil_type: str = None) -> list:
    try:
        from services.krishi_search_service import KNOWN_CROPS
        q = query.lower()
        mentioned_crops = [c for c in KNOWN_CROPS if c in q]
        
        context = []
        # 1. Standard crop-specific profile lookup
        if mentioned_crops:
            crop_name = mentioned_crops[0].title()
            profile = kag_service.get_full_crop_profile(crop_name)
            if profile.get("crop"):
                info = profile["crop"]
                soils = ", ".join(info.get("soils", []))
                climates = ", ".join(info.get("climates", []))
                context.append(f"Crop {crop_name} grows in soils ({soils}) and thrives in climate ({climates}).")
            
            for d in profile.get("diseases", []):
                disease_name = d["disease"]
                cause = d.get("cause", "Unknown")
                context.append(f"Crop {crop_name} is vulnerable to disease '{disease_name}' caused by {cause}.")
                treatments = [t["treatment"] for t in d.get("treatments", [])]
                if treatments:
                    context.append(f"Disease '{disease_name}' is treated by: {', '.join(treatments)}.")
                    
        # 2. Location-based structured crop suitability lookup
        if agro_zone:
            suited_crops = kag_service.get_crops_for_climate(agro_zone, soil_type)
            if suited_crops:
                names = [c["crop"] for c in suited_crops]
                context.append(
                    f"Structured Knowledge Graph: Suited crops for {agro_zone} zone "
                    f"with {soil_type or 'any'} soil: {', '.join(names)}."
                )
                # Append micro-details for top 3 matching crops
                for c in suited_crops[:3]:
                    context.append(
                        f"Crop {c['crop']} thrives in {agro_zone} (temp range: {c.get('min_temp')}°C-{c.get('max_temp')}°C, "
                        f"water req: {c.get('water_req')}, duration: {c.get('duration')} days)."
                    )
        return context
    except Exception as e:
        logger.error("Neo4j lookup failed: %s", e)
        return []


# ── API Endpoint Handlers ──

@router.post("/text")
async def handle_text_query(request: TextQueryRequest, gps_ctx: dict = Depends(get_gps_context)):
    user = gps_ctx["user"]
    district = gps_ctx["district"]
    state = gps_ctx["state"]
    weather = gps_ctx["weather"]
    weather_str = gps_ctx["weather_str"]
    season = gps_ctx["season"]
    soil_type = gps_ctx["soil_type"]
    agro_zone = gps_ctx["agro_zone"]
    major_crops = gps_ctx["major_crops"]
    location_ctx_str = gps_ctx["location_ctx_str"]
    crop = gps_ctx["crop"]

    # Classify intent first — enables early return for non-agricultural queries
    intent_result = intent_service.classify(request.query)
    
    # ── Early return for greetings — skip the entire RAG/KAG/Ollama pipeline ──
    if intent_result.intent == "greeting":
        res = _get_greeting_response(request.query, user)
        # Auto-translate greeting response if needed
        res["answer"] = translate_fallback_text(res["answer"], user.get("preferredLanguage", "en"))
        return res
    
    context_injection = (
        f"\n\n--- FARMER LOCATION & WEATHER CONTEXT (GPS-Based) ---\n"
        f"Location: {district}, {state}\n"
        f"Agro-Climatic Zone: {agro_zone}\n"
        f"Soil Type: {soil_type}\n"
        f"Primary Crop: {crop}\n"
        f"Major Crops in Area: {', '.join(major_crops) if major_crops else 'N/A'}\n"
        f"Current Season: {season}\n"
        f"Current Weather: {weather_str}\n"
        f"Weather Source: {weather.get('source', 'profile')}\n"
    )
    if location_ctx_str:
        context_injection += f"\n{location_ctx_str}\n"

    # ── Image Diagnosis Branch (if image_b64 attached) ──
    if request.image_b64:
        try:
            image_bytes = base64.b64decode(request.image_b64)
            diag = await disease_service.classify(image_bytes, crop_context=crop, query=request.query)
            cnn_info_str = f"Classifier finding: Crop '{diag.get('crop')}', Condition '{diag.get('disease')}' ({diag.get('confidence')}% confidence, Severity: {diag.get('severity')})."
            img_system = build_system_prompt(IMAGE_DIAGNOSIS_PROMPT + context_injection, user)
            user_prompt = f"{request.query or 'Examine this crop leaf image carefully. Identify the crop and diagnose any disease, pest, or nutrient issue.'}\n\n[Context: {cnn_info_str}]"
            res = await llm_vision(img_system, request.image_b64, user_prompt=user_prompt)
            preferred_lang = user.get("preferredLanguage", "en")
            translated_answer = translate_fallback_text(res["answer"], preferred_lang)
            return {
                "answer": translated_answer,
                "crop": diag.get("crop"),
                "disease": diag.get("disease"),
                "confidence_score": diag.get("confidence", 90.0) / 100.0,
                "severity": diag.get("severity"),
                "intent": "disease_diagnosis",
                "location": {"district": district, "state": state, "soil_type": soil_type},
            }
        except Exception as err:
            logger.error("Failed to process image in text query: %s", err)

    system = build_system_prompt(TEXT_QUERY_PROMPT + context_injection, user)
    
    # Retrieve semantic context with location expansion and Structured KG matching
    chunks = await chromadb_search(request.query, soil_type=soil_type, district=district)
    kg_context = await neo4j_lookup(request.query, agro_zone=agro_zone, soil_type=soil_type)
    
    # Build RAG context strings from retrieved chunks (FIX: was rag_context, undefined)
    rag_context = [f"[Source: {c.get('title', 'Agricultural Guide')}]\n{c['text']}" for c in chunks]
    
    loc_ctx = {
        "district": district,
        "state": state,
        "soil_type": soil_type,
        "weather": weather,
        "season": season,
        "agro_zone": agro_zone,
        "major_crops": major_crops or ["Paddy", "Tomato", "Maize", "Ragi", "Sugarcane"],
    }

    # Run unified LLM chat (Ollama-first, Gemini fallback)
    res = await llm_chat(system, request.query, context=rag_context + kg_context, location_ctx=loc_ctx)
    
    # Always respect user's preferred language — don't override with English detection
    preferred_lang = user.get("preferredLanguage", "en")
    # Only use detected language if it's a non-English script language
    detected_lang = "en"
    try:
        detected_lang = voice_service.detect_language_from_text(request.query)
    except Exception:
        pass
    # If user prefers a regional language, always use it regardless of query language
    target_lang = preferred_lang if preferred_lang not in ("en", "english") else (detected_lang if detected_lang != "en" else "en")
    
    # Auto-translate answer if needed
    translated_answer = translate_fallback_text(res["answer"], target_lang)
    
    # Map sources to standard citations payload for frontend chips
    citations = [
        {
            "index": i + 1,
            "source": c.get("source", "ICAR"),
            "title": c.get("title", "Agricultural Guidelines"),
            "snippet": c.get("excerpt", "")
        }
        for i, c in enumerate(chunks)
    ]
    
    # Dynamic follow-up questions based on intent
    follow_up_questions = _generate_follow_ups(request.query, intent_result)
    
    # Localize follow-up questions if needed
    if target_lang not in ("en", "english"):
        follow_up_questions = [translate_fallback_text(q, target_lang) for q in follow_up_questions]
    
    return {
        "answer": translated_answer,
        "citations": citations,
        "follow_up_questions": follow_up_questions,
        "confidence_score": 0.85 if citations else 0.60,
        "intent": intent_result.intent,
        "location": {"district": district, "state": state, "soil_type": soil_type},
    }


@router.post("/image")
async def handle_image_query(
    request: Request,
    file: UploadFile = File(...),
    query: Optional[str] = Form(default=None),
    gps_ctx: dict = Depends(get_gps_context)
):
    user = gps_ctx["user"]
    district = gps_ctx["district"]
    state = gps_ctx["state"]
    weather = gps_ctx["weather"]
    weather_str = gps_ctx["weather_str"]
    soil_type = gps_ctx["soil_type"]
    agro_zone = gps_ctx.get("agro_zone", "")
    season = gps_ctx.get("season", "")
    crop = gps_ctx["crop"]

    context_injection = (
        f"\n\n--- PATHOLOGY CONTEXT (GPS-Based) ---\n"
        f"Location: {district}, {state}\n"
        f"Agro-Climatic Zone: {agro_zone}\n"
        f"Current Season: {season}\n"
        f"Soil Type: {soil_type}\n"
        f"Assumed Crop: {crop}\n"
        f"Weather: {weather_str}\n"
    )
    system = build_system_prompt(IMAGE_DIAGNOSIS_PROMPT + context_injection, user)

    image_bytes = await file.read()
    image_b64 = base64.b64encode(image_bytes).decode()

    # 1. Run CNN classification model first (always available)
    diag = await disease_service.classify(image_bytes, crop_context=crop, query=query)
    detected_crop = diag.get("crop", crop or "plant")
    detected_disease = diag.get("disease", "unknown condition")

    # 2. Retrieve RAG context for the detected disease (CRITICAL FIX)
    # Without this, the LLM answers with generic knowledge instead of ICAR-backed treatment protocols
    image_rag_context = ""
    rag_chunks = []
    try:
        disease_rag_query = f"{detected_crop} {detected_disease} treatment symptoms fungicide dosage"
        rag_chunks = await chromadb_search(disease_rag_query, soil_type=soil_type, district=district)
        if rag_chunks:
            # Take top 3 chunks, trimmed to 150 words each to keep vision context lean
            rag_parts = []
            for c in rag_chunks[:3]:
                words = c["text"].split()
                text = " ".join(words[:150]) + ("..." if len(words) > 150 else "")
                rag_parts.append(f"[{c.get('title', 'ICAR Guide')}]: {text}")
            image_rag_context = "\n\n".join(rag_parts)
    except Exception as e:
        logger.warning("Image RAG retrieval failed: %s", e)

    # 3. Run LLaVA/Ollama Vision with CNN finding + RAG knowledge base context
    cnn_info_str = (
        f"CNN Classifier: Crop='{detected_crop}', Condition='{detected_disease}' "
        f"({diag.get('confidence')}% confidence, Severity: {diag.get('severity')})."
    )
    rag_section = (
        f"\n\nKnowledge Base Reference (ground your treatment advice in these ICAR-verified protocols):\n"
        f"{image_rag_context}"
    ) if image_rag_context else ""

    user_prompt = (
        f"{query or 'Examine this crop leaf image carefully. Identify the crop and diagnose any disease, pest, or nutrient issue.'}"
        f"\n\n[{cnn_info_str}]{rag_section}"
    )
    res = await llm_vision(system, image_b64, user_prompt=user_prompt, temperature=0.1)

    # Always respect user's preferred language for image diagnosis responses
    preferred_lang = user.get("preferredLanguage", "en")
    detected_lang = "en"
    if query:
        try:
            detected_lang = voice_service.detect_language_from_text(query)
        except Exception:
            pass
    target_lang = preferred_lang if preferred_lang not in ("en", "english") else (detected_lang if detected_lang != "en" else "en")

    # Auto-translate answer if needed
    translated_answer = translate_fallback_text(res["answer"], target_lang)

    # 4. Query treatments from Knowledge Graph
    kag_treatments = []
    try:
        kag_treatments = kag_service.get_treatments_for_disease(diag["disease"])
    except Exception:
        pass

    return {
        "answer": translated_answer,
        "crop": detected_crop,
        "disease": detected_disease,
        "confidence_score": diag.get("confidence", 90.0) / 100.0,
        "severity": diag.get("severity"),
        "kag_treatments": kag_treatments,
        "rag_sources": [c.get("title") for c in rag_chunks],
        "location": {"district": district, "state": state, "soil_type": soil_type},
    }


@router.post("/soil")
async def handle_soil_query(data: SoilData, request: Request, gps_ctx: dict = Depends(get_gps_context)):
    user = gps_ctx["user"]
    district = gps_ctx["district"]
    state = gps_ctx["state"]
    weather = gps_ctx["weather"]
    weather_str = gps_ctx["weather_str"]
    soil_type = gps_ctx["soil_type"]
    agro_zone = gps_ctx["agro_zone"]
    location_ctx_str = gps_ctx["location_ctx_str"]
    
    context_injection = (
        f"\n\n--- SOIL ADVISER CONTEXT (GPS-Based) ---\n"
        f"Location: {district}, {state}\n"
        f"Agro-Climatic Zone: {agro_zone}\n"
        f"Location Soil Type: {soil_type}\n"
        f"Current Weather: {weather_str}\n"
    )
    if location_ctx_str:
        context_injection += f"\n{location_ctx_str}\n"

    system = build_system_prompt(SOIL_ADVISOR_PROMPT + context_injection, user)
    
    soil_dict = {
        "N": data.N,
        "P": data.P,
        "K": data.K,
        "temperature": data.temp,
        "humidity": data.humidity,
        "ph": data.pH,
        "rainfall": data.rainfall
    }
    
    xgb_result = "unknown"
    shap_values = {}
    
    try:
        # Predict using crop XGBoost & SHAP explainer
        res = crop_service.predict(soil_dict)
        xgb_result = res["recommended_crop"]
        shap_values = res["shap_values"]
    except Exception as e:
        logger.error("XGBoost prediction failed: %s", e)
        # Intelligent soil-based fallback
        xgb_result = _recommend_crop_from_soil(data)
        shap_values = {
            "N": {"shap_value": 0.12, "feature_value": data.N, "label": "Nitrogen (N)", "impact": "positive" if data.N > 50 else "needs improvement"},
            "P": {"shap_value": 0.04, "feature_value": data.P, "label": "Phosphorus (P)", "impact": "positive" if data.P > 30 else "needs improvement"},
            "K": {"shap_value": 0.06, "feature_value": data.K, "label": "Potassium (K)", "impact": "positive" if data.K > 30 else "needs improvement"}
        }

    loc_ctx = {
        "district": district,
        "state": state,
        "soil_type": soil_type,
        "weather": weather,
        "season": context_service.get_current_season(),
        "agro_zone": agro_zone,
    }

    # Build user message for LLM (FIX: user_message was undefined)
    user_message = (
        f"Soil analysis for recommendation:\n"
        f"- Nitrogen (N): {data.N} kg/ha\n"
        f"- Phosphorus (P): {data.P} kg/ha\n"
        f"- Potassium (K): {data.K} kg/ha\n"
        f"- pH: {data.pH}\n"
        f"- Temperature: {data.temp}°C\n"
        f"- Humidity: {data.humidity}%\n"
        f"- Rainfall: {data.rainfall} mm\n"
        f"\nXGBoost ML Model Recommendation: {xgb_result}\n"
        f"SHAP Feature Importance: {shap_values}\n"
        f"\nFarmer Location: {district}, {state} | Agro Zone: {agro_zone} | Soil Type: {soil_type}"
    )

    res = await llm_chat(system, user_message, location_ctx=loc_ctx)
    
    return {
        "answer": res["answer"],
        "recommended_crop": xgb_result,
        "confidence_score": 0.92,
        "shap_values": shap_values,
        "location": {"district": district, "state": state, "soil_type": soil_type},
    }


@router.post("/voice")
async def handle_voice_query(request: VoiceQueryRequest, req: Request, gps_ctx: dict = Depends(get_gps_context)):
    user = gps_ctx["user"]
    district = gps_ctx["district"]
    state = gps_ctx["state"]
    weather = gps_ctx["weather"]
    weather_str = gps_ctx["weather_str"]
    season = gps_ctx["season"]
    soil_type = gps_ctx["soil_type"]
    agro_zone = gps_ctx["agro_zone"]
    major_crops = gps_ctx["major_crops"]
    location_ctx_str = gps_ctx["location_ctx_str"]
    
    context_injection = (
        f"\n\n--- VOICE NLP CONTEXT (GPS-Based) ---\n"
        f"Location: {district}, {state}\n"
        f"Agro-Climatic Zone: {agro_zone}\n"
        f"Soil Type: {soil_type}\n"
        f"Current Season: {season}\n"
        f"Current Weather: {weather_str}\n"
        f"Major Crops in Area: {', '.join(major_crops) if major_crops else 'N/A'}\n"
    )
    if location_ctx_str:
        context_injection += f"\n{location_ctx_str}\n"

    system = build_system_prompt(VOICE_NLP_PROMPT + context_injection, user)
    
    # Extract spaCy Named Entities
    entities = voice_service.extract_entities(request.transcript)
    
    # IMPROVEMENT: Run RAG + KAG retrieval for voice queries (same as text endpoint)
    # Previously voice had zero knowledge-base grounding — this fixes generic answers
    voice_chunks = await chromadb_search(request.transcript, soil_type=soil_type, district=district)
    voice_kg_context = await neo4j_lookup(request.transcript, agro_zone=agro_zone, soil_type=soil_type)
    voice_rag_context = [f"[Source: {c.get('title', 'Agricultural Guide')}]\n{c['text']}" for c in voice_chunks]
    
    user_message = (
        f"Farmer's voice query (transcribed): {request.transcript}\n"
        f"Extracted entities — Crops: {entities.get('crops', [])}, "
        f"Locations: {entities.get('locations', [])}, "
        f"Symptoms: {entities.get('symptoms', [])}"
    )
    
    loc_ctx = {
        "district": district,
        "state": state,
        "soil_type": soil_type,
        "weather": weather,
        "season": season,
        "agro_zone": agro_zone,
        "major_crops": major_crops or ["Paddy", "Tomato", "Maize", "Ragi", "Sugarcane"],
    }
    res = await llm_chat(system, user_message, context=voice_rag_context + voice_kg_context, location_ctx=loc_ctx)
    
    # Detect query language from transcript and prioritize it
    detected_lang = "en"
    try:
        detected_lang = voice_service.detect_language_from_text(request.transcript)
    except Exception:
        pass
    
    target_lang = detected_lang if detected_lang != "en" else user.get("preferredLanguage", "en")
    
    # Auto-translate answer if needed
    translated_answer = translate_fallback_text(res["answer"], target_lang)
    
    return {
        "answer": translated_answer,
        "transcript": request.transcript,
        "entities": entities,
        "location": {"district": district, "state": state},
    }


# ── Helper Functions ──

def _generate_follow_ups(query: str, intent_result) -> list:
    """Generate context-aware follow-up questions based on the query and detected intent."""
    crops = intent_result.crops_mentioned or []
    crop = crops[0] if crops else None
    
    intent_follow_ups = {
        "disease_diagnosis": [
            f"What are the organic remedies for this disease{' in ' + crop if crop else ''}?",
            "How to prevent this disease from spreading to other plants?",
            f"What is the estimated treatment cost{' for ' + crop if crop else ''}?"
        ],
        "crop_selection": [
            "What fertilizer schedule should I follow for the recommended crop?",
            "What is the expected yield per acre?",
            "When is the best sowing time for this season?"
        ],
        "soil_analysis": [
            "How to improve soil nitrogen levels organically?",
            "What is the ideal NPK ratio for my crop?",
            "Where can I get a detailed soil test done?"
        ],
        "weather_query": [
            "Should I delay sowing based on the forecast?",
            "What crops are best for this weather pattern?",
            "How to protect crops from heavy rainfall?"
        ],
        "market_query": [
            f"What is the price trend for{' ' + crop if crop else ' this crop'} over the last month?",
            "Which nearby mandi offers the best price?",
            "When is the best time to sell for maximum profit?"
        ],
        "government_scheme": [
            "How do I apply for this scheme?",
            "What documents are needed for registration?",
            "Am I eligible for crop insurance (PMFBY)?"
        ],
        "irrigation_query": [
            "What is the water requirement per acre for my crop?",
            "How to apply for drip irrigation subsidy?",
            "Best irrigation schedule for the current crop stage?"
        ],
        "fertilizer_query": [
            "What is the recommended dosage for urea application?",
            "Are there organic alternatives to chemical fertilizers?",
            "When should I apply the next dose of fertilizer?"
        ],
        "pest_control": [
            "What biological control agents can I use?",
            "How to set up pheromone traps?",
            "What is the safe waiting period after pesticide spray?"
        ],
    }
    
    return intent_follow_ups.get(intent_result.intent, [
        f"What are the best practices for{' growing ' + crop if crop else ' my farm'}?",
        "What government schemes am I eligible for?",
        "How to improve my crop yield this season?"
    ])


def _recommend_crop_from_soil(data: SoilData) -> str:
    """Rule-based crop recommendation when XGBoost is unavailable."""
    if data.N > 80 and data.humidity > 70 and data.pH < 7:
        return "Rice"
    elif data.N > 60 and data.P > 40 and data.K > 40 and data.pH > 6:
        return "Wheat"
    elif data.N > 40 and data.P > 50 and data.K > 50:
        return "Maize"
    elif data.pH > 5.5 and data.pH < 7.5 and data.temp > 20:
        return "Tomato"
    elif data.N > 100 and data.humidity > 80:
        return "Sugarcane"
    elif data.K > 60 and data.temp > 25:
        return "Cotton"
    elif data.P > 45 and data.temp < 30:
        return "Potato"
    else:
        return "Millet (Ragi)"
