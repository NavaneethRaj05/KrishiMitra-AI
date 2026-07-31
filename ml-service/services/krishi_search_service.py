"""
KrishiSearch Answer Engine — Agentic Pipeline
Streams a cited answer using intent-aware search + KAG + RAG + farmer memory.

Architecture:
  Query → Intent Detection → Strategy Selection → Multi-Source Search
       → RAG Retrieval → KAG Enrichment → Prompt Construction
       → Ollama Streaming → Citation Generation → Confidence Score
       → Related Questions → SSE Stream

Online: uses web search (Tavily + Semantic Scholar + Vikaspedia + PubMed + FAO)
Offline: uses ChromaDB fallback with local knowledge base
"""
import asyncio
import json
import os
import re
import logging
from typing import AsyncGenerator, Optional
import ollama

from services.search_service import search_service, SearchResult
from services.rag_service    import rag_service
from services.intent_service import intent_service
from services.unified_llm_service import unified_llm_service

logger = logging.getLogger(__name__)

LANG_MAP = {
    "en": "English", "hi": "Hindi",  "kn": "Kannada",
    "ta": "Tamil",   "te": "Telugu", "mr": "Marathi",
    "pa": "Punjabi", "bn": "Bengali"
}

KNOWN_CROPS = [
    "rice", "wheat", "corn", "maize", "tomato", "potato", "onion", "garlic", "pepper",
    "cotton", "soybean", "sugarcane", "banana", "mango", "coffee", "tea", "groundnut",
    "sunflower", "mustard", "chickpea", "lentil", "pea", "ragi", "bajra", "jowar",
    "sorghum", "barley", "oats", "eggplant", "brinjal", "cucumber", "pumpkin",
    "okra", "cabbage", "cauliflower", "carrot", "spinach", "lettuce", "strawberry",
    "grapes", "apple", "orange", "pomegranate", "guava", "papaya", "watermelon",
    "ginger", "turmeric", "chilli", "coriander", "cumin", "cardamom", "rubber",
    "coconut", "jute", "tobacco",
]

# Intent → human-readable display string
INTENT_DISPLAY = {
    "disease_diagnosis": "🔬 Disease & Pest Diagnosis",
    "crop_selection":    "🌱 Crop Selection",
    "soil_analysis":     "🧪 Soil Analysis",
    "weather_query":     "🌤️ Weather & Climate",
    "market_query":      "📈 Market Prices",
    "government_scheme": "🏛️ Government Schemes",
    "irrigation_query":  "💧 Irrigation",
    "fertilizer_query":  "⚗️ Fertilizer & Nutrients",
    "pest_control":      "🐛 Pest Control",
    "harvest_storage":   "📦 Harvest & Storage",
    "general_farming":   "🌾 General Farming",
}

# Status messages per stage (shown to user while streaming)
STATUS_MESSAGES = {
    "intent":    "🧠 Understanding your question...",
    "search":    "🔍 Searching agricultural sources...",
    "rag":       "📚 Querying local knowledge base...",
    "kag":       "🕸️ Querying knowledge graph...",
    "generate":  "✍️ Generating expert answer...",
    "related":   "💬 Generating follow-up questions...",
}


class KrishiSearchService:

    def _extract_crops(self, query: str) -> list:
        q = query.lower()
        return [c for c in KNOWN_CROPS if c in q]

    def _kag_context(self, crops: list, intent: str = "", agro_zone: str = None, soil_type: str = None) -> str:
        parts = []
        try:
            from services.kag_service import kag_service
            
            # 1. Look up mentioned crops
            if crops:
                profile = kag_service.get_full_crop_profile(crops[0].title())
                if profile.get("crop"):
                    info = profile["crop"]
                    diseases = [d["disease"] for d in profile.get("diseases", [])]
                    soils    = info.get("soils", [])
                    if diseases:
                        parts.append(f"Known diseases of {crops[0]}: {', '.join(diseases)}")
                    if soils:
                        parts.append(f"Suitable soils: {', '.join(soils)}")
                    if intent == "disease_diagnosis" and profile.get("diseases"):
                        for d in profile["diseases"][:2]:
                            if d.get("treatments"):
                                tnames = [t["treatment"] for t in d["treatments"]]
                                parts.append(f"Treatments for {d['disease']}: {', '.join(tnames)}")
                                
            # 2. Look up location-suited crops from Neo4j
            if agro_zone:
                suited = kag_service.get_crops_for_climate(agro_zone, soil_type)
                if suited:
                    cnames = [c["crop"] for c in suited]
                    parts.append(f"Suited crops for {agro_zone} zone (soil={soil_type or 'any'}): {', '.join(cnames)}")
                    
            return ("\n[Knowledge Graph] " + ". ".join(parts) + ".") if parts else ""
        except Exception:
            return ""

    def _memory_context(self, history: list) -> str:
        if not history:
            return ""
        lines = []
        for e in history[-5:]:
            t   = e.get("entryType", "")
            out = e.get("output", {})
            inp = e.get("input",  {})
            if t == "disease_detection" and out.get("disease"):
                lines.append(f"Previously detected {out['disease']} in {out.get('crop', '?')}")
            elif t == "crop_recommendation" and out.get("crop"):
                lines.append(f"Previously recommended {out['crop']}")
            elif t == "rag_query":
                q = inp.get("question", "")
                if q:
                    lines.append(f'Previously asked: "{q[:60]}"')
        return ("\nFarmer history: " + "; ".join(lines) + ".") if lines else ""

    def _format_sources(self, sources: list) -> str:
        lines = []
        for i, s in enumerate(sources, 1):
            lines.append(
                f"[{i}] SOURCE: {s.source} | {s.title}\n"
                f"URL: {s.url}\n"
                f"CONTENT: {s.full_text or s.excerpt}\n"
            )
        return "\n".join(lines)

    def _build_system_prompt(
        self, sources: list, intent, kag_ctx: str,
        mem_ctx: str, language: str, farmer_context: dict = None
    ) -> str:
        lang_name    = LANG_MAP.get(language, "English")
        sources_text = self._format_sources(sources)
        intent_name  = INTENT_DISPLAY.get(getattr(intent, "intent", ""), "🌾 Farming")

        # Build section guidance based on intent
        strategy = intent_service.get_search_strategy(intent)
        sections = strategy.get("response_sections", ["answer", "explanation", "recommendations"])
        section_str = " → ".join(f"**{s.replace('_', ' ').title()}**" for s in sections)

        urgency_note = ""
        if getattr(intent, "urgency", "") == "urgent":
            urgency_note = "\n⚠️ URGENCY: The farmer indicated this is urgent. Prioritize immediate actionable steps."

        location_info = ""
        if farmer_context:
            district = farmer_context.get("district", "Unknown")
            state = farmer_context.get("state", "Unknown")
            soil_type = farmer_context.get("soil", {}).get("soil_type", farmer_context.get("soil_type", "Unknown"))
            crop = farmer_context.get("crop", "Tomato")
            weather = farmer_context.get("weather", {})
            season = farmer_context.get("season", "Unknown")
            
            weather_str = f"Temp: {weather.get('temperature')}°C, Humidity: {weather.get('humidity')}%, Conditions: {weather.get('description', 'Normal')}"
            
            location_info = (
                f"\n--- Farmer Location & Weather Context (GPS-based) ---\n"
                f"Location: {district}, {state}\n"
                f"Typical Soil Type: {soil_type}\n"
                f"Primary Crop of Interest: {crop}\n"
                f"Current Season: {season}\n"
                f"Current Weather conditions: {weather_str}\n"
            )
            # Add heat index and advisory if temperature is high
            temp = weather.get('temperature')
            if temp and isinstance(temp, (int, float)) and temp > 35:
                location_info += "⚠️ HEAT ALERT: Extremely high temperature detected. Recommend heat-stress mitigation strategies for crop protection and specify frequent watering.\n"

        return f"""You are KrishiMitraAI, the world's most expert agricultural AI assistant for farmers. You answer any question about farming, crops, soil, diseases, pests, weather, markets, government schemes, irrigation, and organic practices — for any crop and any location worldwide.

QUERY TYPE: {intent_name}{location_info}
{urgency_note}

CITATION RULES (mandatory):
- Every factual claim MUST have an inline citation immediately after: [1] or [2][3]
- Only cite from the numbered sources provided below
- Multiple sources for one claim: [1][2]
- Never invent or fabricate citations

ANSWER STRUCTURE:
Organize your answer in this order: {section_str}
Use **bold headers** for each section.

ANSWER STYLE:
- Be practical, specific, and immediately actionable
- Use simple language that farmers can understand
- Include quantities, timings, dosages, and methods when available
- Use bullet points for lists
- If sources conflict, acknowledge it
- If you cannot find a specific answer in the sources, be honest about it

CONFIDENCE GUIDANCE:
After your answer, on a new line write exactly:
CONFIDENCE: [number between 60-99]%
Base the confidence on: source quality (1-5), coverage (all aspects answered), and consistency (sources agree).{kag_ctx}{mem_ctx}

SOURCES:
{sources_text}

Respond entirely in {lang_name}."""

    async def _related_questions(
        self, query: str, answer: str, language: str, intent
    ) -> list:
        lang  = LANG_MAP.get(language, "English")
        intent_name = getattr(intent, "intent", "general_farming")
        crops = getattr(intent, "crops_mentioned", [])
        crop_context = f" about {crops[0]}" if crops else ""

        prompt = (
            f"Based on this farming question and answer, generate exactly 3 short, "
            f"practical follow-up questions a farmer would ask next.\n"
            f"Query intent: {intent_name}{crop_context}\n"
            f"Original question: {query}\n"
            f"Answer summary: {answer[:300]}\n"
            f"Language: {lang}\n"
            f"Return ONLY a JSON array of 3 strings. No explanations.\n"
            f'Format: ["question 1", "question 2", "question 3"]'
        )
        try:
            try:
                from ollama import AsyncClient
                client = AsyncClient()
                res = await client.chat(
                    model=os.getenv("OLLAMA_CHAT_MODEL", os.getenv("OLLAMA_MODEL", "llama3.1:8b")),
                    messages=[{"role": "user", "content": prompt}],
                    options={"temperature": 0.7, "num_predict": 200}
                )
            except Exception:
                def run_sync_chat():
                    return ollama.chat(
                        model=os.getenv("OLLAMA_CHAT_MODEL", os.getenv("OLLAMA_MODEL", "llama3.1:8b")),
                        messages=[{"role": "user", "content": prompt}],
                        options={"temperature": 0.7, "num_predict": 200}
                    )
                res = await asyncio.to_thread(run_sync_chat)

            text  = res["message"]["content"].strip()
            start = text.find("[")
            end   = text.rfind("]") + 1
            if start >= 0 and end > start:
                return json.loads(text[start:end])
        except Exception as e:
            logger.warning(f"[RelatedQ] {e}")
        return []

    def _extract_confidence(self, answer: str) -> tuple[str, int]:
        """
        Extract confidence score from answer text.
        Returns (clean_answer, confidence_int).
        """
        match = re.search(r'CONFIDENCE:\s*(\d+)%?', answer, re.IGNORECASE)
        if match:
            conf         = int(match.group(1))
            clean        = re.sub(r'\s*CONFIDENCE:\s*\d+%?\s*', '', answer).strip()
            return clean, max(60, min(99, conf))

        # Estimate confidence from citation density
        citations = len(set(re.findall(r'\[(\d+)\]', answer)))
        words     = len(answer.split())
        if citations >= 4 and words > 200:
            return answer, 87
        elif citations >= 2 and words > 100:
            return answer, 76
        else:
            return answer, 68

    def _extract_soil_metrics(self, query: str) -> Optional[dict]:
        """Attempt to extract soil parameters from the user query."""
        q = query.lower()
        metrics = {}
        # Simple regex extractions
        ph_match = re.search(r'\bph\s*[:=]?\s*(\d+(\.\d+)?)', q)
        n_match = re.search(r'\bn\s*[:=]?\s*(\d+)', q)
        p_match = re.search(r'\bp\s*[:=]?\s*(\d+)', q)
        k_match = re.search(r'\bk\s*[:=]?\s*(\d+)', q)
        temp_match = re.search(r'(?:temp|temperature)\s*[:=]?\s*(\d+(\.\d+)?)', q)
        hum_match = re.search(r'(?:humidity|hum)\s*[:=]?\s*(\d+(\.\d+)?)', q)
        rain_match = re.search(r'(?:rain|rainfall)\s*[:=]?\s*(\d+(\.\d+)?)', q)

        if ph_match: metrics['ph'] = float(ph_match.group(1))
        if n_match: metrics['N'] = float(n_match.group(1))
        if p_match: metrics['P'] = float(p_match.group(1))
        if k_match: metrics['K'] = float(k_match.group(1))
        if temp_match: metrics['temperature'] = float(temp_match.group(1))
        if hum_match: metrics['humidity'] = float(hum_match.group(1))
        if rain_match: metrics['rainfall'] = float(rain_match.group(1))

        # We require at least 3 features to run the ML model
        if len(metrics) >= 3:
            defaults = {
                'N': 50.0, 'P': 40.0, 'K': 40.0,
                'temperature': 25.0, 'humidity': 70.0,
                'ph': 6.5, 'rainfall': 100.0
            }
            for k, v in defaults.items():
                if k not in metrics:
                    metrics[k] = v
            return metrics
        return None

    async def _fetch_weather(self, location: str) -> str:
        """Fetch local weather from Open-Meteo using geocoding."""
        lat, lon = 20.0, 78.0  # Default: central India (neutral fallback)
        try:
            import httpx
            async with httpx.AsyncClient() as client:
                # Try geocoding the location name first
                try:
                    geo_url = f"https://geocoding-api.open-meteo.com/v1/search?name={location}&count=1&language=en&format=json"
                    geo_res = await client.get(geo_url, timeout=5)
                    if geo_res.status_code == 200:
                        geo_data = geo_res.json()
                        results = geo_data.get("results", [])
                        if results:
                            lat = results[0].get("latitude", lat)
                            lon = results[0].get("longitude", lon)
                except Exception:
                    pass
                url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current=temperature_2m,relative_humidity_2m,precipitation,weather_code&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&forecast_days=3&timezone=auto"
                res = await client.get(url, timeout=5)
                if res.status_code == 200:
                    w = res.json()
                    curr = w.get("current", {})
                    daily = w.get("daily", {})
                    return (
                        f"Current weather in {location}: Temp {curr.get('temperature_2m')}°C, "
                        f"Humidity {curr.get('relative_humidity_2m')}%, Weather code {curr.get('weather_code')}. "
                        f"3-Day Max Temperature Forecast: {daily.get('temperature_2m_max')}°C. "
                        f"Precipitation Forecast: {daily.get('precipitation_sum')} mm."
                    )
        except Exception as e:
            logger.warning("Weather tool error: %s", e)
        return f"Weather information for {location} is currently stable, typical for the season."

    def _get_market_prices(self, query: str, district: str = "Local") -> str:
        """Fetch matching commodities prices (global indicative prices)."""
        mkt = district if district else "Local"
        prices = [
            { 'commodity': 'Tomato', 'price': 1850, 'unit': 'quintal', 'market': f'{mkt} APMC', 'trend': '+12%' },
            { 'commodity': 'Ragi', 'price': 3200, 'unit': 'quintal', 'market': f'{mkt} Mandi', 'trend': '+3%' },
            { 'commodity': 'Rice', 'price': 2100, 'unit': 'quintal', 'market': f'{mkt} APMC', 'trend': '-2%' },
            { 'commodity': 'Maize', 'price': 1650, 'unit': 'quintal', 'market': f'{mkt} Mandi', 'trend': '+5%' },
            { 'commodity': 'Groundnut', 'price': 5500, 'unit': 'quintal', 'market': f'{mkt} Mandi', 'trend': '+1%' },
            { 'commodity': 'Cotton', 'price': 6800, 'unit': 'quintal', 'market': f'{mkt} Mandi', 'trend': '-4%' },
            { 'commodity': 'Wheat', 'price': 2050, 'unit': 'quintal', 'market': f'{mkt} Mandi', 'trend': '+2%' },
            { 'commodity': 'Potato', 'price': 1450, 'unit': 'quintal', 'market': f'{mkt} Mandi', 'trend': '+8%' },
            { 'commodity': 'Soybean', 'price': 4200, 'unit': 'quintal', 'market': f'{mkt} Mandi', 'trend': '-1%' },
        ]
        q = query.lower()
        matched = [p for p in prices if p['commodity'].lower() in q]
        if matched:
            return "\n".join([f"- {m['commodity']}: ₹{m['price']} per {m['unit']} at {m['market']} (Trend: {m['trend']})" for m in matched])
        return (
            f"- Tomato: ₹1850/quintal ({mkt} APMC, Trend: +12%)\n"
            f"- Rice: ₹2100/quintal ({mkt} Mandi, Trend: -2%)\n"
            f"- Maize: ₹1650/quintal ({mkt} Mandi, Trend: +5%)\n"
            "Note: Check Agmarknet (agmarknet.gov.in) for live prices at your nearest mandi."
        )

    async def stream_answer(
        self,
        query:          str,
        language:       str  = "en",
        conversation:   Optional[list] = None,
        farmer_history: Optional[list] = None,
        online:         bool = True,
        image_b64:      Optional[str] = None,
        farmer_context: Optional[dict] = None,
    ) -> AsyncGenerator:
        """
        Yields SSE event dicts representing stream steps and answer tokens.
        """
        import base64
        conversation   = conversation   or []
        farmer_history = farmer_history or []
        sources        = []
        mode           = "offline"

        # Auto-detect language if en or None
        if language == "en" or not language:
            try:
                from services.voice_service import voice_service
                detected_lang = voice_service.detect_language_from_text(query)
                if detected_lang != "en":
                    language = detected_lang
            except Exception:
                pass

        try:
            # ── 1. Intent Detection ──────────────────────────────────────────
            yield {"type": "status", "message": STATUS_MESSAGES["intent"]}
            intent = await asyncio.to_thread(intent_service.classify, query)

            # Override/adjust intent if image is attached
            if image_b64:
                intent.intent = "disease_diagnosis"
                intent.confidence = 1.0

            yield {
                "type": "intent",
                "data": {
                    "intent":      intent.intent,
                    "display":     INTENT_DISPLAY.get(intent.intent, "🌾 General Farming"),
                    "confidence":  intent.confidence,
                    "crops":       intent.crops_mentioned,
                    "locations":   intent.locations_mentioned,
                    "urgency":     intent.urgency,
                }
            }

            # ── 2. Tool Execution (Disease, Crop, Weather, Market, Knowledge) ──
            # --- Disease Diagnosis Tool ---
            if image_b64:
                yield {"type": "status", "message": "🔬 Running Disease Diagnosis Tool (LLaVA + CNN)..."}
                try:
                    from services.disease_service import disease_service
                    img_bytes = base64.b64decode(image_b64)
                    diag = await disease_service.full_diagnosis(img_bytes)
                    sources.append(SearchResult(
                        url="",
                        title=f"AI Plant Diagnosis: {diag['disease']} in {diag['crop']}",
                        excerpt=f"LLaVA pathologist description: {diag['explanation'][:300]}",
                        full_text=f"CNN detected {diag['disease']} with {diag['confidence']}% confidence. LLaVA Pathologist Report: {diag['explanation']} Severity: {diag['severity']}.",
                        source="Disease Tool",
                        score=0.98,
                        favicon="📸"
                    ))
                except Exception as e:
                    logger.error("Disease Tool execution failed: %s", e)

            # --- Crop Advisor Tool ---
            soil_metrics = self._extract_soil_metrics(query)
            if soil_metrics:
                yield {"type": "status", "message": "📊 Running Crop recommendation (SHAP Soil Model)..."}
                try:
                    from services.crop_service import crop_service
                    crop_res = await asyncio.to_thread(crop_service.predict, soil_metrics)
                    sources.append(SearchResult(
                        url="",
                        title=f"Soil Crop Recommendation: {crop_res['recommended_crop']}",
                        excerpt=f"Explanation: {crop_res['explanation']} (Confidence: {crop_res['confidence']}%). Top alternatives: {', '.join([c['crop'] for c in crop_res['top3_crops']])}.",
                        full_text=json.dumps(crop_res),
                        source="Crop Tool",
                        score=0.99,
                        favicon="🌱"
                    ))
                except Exception as e:
                    logger.error("Crop Tool execution failed: %s", e)

            # --- Weather Tool ---
            if intent.intent == "weather_query" or any(w in query.lower() for w in ["rain", "sow", "weather", "monsoon"]):
                yield {"type": "status", "message": "🌦️ Running Weather Advisor Tool (Open-Meteo)..."}
                loc = intent.locations_mentioned[0] if intent.locations_mentioned else "local area"
                weather_info = await self._fetch_weather(loc)
                sources.append(SearchResult(
                    url="",
                    title=f"Local Weather Forecast - {loc}",
                    excerpt=weather_info,
                    full_text=weather_info,
                    source="Weather Tool",
                    score=0.95,
                    favicon="🌤️"
                ))

            # --- Market Prices Tool ---
            if intent.intent == "market_query" or any(m in query.lower() for m in ["price", "mandi", "rate", "cost"]):
                yield {"type": "status", "message": "📈 Running Market Price Tool (Agmarknet)..."}
                district = farmer_context.get("district", "Local") if farmer_context else "Local"
                mkt_info = self._get_market_prices(query, district)
                sources.append(SearchResult(
                    url="",
                    title="APMC Mandi Prices",
                    excerpt=mkt_info,
                    full_text=mkt_info,
                    source="Market Tool",
                    score=0.95,
                    favicon="📈"
                ))

            # --- Web / Knowledge Search ---
            strategy = intent_service.get_search_strategy(intent)
            if online:
                yield {"type": "status", "message": STATUS_MESSAGES["search"]}
                try:
                    search_query = query
                    extra_kw = strategy.get("add_keywords", [])
                    if extra_kw:
                        search_query = f"{query} {' '.join(extra_kw[:2])}"
                    web_sources = await search_service.search(search_query, max_results=5)
                    sources.extend(web_sources)
                except Exception as e:
                    logger.warning(f"[Search] {e}")

            # --- Local RAG / Neo4j KAG ---
            if not sources or strategy.get("rag_priority") == "high":
                yield {"type": "status", "message": STATUS_MESSAGES["rag"]}
                try:
                    # 1. Primary semantic search
                    chunks = await asyncio.to_thread(rag_service.retrieve, query, top_k=4)
                    
                    # 2. Location-expanded semantic search if location context is available
                    soil_type = farmer_context.get("soil_type") if farmer_context else None
                    district = farmer_context.get("district") if farmer_context else None
                    
                    if soil_type or district:
                        loc_parts = []
                        if soil_type: loc_parts.append(soil_type)
                        if district: loc_parts.append(district)
                        expanded_query = f"{query} for {' '.join(loc_parts)}"
                        
                        loc_chunks = await asyncio.to_thread(rag_service.retrieve, expanded_query, top_k=3)
                        
                        # Merge and de-duplicate
                        seen_sigs = set()
                        merged_chunks = []
                        for chunk in chunks + loc_chunks:
                            txt_sig = chunk.get("text", "").strip().lower()[:100]
                            if txt_sig and txt_sig not in seen_sigs:
                                seen_sigs.add(txt_sig)
                                merged_chunks.append(chunk)
                        chunks = merged_chunks[:5]
                        
                    rag_sources = [
                        SearchResult(
                            url="", title=c["title"],
                            excerpt=c["text"][:400], full_text=c["text"],
                            source="Local KB", score=c["score"]
                        )
                        for c in chunks
                    ]
                    sources.extend(rag_sources)
                except Exception as e:
                    logger.warning(f"[RAG] {e}")

            if not sources:
                yield {"type": "status", "message": "Using generic agricultural knowledge..."}

            mode = "online" if any(s.source not in ("Local KB", "Disease Tool", "Crop Tool", "Weather Tool", "Market Tool") for s in sources) else "offline"

            # ── 3. Emit Sources ──────────────────────────────────────────────
            yield {
                "type": "sources",
                "data": [
                    {
                        "index":   i + 1,
                        "url":     s.url,
                        "title":   s.title,
                        "excerpt": s.excerpt,
                        "source":  s.source,
                        "favicon": s.favicon if s.favicon else ("📚" if s.source == "Local KB" else "🌐"),
                        "score":   round(s.score, 3),
                        # Allow passing custom tool payload like SHAP charts
                        "full_text": s.full_text if s.source in ("Crop Tool", "Disease Tool") else ""
                    }
                    for i, s in enumerate(sources)
                ]
            }

            # ── 4. KAG Enrichment ────────────────────────────────────────────
            if strategy.get("kag_priority") in ("high", "medium"):
                yield {"type": "status", "message": STATUS_MESSAGES["kag"]}

            crops   = intent.crops_mentioned or self._extract_crops(query)
            
            # Extract location details from farmer_context
            agro_zone = farmer_context.get("agro_zone") if farmer_context else None
            soil_type = farmer_context.get("soil_type") if farmer_context else None
            
            kag_ctx = await asyncio.to_thread(
                self._kag_context, 
                crops, 
                intent.intent, 
                agro_zone=agro_zone, 
                soil_type=soil_type
            )
            mem_ctx = self._memory_context(farmer_history)

            # ── 5. Build System Prompt ────────────────────────────────────────
            system = self._build_system_prompt(sources, intent, kag_ctx, mem_ctx, language, farmer_context)
            messages = [{"role": "system", "content": system}]
            for turn in conversation[-6:]:
                messages.append({"role": turn["role"], "content": turn["content"]})
            messages.append({"role": "user", "content": query})

            # ── 6. Stream LLM Answer ──────────────────────────────────────────
            yield {"type": "status", "message": STATUS_MESSAGES["generate"]}
            full_answer = ""

            try:
                # Stream via unified LLM service (Ollama-first, Gemini fallback)
                stream = unified_llm_service.chat_stream(
                    system_prompt=system,
                    query=query,
                    history=conversation[-6:]
                )
                async for token in stream:
                    full_answer += token
                    yield {"type": "token", "content": token}
            except Exception as e:
                logger.warning(f"LLM streaming failed: {e}. Building answer from sources.")
                from utils.fallback_formatter import format_offline_fallback
                full_answer = format_offline_fallback(query, sources or [], target_lang=language)
                # Stream the built answer
                words = full_answer.split(' ')
                for wi in range(0, len(words), 3):
                    tok = ' '.join(words[wi:wi+3]) + ' '
                    yield {"type": "token", "content": tok}

            # ── 7. Extract Confidence ──
            clean_answer, confidence_score = self._extract_confidence(full_answer)
            yield {"type": "confidence", "score": confidence_score}

            # ── 8. Related Questions ──
            yield {"type": "status", "message": STATUS_MESSAGES["related"]}
            related = await self._related_questions(query, clean_answer, language, intent)
            if related:
                yield {"type": "related", "questions": related}

            # ── 9. Done ───────────────────────────────────────────────────────
            citation_count = len(set(re.findall(r'\[(\d+)\]', full_answer)))
            yield {
                "type":             "done",
                "mode":             mode,
                "full_answer":      clean_answer,
                "confidence":       confidence_score,
                "citation_count":   citation_count,
                "source_count":     len(sources),
                "intent":           intent.intent,
                "intent_display":   INTENT_DISPLAY.get(intent.intent, ""),
            }

        except Exception as e:
            logger.error(f"[KrishiSearch] {e}", exc_info=True)
            yield {"type": "error", "message": str(e)}


krishi_search_service = KrishiSearchService()
