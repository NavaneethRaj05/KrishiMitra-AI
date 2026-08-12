"""
Intent Detection Service — Agentic Query Router
Classifies farmer queries into structured intents and routes
them to the appropriate specialized agent pipeline.

Intent categories:
- crop_selection     → Crop Advisor Agent
- disease_diagnosis  → Disease Agent (RAG + Vision)
- soil_analysis      → Soil Agent
- weather_query      → Weather Agent
- market_query       → Market Agent
- government_scheme  → Scheme Agent
- irrigation_query   → Irrigation Agent
- fertilizer_query   → Fertilizer Agent
- pest_control       → Pest Agent
- general_farming    → General Agent
"""
import logging
import re
from dataclasses import dataclass
from typing import Optional
import os
from shared.constants import KNOWN_CROPS

logger = logging.getLogger("krishimitraai.intent")

# ── Keyword-based fast classification ──────────────────────────────────────
INTENT_KEYWORDS = {
    "greeting": [
        "hi", "hello", "hey", "hii", "hiii", "helo", "hola", "howdy",
        "good morning", "good afternoon", "good evening", "good night",
        "namaste", "namaskar", "namaskara", "vanakkam",
        "नमस्ते", "नमस्कार", "ನಮಸ್ಕಾರ", "வணக்கம்",
        "what can you do", "who are you", "help me",
        "thanks", "thank you", "dhanyavad", "dhanyavaada",
        "bye", "goodbye", "see you",
    ],
    "disease_diagnosis": [
        "disease", "blight", "wilt", "yellow", "spot", "fungus", "dying",
        "infection", "symptoms", "leaves turning", "brown", "mold", "rot",
        "pest", "insect", "aphid", "borer", "grub", "virus", "bacteria",
        "rogi", "byadhi", "rog", "बीमारी", "रोग", "ಕೀಟ", "ರೋಗ",
    ],
    "crop_selection": [
        "which crop", "what crop", "grow", "sow", "plant", "best crop",
        "suitable crop", "recommend crop", "red soil", "black soil", "alluvial",
        "kharif", "rabi", "rainy season", "beku", "ugadu", "bona",
        "कौन सी फसल", "ಯಾವ ಬೆಳೆ",
    ],
    "soil_analysis": [
        "soil", "pH", "nitrogen", "phosphorus", "potassium", "npk",
        "soil test", "fertility", "organic matter", "compost",
        "माटी", "ಮಣ್ಣು",
    ],
    "weather_query": [
        "weather", "rain", "rainfall", "monsoon", "forecast", "temperature",
        "humidity", "drought", "flood", "climate", "wind", "season",
        "mausam", "maleya", "baarish", "मौसम", "ಮಳೆ",
    ],
    "market_query": [
        "price", "market", "mandi", "sell", "rate", "profit", "income",
        "export", "demand", "supply", "apmc", "agmarknet",
        "belay", "bazar", "दाम", "मंडी", "ಬೆಲೆ",
    ],
    "government_scheme": [
        "scheme", "subsidy", "loan", "insurance", "pmfby", "kcc", "fasal",
        "government", "ministry", "krishi", "yojana", "helpline",
        "yojane", "सरकार", "योजना", "ಸರ್ಕಾರ",
    ],
    "irrigation_query": [
        "water", "irrigate", "irrigation", "drip", "sprinkler", "canal",
        "borewell", "pond", "water logging", "drainage",
        "neer", "neeru", "paani", "पानी", "ನೀರು",
    ],
    "fertilizer_query": [
        "fertilizer", "urea", "dap", "npk", "compost", "manure",
        "nutrient deficiency", "organic fertilizer", "biofertilizer",
        "gobe", "khad", "खाद", "ಗೊಬ್ಬರ",
    ],
    "pest_control": [
        "pest", "insecticide", "pesticide", "spray", "neem", "biological control",
        "integrated pest", "trap crop", "pheromone",
        "keeta", "keeṭanāśaka", "कीटनाशक", "ಕೀಟ ನಿಯಂತ್ರಣ",
    ],
    "harvest_storage": [
        "harvest", "post harvest", "storage", "warehouse", "msp", "cold storage",
        "packaging", "grading", "drying", "threshing",
        "shasya", "kāpañi", "ಕೊಯ್ಲು",
    ],
}


@dataclass
class IntentResult:
    intent: str
    confidence: float
    keywords_matched: list
    sub_intent: Optional[str] = None
    crops_mentioned: Optional[list] = None
    locations_mentioned: Optional[list] = None
    urgency: str = "normal"  # "urgent" | "normal" | "informational"

    def __post_init__(self):
        if self.crops_mentioned is None:
            self.crops_mentioned = []
        if self.locations_mentioned is None:
            self.locations_mentioned = []




URGENCY_KEYWORDS = [
    "urgent", "emergency", "immediate", "critical", "dying", "all leaves",
    "entire crop", "spreading fast", "sudden", "overnight", "suddenly",
    "immediately", "right now", "help", "please", "save my",
]

# Well-known global agricultural districts/regions (detect when mentioned in queries)
# The system uses these for context extraction; farmers from any location are supported
KNOWN_AGRICULTURAL_REGIONS = [
    # India — major agricultural states and districts
    "Hassan", "Mysore", "Tumkur", "Dharwad", "Belgaum", "Belagavi",
    "Chitradurga", "Bellary", "Raichur", "Gulbarga", "Mandya", "Shimoga",
    "Chikkamagalur", "Kodagu", "Dakshina Kannada", "Udupi", "Bangalore", "Bengaluru",
    "Pune", "Nashik", "Aurangabad", "Nagpur", "Kolhapur", "Satara",
    "Ludhiana", "Amritsar", "Patiala", "Jalandhar", "Bathinda",
    "Jaipur", "Jodhpur", "Kota", "Ajmer", "Bikaner", "Alwar",
    "Kanpur", "Lucknow", "Varanasi", "Allahabad", "Agra", "Meerut",
    "Patna", "Gaya", "Muzaffarpur", "Bhagalpur",
    "Bhopal", "Indore", "Jabalpur", "Gwalior",
    "Hyderabad", "Warangal", "Vijayawada", "Guntur", "Nellore", "Kurnool",
    "Chennai", "Coimbatore", "Madurai", "Tiruchirappalli", "Salem",
    "Kolkata", "Murshidabad", "Burdwan", "Bankura", "Midnapore",
    # Africa
    "Nairobi", "Mombasa", "Eldoret", "Nakuru", "Kisumu",
    "Lagos", "Ibadan", "Kano", "Abuja", "Enugu",
    "Accra", "Kumasi", "Tamale",
    "Addis Ababa", "Bahir Dar", "Hawassa", "Dire Dawa",
    "Dar es Salaam", "Mwanza", "Arusha", "Moshi",
    "Kampala", "Gulu", "Mbarara", "Jinja",
    # Southeast Asia
    "Dhaka", "Chittagong", "Sylhet", "Rajshahi", "Khulna",
    "Manila", "Davao", "Cebu", "Zamboanga",
    "Jakarta", "Surabaya", "Bandung", "Medan",
    "Hanoi", "Ho Chi Minh", "Da Nang", "Can Tho",
    "Bangkok", "Chiang Mai", "Udon Thani",
    # Latin America
    "Sao Paulo", "Minas Gerais", "Goias", "Mato Grosso", "Parana",
    "Buenos Aires", "Cordoba", "Santa Fe", "Mendoza",
    "Mexico City", "Sinaloa", "Sonora", "Guanajuato",
]


class IntentService:

    def classify(self, query: str) -> IntentResult:
        """
        Fast keyword-based intent classification.
        Returns intent, confidence, matched keywords, detected entities.
        """
        q = query.lower()

        scores = {}
        matched = {}
        for intent, keywords in INTENT_KEYWORDS.items():
            hits = []
            for kw in keywords:
                if " " in kw:
                    if kw.lower() in q:
                        hits.append(kw)
                else:
                    if re.search(rf"\b{re.escape(kw)}\b", q):
                        hits.append(kw)
            scores[intent]  = len(hits)
            matched[intent] = hits

        # Find best match
        best_intent = max(scores, key=lambda k: scores[k])
        best_score  = scores[best_intent]

        if best_score == 0:
            intent     = "general_farming"
            confidence = 0.5
            keywords   = []
        else:
            # Normalize confidence by max possible keyword hits
            total_kw   = len(INTENT_KEYWORDS.get(best_intent, []))
            confidence = min(0.95, 0.5 + (best_score / max(total_kw, 1)) * 0.45)
            intent     = best_intent
            keywords   = matched[best_intent]

        # Extract entities
        crops     = [c for c in KNOWN_CROPS if c in q]
        locations = [d for d in KNOWN_AGRICULTURAL_REGIONS if d.lower() in q]

        # Detect urgency
        urgency = "urgent" if any(kw in q for kw in URGENCY_KEYWORDS) else "normal"
        # Informational (broad "how to" questions)
        if any(p in q for p in ["how to", "what is", "explain", "tell me about", "general"]):
            urgency = "informational"

        return IntentResult(
            intent=intent,
            confidence=round(confidence, 3),
            keywords_matched=keywords,
            crops_mentioned=crops,
            locations_mentioned=locations,
            urgency=urgency,
        )

    async def classify_with_llm(self, query: str) -> IntentResult:
        """
        LLM-assisted intent classification for ambiguous queries.
        Falls back to keyword classification if LLM is unavailable.
        """
        # First do keyword classification
        kw_result = self.classify(query)

        # If keyword confidence is high enough, skip LLM
        if kw_result.confidence >= 0.75:
            return kw_result

        # Use LLM for disambiguation
        valid_intents = list(INTENT_KEYWORDS.keys()) + ["general_farming"]
        prompt = (
            f"Classify this farmer's question into exactly one intent.\n"
            f"Question: {query}\n"
            f"Valid intents: {', '.join(valid_intents)}\n"
            f"Return only the intent name, nothing else."
        )
        try:
            import asyncio
            try:
                from ollama import AsyncClient
                client = AsyncClient()
                response = await client.chat(
                    model=os.getenv("OLLAMA_MODEL", "llama3.1:8b"),
                    messages=[{"role": "user", "content": prompt}],
                    options={"temperature": 0.1, "num_predict": 20}
                )
            except Exception:
                import ollama
                def run_sync_chat():
                    return ollama.chat(
                        model=os.getenv("OLLAMA_MODEL", "llama3.1:8b"),
                        messages=[{"role": "user", "content": prompt}],
                        options={"temperature": 0.1, "num_predict": 20}
                    )
                response = await asyncio.to_thread(run_sync_chat)
            llm_intent = response["message"]["content"].strip().lower()
            # Validate LLM output
            if llm_intent in valid_intents:
                return IntentResult(
                    intent=llm_intent,
                    confidence=0.85,
                    keywords_matched=kw_result.keywords_matched,
                    crops_mentioned=kw_result.crops_mentioned,
                    locations_mentioned=kw_result.locations_mentioned,
                    urgency=kw_result.urgency,
                )
        except Exception as e:
            logger.warning(f"[Intent LLM] {e}")

        return kw_result

    def get_search_strategy(self, intent: IntentResult) -> dict:
        """
        Return optimal search strategy for the given intent.
        Controls which sources to prioritize.
        """
        strategies = {
            "disease_diagnosis": {
                "sources": ["icar", "plantvillage", "vikaspedia", "pubmed"],
                "rag_priority": "high",
                "kag_priority": "high",
                "add_keywords": ["treatment", "management", "symptoms", "identification"],
                "response_sections": ["symptoms", "cause", "treatment", "prevention"],
            },
            "crop_selection": {
                "sources": ["icar", "kvk", "vikaspedia", "fao"],
                "rag_priority": "high",
                "kag_priority": "high",
                "add_keywords": ["suitable", "yield", "season", "requirement"],
                "response_sections": ["recommendation", "soil_match", "season", "yield", "care"],
            },
            "weather_query": {
                "sources": ["imd", "open_meteo", "vikaspedia"],
                "rag_priority": "low",
                "kag_priority": "low",
                "add_keywords": ["forecast", "advisory"],
                "response_sections": ["current", "forecast", "farming_advisory"],
            },
            "market_query": {
                "sources": ["agmarknet", "vikaspedia", "commodity_india"],
                "rag_priority": "low",
                "kag_priority": "low",
                "add_keywords": ["price", "mandi", "APMC"],
                "response_sections": ["current_price", "trend", "selling_advice"],
            },
            "government_scheme": {
                "sources": ["india_gov", "pm_kisan", "vikaspedia", "nabard"],
                "rag_priority": "medium",
                "kag_priority": "low",
                "add_keywords": ["eligibility", "benefits", "how to apply"],
                "response_sections": ["scheme_name", "benefits", "eligibility", "application"],
            },
            "fertilizer_query": {
                "sources": ["icar", "vikaspedia", "fao"],
                "rag_priority": "high",
                "kag_priority": "medium",
                "add_keywords": ["dosage", "application", "timing"],
                "response_sections": ["recommendation", "dosage", "timing", "organic_alternatives"],
            },
            "irrigation_query": {
                "sources": ["icar", "fao", "vikaspedia"],
                "rag_priority": "high",
                "kag_priority": "low",
                "add_keywords": ["water requirement", "schedule", "method"],
                "response_sections": ["method", "schedule", "water_saving"],
            },
            "pest_control": {
                "sources": ["icar", "plantvillage", "vikaspedia"],
                "rag_priority": "high",
                "kag_priority": "high",
                "add_keywords": ["identification", "chemical", "organic", "dosage"],
                "response_sections": ["identification", "chemical_control", "organic_control", "ipm"],
            },
        }
        return strategies.get(intent.intent, {
            "sources": ["icar", "vikaspedia", "fao", "web"],
            "rag_priority": "medium",
            "kag_priority": "medium",
            "add_keywords": [],
            "response_sections": ["answer", "explanation", "recommendations"],
        })


intent_service = IntentService()
