"""
Smart Fallback Formatter — Structuring RAG Chunks when LLMs are Offline

Transforms raw document dumps into readable, structured agricultural advice:
  - Extracts crop and topic keywords from user query.
  - Filters retrieved context chunks to prioritize relevant sentences.
  - Adds smart, rule-based expert agricultural insights.
  - Formats the results into clean Perplexity-style markdown with sections, bullets, and callouts.
"""
import re
from typing import List, Any
from utils.language import translate_fallback_text

# Extended crop keywords — covers regional names and phonetic variants
CROP_KEYWORDS = {
    "mango":       ["mango", "mangoes", "aam", "ambi", "manga", "mavinkai"],
    "tomato":      ["tomato", "tomatoes", "tamatar", "thakkali", "tameta", "tomate"],
    "banana":      ["banana", "bananas", "kela", "bale", "vazhai", "arati"],
    "paddy":       ["rice", "paddy", "dhan", "bhatta", "nellu", "biyyam", "dhan"],
    "wheat":       ["wheat", "gehun", "kanak", "godhu", "goduma"],
    "coconut":     ["coconut", "coconuts", "nariyal", "tengina", "thenkai"],
    "potato":      ["potato", "potatoes", "aloo", "aaloo", "urulaikizhangu", "bangaladumpa"],
    "maize":       ["maize", "corn", "makka", "makkai", "cholam", "mokka"],
    "cotton":      ["cotton", "kapas", "paruthi", "patti"],
    "sugarcane":   ["sugarcane", "sugarcanes", "ganna", "kabbu", "karumbu", "cheruku"],
    "groundnut":   ["groundnut", "peanut", "moongphali", "kadlekay", "verkadalai", "pallelu"],
    "onion":       ["onion", "onions", "pyaz", "eerulli", "vengayam", "ullipaya"],
    "soybean":     ["soybean", "soya", "soy", "soyabeen"],
    "chilli":      ["chilli", "chili", "pepper", "mirchi", "mensu", "milagai", "mirapakaya"],
    "ragi":        ["ragi", "finger millet", "nachni", "ragulu"],
    "sunflower":   ["sunflower", "suryakanti", "surajmukhi"],
    "pulse":       ["pulse", "pulses", "dal", "lentil", "tur", "moong", "urad", "chana"],
    "brinjal":     ["brinjal", "eggplant", "badanekai", "katharikai", "vankaya"],
}

# Extended topic keywords
TOPIC_KEYWORDS = {
    "fertilizer":  ["fertilizer", "manure", "compost", "urea", "dap", "mop", "npk", "khad",
                    "gobar", "nutrition", "deficiency", "nitrogen", "phosphorus", "potassium",
                    "micronutrient", "zinc", "boron", "sulphur", "dose", "dosage"],
    "pest":        ["pest", "insect", "worm", "aphid", "borer", "caterpillar", "bug",
                    "thrips", "mite", "stem borer", "fruit fly", "whitefly", "locust",
                    "jassid", "mealy bug"],
    "disease":     ["disease", "blight", "wilt", "rot", "mold", "fungus", "viral",
                    "infection", "spots", "spongy", "yellowing", "blast", "rust",
                    "smut", "damping off", "mosaic", "curl", "burn", "lesion"],
    "soil":        ["soil", "earth", "clay", "sand", "loam", "acidity", "alkalinity",
                    "ph", "drainage", "organic", "humus", "compaction"],
    "irrigation":  ["water", "irrigation", "drip", "sprinkler", "watering", "moisture",
                    "drought", "flood", "flood irrigation", "channel"],
    "market":      ["market", "price", "mandi", "rate", "sell", "selling", "profit",
                    "demand", "agmarknet", "buyer", "wholesale", "retail"],
    "weather":     ["rain", "rainfall", "temperature", "humidity", "wind", "drought",
                    "flood", "frost", "heat", "monsoon", "forecast"],
    "scheme":      ["scheme", "subsidy", "loan", "credit", "pm kisan", "kisan",
                    "insurance", "government", "yojana", "support", "benefit"],
    "sowing":      ["sow", "sowing", "seed", "planting", "germination", "transplant",
                    "nursery", "spacing", "variety", "hybrid"],
    "harvest":     ["harvest", "yield", "production", "storage", "post harvest",
                    "grading", "packaging", "export"],
    "taste":       ["sour", "sweet", "sweetness", "taste", "bitter", "acidic", "quality"],
}

# Pre-built expert answers for common query patterns
EXPERT_ANSWERS = {
    ("paddy", "disease"): """## 🌾 Paddy Blast Fungal Management

**Disease**: Rice Blast (*Magnaporthe oryzae*) is the most destructive paddy disease.

### Symptoms
- Diamond-shaped grey-white lesions with brown borders on leaves
- Neck/panicle blast: grain filling stops, panicles break

### Treatment
| Method | Product | Dosage |
|--------|---------|--------|
| Chemical | Tricyclazole 75% WP | 0.6 g/litre water |
| Chemical | Isoprothiolane 40% EC | 1.5 ml/litre water |
| Bio-control | *Pseudomonas fluorescens* | 5 g/litre water |

### Prevention
- **Drain** standing water for 2–3 days to reduce canopy humidity
- Avoid excess nitrogen — promotes soft, blast-susceptible tissue
- Use certified blast-resistant varieties (BPT 5204, Jyothi, IR64)
- Spray preventively at tillering and panicle initiation stages

> ⚡ **Early morning spraying** gives better coverage and avoids heat evaporation.
> Contact your KVK for region-specific resistant varieties.""",

    ("tomato", "disease"): """## 🍅 Tomato Disease Management

### Leaf Curl Virus (ToLCV)
- **Vector Control**: Yellow Sticky Traps @ 10–15 per acre to trap whiteflies
- **Sanitation**: Remove and destroy infected plants immediately
- **Spray**: Neem Oil 3000 ppm @ 5 ml/litre OR Imidacloprid 17.8% SL @ 0.5 ml/litre

### Early Blight (*Alternaria solani*)
- **Symptoms**: Concentric ring spots on lower leaves
- **Chemical**: Mancozeb 75% WP @ 2.5 g/litre OR Chlorothalonil @ 2 g/litre
- **Bio**: *Trichoderma viride* @ 4 g/kg seed treatment

### Late Blight (*Phytophthora infestans*)
- **Chemical**: Metalaxyl + Mancozeb @ 2 g/litre
- Spray at 7–10 day intervals during cool wet weather

> Contact KVK for disease-resistant hybrid varieties like Arka Rakshak.""",

    ("mango", "disease"): """## 🥭 Mango Disease & Quality Management

### Sour Taste / Black Spots
- **Sour taste** usually indicates early harvest before sugar development
- **Black dots on skin** are often lenticel damage, bacterial black spot, or anthracnose
- **Spongy tissue** inside is a physiological disorder — common in Alphonso

### Treatment
- **Anthracnose**: Spray Carbendazim 50% WP @ 1 g/litre before flowering
- **Bacterial Black Spot**: Copper oxychloride @ 3 g/litre
- **Spongy tissue**: Spray Calcium nitrate @ 1% during fruit development

### Post-harvest
1. Cut open a few fruits to check flesh quality
2. If spots only on skin and flesh is fine — cut affected parts and use the rest
3. Discard any fruit that smells bad or is mushy inside
4. Keep unripe mangoes at room temperature — do not refrigerate before ripening

> Use sour mangoes for chutney, pickle, or curry instead of eating raw.""",

    ("paddy", "fertilizer"): """## 🌾 Paddy Fertilizer Schedule

### Recommended NPK for Paddy (per acre)
| Nutrient | Total | Basal | Top Dress 1 (30 DAT) | Top Dress 2 (55 DAT) |
|----------|-------|-------|---------------------|---------------------|
| Nitrogen (N) | 40 kg | 10 kg | 15 kg | 15 kg |
| Phosphorus (P) | 24 kg | 24 kg | — | — |
| Potassium (K) | 16 kg | 8 kg | 8 kg | — |

### Products & Dosage (per acre)
- **Basal**: DAP @ 50 kg + MOP @ 13 kg + Urea @ 22 kg
- **Top Dress 1** (30 days after transplanting): Urea @ 33 kg
- **Top Dress 2** (55 days after transplanting): Urea @ 33 kg

### Zinc Deficiency (very common in paddy)
- Apply **Zinc Sulfate @ 10 kg/acre** basally if deficiency observed
- Foliar spray: 0.5% ZnSO₄ at 30 and 50 DAT

> Always use recommended doses — over-application of nitrogen increases blast disease risk.""",

    ("onion", "disease"): """## 🧅 Onion Disease Management

### Purple Blotch (*Alternaria porri*)
- **Symptoms**: Small white spots with purple centres on leaves
- **Chemical**: Mancozeb 75% WP @ 2.5 g/litre OR Iprodione @ 1.5 ml/litre
- **Spray interval**: Every 7–10 days during cool moist weather

### Stemphylium Blight
- Often appears with purple blotch — spray combination fungicides

### Thrips (Major Pest)
- **Spray**: Spinosad 45% SC @ 0.3 ml/litre OR Fipronil 5% SC @ 2 ml/litre
- **Sticky Traps**: Blue sticky traps @ 10 per acre

> Avoid overhead irrigation — promotes foliar diseases.""",

    ("groundnut", "pest"): """## 🥜 Groundnut Pest Management

### Leaf Minor
- **Spray**: Dimethoate 30% EC @ 2 ml/litre

### Spodoptera / Armyworm
- **Bio**: Spodoptera NPV @ 250 LE/acre
- **Chemical**: Chlorpyrifos 20% EC @ 2.5 ml/litre at 7–10 day intervals

### Girdle Beetle
- Spray Endosulfan 35% EC @ 1.5 ml/litre at flowering stage

> Use pheromone traps @ 5–8 per acre for monitoring pest populations.""",
}


def _find_best_expert_answer(query: str, detected_crops: list, detected_topics: list) -> str:
    """Return the closest pre-built expert answer based on crop+topic matching."""
    q_lower = query.lower()
    best = None

    for (crop_key, topic_key), answer in EXPERT_ANSWERS.items():
        crop_match = (
            crop_key in detected_crops
            or crop_key in q_lower
            or any(kw in q_lower for kw in CROP_KEYWORDS.get(crop_key, []))
        )
        topic_match = (
            topic_key in detected_topics
            or topic_key in q_lower
            or any(kw in q_lower for kw in TOPIC_KEYWORDS.get(topic_key, []))
        )
        if crop_match and topic_match:
            best = answer
            break
        elif crop_match and not best:
            best = answer  # partial crop-only match as fallback

    return best or ""


def format_offline_fallback(query: str, chunks: List[Any], target_lang: str = "en", location_context: dict = None) -> str:
    """
    Analyzes the query, raw context chunks, and location intelligence to build a structured,
    highly readable Perplexity-style markdown answer, and translates it to the target language.
    """
    q_lower = query.lower()

    # 1. Detect crops and topics in query
    detected_crops  = [c for c, kws in CROP_KEYWORDS.items() if any(kw in q_lower for kw in kws)]
    detected_topics = [t for t, kws in TOPIC_KEYWORDS.items() if any(kw in q_lower for kw in kws)]

    output_parts = []

    # 0. Build Location, Climate, Soil & Regional Crops Card
    if location_context:
        dist = location_context.get("district") or ""
        st = location_context.get("state") or ""
        loc_name = f"{dist}, {st}".strip(", ") or "Local Region"
        soil = location_context.get("soil_type") or "Sandy Loam"
        weather = location_context.get("weather") or {}
        temp = weather.get("temperature", 28.0)
        humidity = weather.get("humidity", 65.0)
        cond = weather.get("description", "Clear Sky")
        season = location_context.get("season") or "Kharif"
        agro = location_context.get("agro_zone") or ""
        crops = location_context.get("major_crops") or location_context.get("major_crops_in_area") or []
        crops_str = ", ".join(crops) if crops else "Paddy, Tomato, Maize, Ragi, Sugarcane"

        loc_card = (
            f"## 📍 Location & Climate Context ({loc_name})\n"
            f"- **🌱 Soil Type**: {soil}\n"
            f"- **🌡️ Weather & Heat**: {temp}°C, {humidity}% humidity ({cond})\n"
            f"- **🗓️ Current Season**: {season}" + (f" | **Agro-Zone**: {agro}" if agro else "") + "\n"
            f"- **🌾 Widely Grown Local Crops**: {crops_str}\n\n"
            f"---\n"
        )
        output_parts.append(loc_card)

    # 2. Try pre-built expert answer first
    expert_answer = _find_best_expert_answer(query, detected_crops, detected_topics)
    if expert_answer:
        output_parts.append(expert_answer)

    # 3. Process and filter retrieved context chunks
    relevant_sentences = []
    general_sentences  = []
    references         = []

    for idx, chunk in enumerate(chunks, 1):
        text         = ""
        source_title = ""
        source_name  = ""

        if isinstance(chunk, str):
            text         = chunk
            source_title = f"Document Reference {idx}"
            source_name  = "Local KB"
        elif hasattr(chunk, "full_text") or hasattr(chunk, "excerpt"):
            text         = getattr(chunk, "full_text") or getattr(chunk, "excerpt") or ""
            source_title = getattr(chunk, "title", "")
            source_name  = getattr(chunk, "source", "")
        elif isinstance(chunk, dict):
            text         = chunk.get("full_text") or chunk.get("excerpt") or chunk.get("text") or ""
            source_title = chunk.get("title", "") or chunk.get("source", "")
            source_name  = chunk.get("source", "Local KB")

        ref_title = source_title or f"Reference {idx}"
        ref_src   = source_name  or "Verified Database"
        references.append(f"**{ref_title}** — *{ref_src}*")

        sentences = re.split(r"(?<=[.!?])\s+", text)
        for sentence in sentences:
            sentence = sentence.strip()
            if not sentence or len(sentence) < 15:
                continue
            s_lower     = sentence.lower()
            crop_match  = any(any(kw in s_lower for kw in CROP_KEYWORDS[c])  for c in detected_crops)  if detected_crops  else False
            topic_match = any(any(kw in s_lower for kw in TOPIC_KEYWORDS[t]) for t in detected_topics) if detected_topics else False
            if crop_match or topic_match:
                relevant_sentences.append(sentence)
            else:
                general_sentences.append(sentence)

    def clean_and_dedup(s_list):
        seen, unique = set(), []
        for s in s_list:
            sc = re.sub(r"\s+", " ", s)
            if sc not in seen:
                seen.add(sc)
                unique.append(sc)
        return unique

    relevant_sentences = clean_and_dedup(relevant_sentences)[:8]
    general_sentences  = clean_and_dedup(general_sentences)[:4]
    references         = list(dict.fromkeys(references))[:4]

    # 4. Add RAG context if any
    if chunks:
        if relevant_sentences:
            output_parts.append("\n---\n## 📚 From Agricultural Knowledge Base\n")
            for sentence in relevant_sentences:
                output_parts.append(f"- {sentence.replace('..', '.').strip()}")
        elif general_sentences and not expert_answer:
            output_parts.append("## 📚 General Farming Guidelines\n")
            for sentence in general_sentences[:6]:
                output_parts.append(f"- {sentence.strip()}")

        if references:
            output_parts.append("\n---\n## 📑 Sources")
            for i, ref in enumerate(references, 1):
                output_parts.append(f"{i}. {ref}")

    # 5. If we have NOTHING useful, give a specific query-aware response
    if not output_parts:
        crop_name = detected_crops[0].title() if detected_crops else ""
        topic_name = detected_topics[0] if detected_topics else ""

        if crop_name and topic_name:
            output_parts.append(
                f"## 🌾 {crop_name} — {topic_name.title()} Guidance\n\n"
                f"I'm currently operating in offline mode and my knowledge base doesn't have specific information "
                f"about **{crop_name} {topic_name}** in my local documents.\n\n"
                f"### Immediate Steps\n"
                f"- 📞 Call your nearest **KVK (Krishi Vigyan Kendra)** for {crop_name} {topic_name} advice\n"
                f"- 🌐 Visit **icar.org.in** for official {crop_name} cultivation guidelines\n"
                f"- 📱 Check **Kisan Call Centre: 1800-180-1551** (toll-free, available in regional languages)\n\n"
                f"> Connect to the internet and retry — KrishiMitra AI will give a detailed, personalized answer."
            )
        else:
            output_parts.append(
                "## 🌾 Agricultural Query Assistance\n\n"
                "I'm currently in offline mode. Here are the best resources for your query:\n\n"
                "- 📞 **KVK Kisan Call Centre**: 1800-180-1551 (toll-free, all hours)\n"
                "- 🌐 **ICAR Website**: icar.org.in — crop-wise disease and management guides\n"
                "- 💰 **Market Prices**: agmarknet.gov.in\n"
                "- 🌦️ **Weather Advisory**: mausam.imd.gov.in\n\n"
                "> Please ensure the backend ML service is running and reconnect for AI-powered answers."
            )

    english_markdown = "\n".join(output_parts)

    if target_lang and target_lang.lower().strip() not in ("en", "english"):
        return translate_fallback_text(english_markdown, target_lang)

    return english_markdown
