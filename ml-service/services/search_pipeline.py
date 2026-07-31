import asyncio
from typing import Any, Optional
import os
import re
import logging
import json
import joblib
from pathlib import Path
import ollama
from services.intent_service import intent_service
from services.rag_service import rag_service
from services.search_service import search_service, SearchResult
from services.context_service import context_service

logger = logging.getLogger("krishimitraai.search_pipeline")

class SearchPipeline:
    def __init__(self):
        # Optional: Load fine-tuned intent classifier if exists
        model_path = Path("models/intent_classifier.pkl")
        if model_path.exists():
            try:
                self.intent_classifier = joblib.load(str(model_path))
                logger.info("✅ Loaded intent classifier model from pkl")
            except Exception as e:
                logger.warning("Failed to load intent classifier from pkl, using rule-based/LLM fallback: %s", e)
                self.intent_classifier = None
        else:
            self.intent_classifier = None

    async def classify_intent(self, query: str) -> str:
        """Classifies the user's intent into disease_query | market_query | etc."""
        if self.intent_classifier:
            try:
                # Mock classification using the model
                pred = self.intent_classifier.predict([query])[0]
                return pred
            except Exception:
                pass
        
        # Rule-based/LLM classification fallback
        res = await intent_service.classify_with_llm(query)
        intent_map = {
            "disease_diagnosis": "disease_query",
            "market_query": "market_query",
            "government_scheme": "scheme_query",
            "crop_selection": "crop_query",
            "soil_analysis": "agronomy_query",
            "weather_query": "weather_query",
            "fertilizer_query": "agronomy_query",
            "irrigation_query": "agronomy_query",
            "pest_control": "disease_query"
        }
        return intent_map.get(res.intent, "general_agri")

    def inject_context(self, query: str, context: dict, intent: str) -> str:
        """Enriches the user query with farmer context (district, crops, seasons, soil, irrigation)."""
        phases_str = ", ".join([f"{cp['crop']} ({cp['phase']})" for cp in context.get("crop_phases", [])])
        district = context.get('district', '')
        state = context.get('state', '')
        location_str = f"{district}, {state}".strip(", ") if district or state else "local region"
        context_str = (
            f"[Context: {context.get('season', 'Kharif')} season, "
            f"location {location_str}, "
            f"soil {context.get('soil_type', 'Sandy Loam')}, "
            f"irrigation {context.get('irrigation_type', 'Rainfed')}, "
            f"land {context.get('land_acres', 2.0)} acres, "
            f"crop phases: {phases_str}, "
            f"weather: {context.get('weather', {}).get('temperature', 28.0)}C]"
        )
        return f"{query} {context_str}"

    def route_sources(self, intent: str) -> list:
        """Route relevant sources to query based on intent."""
        if intent == "disease_query":
            return ["chromadb_rag", "neo4j_kag", "krishi_search_web"]
        elif intent == "market_query":
            return ["chromadb_rag", "agmarknet", "krishi_search_web"]
        elif intent == "scheme_query":
            return ["chromadb_rag", "schemes_db", "krishi_search_web"]
        elif intent == "agronomy_query":
            return ["chromadb_rag", "neo4j_kag"]
        else:
            return ["chromadb_rag", "krishi_search_web"]

    async def query_source(self, source: str, enriched_query: str, online: bool = True) -> list:
        """Query individual source and return list of SearchResult objects."""
        clean_query = re.sub(r'\[Context:.*?\]', '', enriched_query).strip()
        try:
            if source == "chromadb_rag":
                chunks = rag_service.retrieve(clean_query, top_k=3)
                return [
                    SearchResult(
                        url="",
                        title=c.get("title", "Local RAG Chunk"),
                        excerpt=c.get("excerpt", c.get("text", ""))[:400],
                        full_text=c.get("text", ""),
                        source="Local KB",
                        score=c.get("score", 0.5),
                        favicon="📚"
                    ) for c in chunks
                ]
            elif source == "neo4j_kag":
                try:
                    from services.kag_service import kag_service
                    # Extract crops mentioned
                    KNOWN_CROPS = ["tomato", "rice", "wheat", "maize", "potato"]
                    words = set(re.findall(r'\b\w+\b', clean_query.lower()))
                    mentioned = [c for c in KNOWN_CROPS if c in words]
                    if mentioned:
                        profile = kag_service.get_full_crop_profile(mentioned[0].title())
                        if profile and profile.get("crop"):
                            desc = f"Knowledge Graph for {mentioned[0].title()}. Growing soils: {', '.join(profile['crop'].get('soils', []))}. Diseases: {', '.join([d['disease'] for d in profile.get('diseases', [])])}."
                            return [SearchResult(
                                url="",
                                title=f"Neo4j Knowledge Graph: {mentioned[0].title()}",
                                excerpt=desc,
                                full_text=desc,
                                source="Neo4j KG",
                                score=0.9,
                                favicon="🕸️"
                            )]
                except Exception:
                    pass
                return []
            elif source == "krishi_search_web":
                if not online:
                    return []
                try:
                    web_res = await search_service.search(clean_query, max_results=3)
                    return web_res
                except Exception:
                    return []
            elif source == "agmarknet":
                # Simulated agmarknet search result - dynamic based on crop
                KNOWN_CROPS = ["tomato", "rice", "wheat", "maize", "potato", "cotton", "onion", "soybean", "groundnut"]
                words = set(re.findall(r'\b\w+\b', clean_query.lower()))
                mentioned = [c for c in KNOWN_CROPS if c in words]
                crop_name = mentioned[0].title() if mentioned else "Maize"
                
                prices = {
                    "Tomato": "₹1,850/quintal",
                    "Rice": "₹2,100/quintal",
                    "Wheat": "₹2,050/quintal",
                    "Maize": "₹1,650/quintal",
                    "Potato": "₹1,450/quintal",
                    "Cotton": "₹7,200/quintal",
                    "Onion": "₹1,500/quintal",
                    "Soybean": "₹4,200/quintal",
                    "Groundnut": "₹5,500/quintal"
                }
                price_str = prices.get(crop_name, "₹1,650/quintal")
                district_label = re.search(r'location\s+([\w\s]+?)(?:,|\])', clean_query)
                mandi_location = district_label.group(1).strip() if district_label else "Nearest"
                excerpt = f"AgMarkNet Modal price for {crop_name}: {price_str} at {mandi_location} APMC yard. Check agmarknet.gov.in for live prices."
                return [SearchResult(
                    url="https://agmarknet.gov.in",
                    title=f"AgMarkNet Mandi Price: {crop_name}",
                    excerpt=excerpt,
                    full_text=excerpt,
                    source="AgMarkNet",
                    score=0.95,
                    favicon="📈"
                )]
            elif source == "schemes_db":
                # Schemes service semantic query
                try:
                    from services.scheme_service import find_schemes
                    schemes = await find_schemes(clean_query, {})
                    return [SearchResult(
                        url=s.get("apply_url", "https://india.gov.in"),
                        title=s.get("name", "Government Scheme"),
                        excerpt=s.get("description", "") + f" | Benefit: {s.get('benefit', '')}",
                        full_text=s.get("description", "") + f" | Eligibility: {json.dumps(s.get('eligibility', {}))}",
                        source="Govt Schemes",
                        score=0.9 - 0.05 * i,
                        favicon="🏛️"
                    ) for i, s in enumerate(schemes[:2])]
                except Exception:
                    pass
                return []
        except Exception as e:
            logger.error("Error querying source %s: %s", source, e)
        return []

    # Source authority configuration with tiered badges
    SOURCE_AUTHORITY = {
        "ICAR":           {"score": 1.0,  "badge": "🏛️ ICAR",      "tier": "gold"},
        "Local KB":       {"score": 0.95, "badge": "📚 Local KB",   "tier": "gold"},
        "NIPHM":          {"score": 0.95, "badge": "🏛️ NIPHM",     "tier": "gold"},
        "AgMarkNet":      {"score": 0.90, "badge": "📈 AgMarkNet",  "tier": "silver"},
        "Govt Schemes":   {"score": 0.90, "badge": "🏛️ Govt",      "tier": "silver"},
        "Neo4j KG":       {"score": 0.88, "badge": "🕸️ Knowledge Graph", "tier": "silver"},
        "KVK":            {"score": 0.85, "badge": "🎓 KVK",       "tier": "silver"},
        "APMC":           {"score": 0.85, "badge": "📊 APMC",      "tier": "silver"},
        "Research Paper": {"score": 0.80, "badge": "📄 Research",   "tier": "bronze"},
        "Vikaspedia":     {"score": 0.78, "badge": "📖 Vikaspedia", "tier": "bronze"},
        "Organic Farming Association": {"score": 0.75, "badge": "🌿 Organic", "tier": "bronze"},
        "Web":            {"score": 0.65, "badge": "🌐 Web",       "tier": "basic"},
    }

    def get_source_authority(self, source: str) -> dict:
        """Return full authority info including score, badge, and tier."""
        # Exact match
        if source in self.SOURCE_AUTHORITY:
            return self.SOURCE_AUTHORITY[source]
        # Fuzzy match
        source_lower = source.lower()
        for key, val in self.SOURCE_AUTHORITY.items():
            if key.lower() in source_lower or source_lower in key.lower():
                return val
        return {"score": 0.65, "badge": f"🌐 {source}", "tier": "basic"}

    def fuse_and_rerank(self, results_groups: list) -> list:
        """Flattens, scores, and reranks results from all sources."""
        flat_results = [r for group in results_groups for r in group if r]
        # Remove duplicate URLs or identical titles
        seen_titles = set()
        unique_results = []
        for r in flat_results:
            title_norm = r.title.lower().strip()
            if title_norm not in seen_titles:
                seen_titles.add(title_norm)
                unique_results.append(r)

        scored = []
        for r in unique_results:
            authority_info = self.get_source_authority(r.source)
            authority_score = authority_info["score"]
            # score = (semantic_similarity * 0.5) + (source_authority * 0.3) + (recency_score * 0.2)
            sim = r.score if r.score > 0 else 0.7
            score = (sim * 0.5) + (authority_score * 0.3) + (1.0 * 0.2)
            r.score = score
            # Attach authority metadata
            r.authority_badge = authority_info["badge"]
            r.authority_tier = authority_info["tier"]
            r.authority_score = authority_score
            scored.append(r)

        return sorted(scored, key=lambda x: x.score, reverse=True)

    def compute_confidence(self, fused_sources: list) -> float:
        """Compute aggregate confidence from top-3 source authority × relevance."""
        if not fused_sources:
            return 0.45
        top = fused_sources[:3]
        total = sum(s.score for s in top) / len(top)
        return round(min(0.98, total), 2)

    def compute_source_breakdown(self, sources_used: list, fused_sources: list) -> dict:
        """Compute percentage contribution of RAG/KAG/Web."""
        counts = {"rag": 0, "kag": 0, "web": 0}
        for s in fused_sources:
            src = (s.source or "").lower()
            if "kg" in src or "neo4j" in src or "graph" in src:
                counts["kag"] += 1
            elif "web" in src or "krishi_search" in src:
                counts["web"] += 1
            else:
                counts["rag"] += 1
        total = max(sum(counts.values()), 1)
        return {
            "rag": round(counts["rag"] / total * 100),
            "kag": round(counts["kag"] / total * 100),
            "web": round(counts["web"] / total * 100),
        }

    async def generate_cited_answer(
        self,
        query: str,
        fused_sources: list,
        intent: str,
        farmer_context: dict,
        thread_context: Optional[list] = None,
        image_context: Optional[dict] = None,
        language: str = "en"
    ) -> Any:
        sources_text = "\n".join([f"[{i}] Source: {s.source} | Title: {s.title}\n{s.excerpt}" for i, s in enumerate(fused_sources, 1)])

        LANG_MAP = {
            "kn": "Kannada", "hi": "Hindi", "ta": "Tamil",
            "te": "Telugu",  "mr": "Marathi", "en": "English",
            "pa": "Punjabi", "bn": "Bengali"
        }
        lang_name = LANG_MAP.get(language, "English")

        farmer_location = f"{farmer_context.get('district', '')} {farmer_context.get('state', '')}".strip()
        farmer_location = farmer_location if farmer_location else "your local area"
        system_prompt = (
            "You are KrishiMitraAI, the cited agricultural answer engine.\n"
            f"You are answering for a farmer named {farmer_context.get('name', 'Farmer')} "
            f"from {farmer_location} "
            f"growing {', '.join(farmer_context.get('registered_crops', ['paddy']))} "
            f"on {farmer_context.get('soil_type', 'loamy')} soil "
            f"with {farmer_context.get('irrigation_type', 'Rainfed')} irrigation "
            f"({farmer_context.get('land_acres', 2.0)} acres). "
            f"Season: {farmer_context.get('season', 'Kharif')}.\n"
            "Generate a highly practical response grounded ONLY in the provided sources.\n"
            "Use inline citations like [1] or [2] immediately following factual claims.\n"
            "Tailor your advice specifically to this farmer's location, soil, and crops.\n"
            f"Respond in {lang_name}.\n"
            "Provide exactly 3 practical follow-up questions at the end in this format:\n"
            "FOLLOW_UPS: [\"Follow-up Q1\", \"Follow-up Q2\", \"Follow-up Q3\"]"
        )
        
        user_prompt = f"Sources:\n{sources_text}\n\nQuery: {query}\n\nGenerate the cited answer and follow-up questions:"
        
        offline_fallback_used = False
        if image_context:
            disease = image_context.get("disease", "")
            confidence = image_context.get("confidence", 0.0)
            conf_pct = confidence if confidence > 1.0 else confidence * 100
            severity = image_context.get("severity", "")
            img_info = f"\n[Image Scan Context: Detected crop disease: {disease} (Confidence: {conf_pct:.1f}%, Severity: {severity})]"
            user_prompt = img_info + "\n" + user_prompt

        messages = [{"role": "system", "content": system_prompt}]
        if thread_context:
            for msg in thread_context:
                role = msg.get("role", "user")
                # Normalize assistant/bot roles to assistant
                if role in ("bot", "assistant"):
                    role = "assistant"
                else:
                    role = "user"
                messages.append({"role": role, "content": msg.get("content", "")})
        messages.append({"role": "user", "content": user_prompt})

        # 1. Detect available models
        model = os.getenv("OLLAMA_MODEL", "llama3.1:8b")
        models = []
        try:
            from ollama import AsyncClient
            client = AsyncClient()
            models_res = await client.list()
            models = [m['name'] for m in models_res.get('models', [])]
        except Exception as e:
            logger.debug("Ollama AsyncClient.list failed: %s", e)
            try:
                models_res = ollama.list()
                models = [m['name'] for m in models_res.get('models', [])]
            except Exception as e2:
                logger.debug("ollama.list failed: %s", e2)

        # 2. Select model or fallback
        try:
            if not models:
                raise RuntimeError("No models found in Ollama or Ollama is not running.")

            selected_model = None
            if model in models:
                selected_model = model
            elif f"{model}:latest" in models:
                selected_model = f"{model}:latest"
            else:
                for m in models:
                    if model in m or m in model:
                        selected_model = m
                        break
            if not selected_model:
                selected_model = models[0]
                logger.info("Ollama model '%s' not found. Falling back to: %s", model, selected_model)
            else:
                logger.info("Using Ollama model: %s", selected_model)

            try:
                from ollama import AsyncClient
                client = AsyncClient()
                res = await client.chat(
                    model=selected_model,
                    messages=messages
                )
            except Exception:
                def run_sync_chat():
                    return ollama.chat(
                        model=selected_model,
                        messages=messages
                    )
                res = await asyncio.to_thread(run_sync_chat)
            content = res["message"]["content"]
        except Exception as e:
            logger.error("Ollama chat failed, using structured document-based fallback: %s", e)
            offline_fallback_used = True
            from utils.fallback_formatter import format_offline_fallback
            clean_q = re.sub(r'\[Context:.*?\]', '', query).strip()
            content = format_offline_fallback(clean_q, fused_sources or [], target_lang=language)

        # Parse follow ups
        follow_ups = ["How to improve soil quality?", "What are organic treatments?", "Expected weather this week?"]
        follow_up_match = re.search(r'FOLLOW_UPS:\s*(.*)', content, re.DOTALL)
        if follow_up_match:
            try:
                follow_ups = json.loads(follow_up_match.group(1).strip())
                content = content.split("FOLLOW_UPS:")[0].strip()
            except Exception:
                pass
        else:
            if fused_sources:
                top_title = fused_sources[0].title
                follow_ups = [
                    f"What is the recommended treatment for {top_title}?",
                    "What are the organic or prevention remedies?",
                    "Estimate the cost and implementation for this."
                ]

        # Parse citations out to matching fused sources
        citations = []
        for i, s in enumerate(fused_sources, 1):
            if f"[{i}]" in content:
                auth_info = self.get_source_authority(s.source)
                citations.append({
                    "index": i,
                    "source": s.source,
                    "title": s.title,
                    "url": s.url or "#",
                    "snippet": s.excerpt,
                    "authority_badge": auth_info["badge"],
                    "authority_tier": auth_info["tier"],
                    "relevance_score": round(s.score, 2) if hasattr(s, 'score') else 0.7,
                })

        return type("Answer", (), {
            "text": content,
            "citations": citations,
            "follow_ups": follow_ups,
            "language": language,
            "offline_fallback_used": offline_fallback_used,
        })

    async def run(self, query: str, farmer_context: dict, thread_context: Optional[list] = None, image_context: Optional[dict] = None, language: str = "en", online: bool = True) -> dict:
        # Detect language fallback for text queries
        if language == "en" or not language:
            try:
                from services.voice_service import voice_service
                detected_lang = voice_service.detect_language_from_text(query)
                if detected_lang != "en":
                    language = detected_lang
            except Exception:
                pass

        intent = await self.classify_intent(query)
        enriched_query = self.inject_context(query, farmer_context, intent)
        sources_to_query = self.route_sources(intent)
        
        results = await asyncio.gather(*[self.query_source(s, enriched_query, online) for s in sources_to_query])
        fused = self.fuse_and_rerank(results)
        confidence = self.compute_confidence(fused)
        breakdown = self.compute_source_breakdown(sources_to_query, fused)

        answer: Any = await self.generate_cited_answer(
            enriched_query,
            fused,
            intent,
            farmer_context=farmer_context,
            thread_context=thread_context,
            image_context=image_context,
            language=language or farmer_context.get("language", "en"),
        )
        
        return {
            "answer": answer.text,
            "citations": answer.citations,
            "follow_up_questions": answer.follow_ups,
            "intent": intent,
            "sources_used": sources_to_query,
            "offline_fallback_used": getattr(answer, "offline_fallback_used", False),
            "confidence_score": confidence,
            "source_breakdown": breakdown,
            "detected_language": language or farmer_context.get("language", "en"),
            "answer_language": answer.language,
        }

search_pipeline = SearchPipeline()
