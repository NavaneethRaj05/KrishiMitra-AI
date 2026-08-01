from typing import List
from core.context_builder import ContextBuilder
from core.memory_manager import MemoryManager

class PromptManager:
    """Dynamically generates prompts based on context, language, and intent."""
    
    LANG_MAP = {
        "en": "English", "hi": "Hindi",  "kn": "Kannada",
        "ta": "Tamil",   "te": "Telugu", "mr": "Marathi",
        "pa": "Punjabi", "bn": "Bengali"
    }
    
    def format_sources(self, sources: List) -> str:
        lines = []
        for i, s in enumerate(sources, 1):
            title = getattr(s, 'title', 'Unknown')
            url = getattr(s, 'url', '')
            text = getattr(s, 'full_text', getattr(s, 'excerpt', ''))
            source_type = getattr(s, 'source', 'Tool')
            
            lines.append(
                f"[{i}] SOURCE: {source_type} | {title}\n"
                f"URL: {url}\n"
                f"CONTENT: {text}\n"
            )
        return "\n".join(lines)
        
    def build_system_prompt(self, sources: List, mem_ctx: str, language: str, context: dict) -> str:
        lang_name = self.LANG_MAP.get(language, "English")
        sources_text = self.format_sources(sources)
        
        district = context.get("district", "Unknown")
        state = context.get("state", "Unknown")
        soil_type = context.get("soil_type", "Unknown")
        crop = context.get("crop", "Unknown")
        season = context.get("season", "Unknown")
        agro_zone = context.get("agro_zone", "")
        weather = context.get("weather", {})
        
        weather_str = f"Temp: {weather.get('temperature')}°C, Humidity: {weather.get('humidity')}%, Conditions: {weather.get('description', 'Normal')}"
        
        location_info = (
            f"\n--- Farmer Location & Weather Context (GPS-based) ---\n"
            f"Location: {district}, {state}\n"
            f"Agro-Climatic Zone: {agro_zone}\n"
            f"Typical Soil Type: {soil_type}\n"
            f"Primary Crop of Interest: {crop}\n"
            f"Current Season: {season}\n"
            f"Current Weather conditions: {weather_str}\n"
        )
        
        temp = weather.get('temperature')
        if temp and isinstance(temp, (int, float)) and temp > 35:
            location_info += "⚠️ HEAT ALERT: Extremely high temperature. Recommend heat-stress mitigation and frequent watering.\n"
            
        kb_chunks = [s for s in sources if getattr(s, 'source', '') == 'Local KB']
        rag_kb_section = ""
        if kb_chunks:
            rag_lines = []
            for i, s in enumerate(kb_chunks[:4], 1):
                text = getattr(s, 'full_text', getattr(s, 'excerpt', ''))
                words = text.split()
                text = " ".join(words[:200]) + ("..." if len(words) > 200 else "")
                title = getattr(s, 'title', 'Guide')
                rag_lines.append(f"[KB-{i}] {title}:\n{text}")
            rag_kb_section = (
                "\n\n--- PRIORITY KNOWLEDGE BASE (ICAR-verified — cite these first) ---\n"
                + "\n\n".join(rag_lines)
                + "\n---\n"
            )

        return f"""You are KrishiMitraAI, the world's most expert agricultural AI assistant for farmers. You answer any question about farming, crops, soil, diseases, pests, weather, markets, government schemes, irrigation, and organic practices.
{location_info}
{rag_kb_section}
CITATION RULES (mandatory):
- Every factual claim MUST have an inline citation immediately after: [1] or [2][3]
- ICAR Knowledge Base entries [KB-1], [KB-2] etc. are your PRIMARY source — cite them FIRST
- Only cite from the numbered sources and KB entries provided below
- Never invent or fabricate citations or dosages not in the sources

ANSWER STYLE:
- Be practical, specific, and immediately actionable for the farmer's specific location, soil, and weather
- Include quantities, timings, dosages, and product names when available in the sources
- Use bullet points for lists
- NEVER give a generic answer — every sentence must reference the farmer's context
- If sources conflict, acknowledge it

CONFIDENCE GUIDANCE:
After your answer, on a new line write exactly:
CONFIDENCE: [number between 60-99]%
Base the confidence on: source quality (1-5), coverage (all aspects answered), and consistency (sources agree).{mem_ctx}

SOURCES:
{sources_text}

Respond entirely in {lang_name}."""

prompt_manager = PromptManager()
