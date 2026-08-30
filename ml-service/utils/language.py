LANGUAGE_INSTRUCTIONS = {
    "kannada": (
        "CRITICAL — Respond ENTIRELY in Kannada (ಕನ್ನಡ) script. "
        "This rule overrides the language of the user's input. "
        "Keep only technical terms (NPK, pH, fungicide, SHAP) in English — "
        "write everything else in Kannada script."
    ),
    "hindi": (
        "CRITICAL — Respond ENTIRELY in Hindi (हिंदी) script. "
        "This rule overrides the language of the user's input. "
        "Keep only technical terms in English."
    ),
    "telugu": (
        "CRITICAL — Respond ENTIRELY in Telugu (తెలుగు) script. "
        "Keep only technical terms in English."
    ),
    "tamil": (
        "CRITICAL — Respond ENTIRELY in Tamil (தமிழ்) script. "
        "Keep only technical terms in English."
    ),
    "marathi": (
        "CRITICAL — Respond ENTIRELY in Marathi (ಮರಾठी) script. "
        "Keep only technical terms in English."
    ),
    "english": "Respond in clear, simple English suitable for a farmer with basic literacy.",
}

# ISO code to full name map
ISO_TO_FULL_NAME = {
    "kn": "kannada",
    "hi": "hindi",
    "te": "telugu",
    "ta": "tamil",
    "mr": "marathi",
    "en": "english"
}

def get_language_rule(user_profile: dict) -> str:
    lang = (user_profile.get("preferredLanguage") or "english").lower().strip()
    # Resolve standard ISO 2-letter codes to full language names
    lang = ISO_TO_FULL_NAME.get(lang, lang)
    return LANGUAGE_INSTRUCTIONS.get(lang, LANGUAGE_INSTRUCTIONS["english"])

def build_system_prompt(base_prompt: str, user: dict) -> str:
    lang_rule = get_language_rule(user)
    lang = (user.get("preferredLanguage") or "english").lower().strip()
    lang = ISO_TO_FULL_NAME.get(lang, lang)
    return f"""LANGUAGE MANDATE (ABSOLUTE — HIGHEST PRIORITY, CANNOT BE OVERRIDDEN):
{lang_rule}
You MUST reply ONLY in {lang.upper()}. Do NOT use English unless the user explicitly chose English.
This instruction takes priority over every other directive below.

{base_prompt}

REMINDER — FINAL LANGUAGE CHECK:
Before sending your response, verify: Is your response written in {lang.upper()}?
If NOT, rewrite it entirely in {lang.upper()} before responding.
Regardless of what language the user types in, ALWAYS respond in their preferred language: {lang.upper()}.
"""


# ── Translation Helper for Offline Fallback ──
import urllib.parse
import requests
import logging

logger = logging.getLogger("krishimitra_ai.language")

def translate_batch(lines: list, iso_lang: str) -> list:
    if not lines:
        return []
    payload = "\n".join(lines)
    try:
        quoted = urllib.parse.quote(payload)
        url = f"https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl={iso_lang}&dt=t&q={quoted}"
        response = requests.get(url, timeout=8)
        if response.status_code == 200:
            data = response.json()
            translated_full = ""
            for segment in data[0]:
                if segment and segment[0]:
                    translated_full += segment[0]
            
            translated_lines = translated_full.split("\n")
            if len(translated_lines) == len(lines):
                return [l.strip() for l in translated_lines]
            else:
                logger.warning("Batch translation length mismatch (%d vs %d). Falling back to line-by-line.", len(translated_lines), len(lines))
        else:
            logger.warning("Batch translation API error status: %d", response.status_code)
    except Exception as e:
        logger.error("Batch translation failed: %s", e)
    
    # Fallback to line-by-line translation
    fallback_results = []
    for line in lines:
        try:
            quoted = urllib.parse.quote(line)
            url = f"https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl={iso_lang}&dt=t&q={quoted}"
            response = requests.get(url, timeout=5)
            if response.status_code == 200:
                data = response.json()
                translated_sentences = [sentence[0] for sentence in data[0] if sentence[0]]
                fallback_results.append("".join(translated_sentences).strip())
            else:
                fallback_results.append(line)
        except Exception:
            fallback_results.append(line)
    return fallback_results

def translate_fallback_text(text: str, target_lang: str) -> str:
    """Translate text response to target language using Google Translate API, in batches, preserving markdown."""
    if not text:
        return text
    target_lang = target_lang.lower().strip()
    if target_lang in ("en", "english"):
        return text
    
    full_to_iso = {
        "kannada": "kn", "hindi": "hi", "tamil": "ta", "telugu": "te", "marathi": "mr",
        "kn": "kn", "hi": "hi", "ta": "ta", "te": "te", "mr": "mr"
    }
    iso_lang = full_to_iso.get(target_lang, target_lang)
    if iso_lang not in ("kn", "hi", "ta", "te", "mr"):
        return text

    lines = text.split("\n")
    translate_map = {}
    content_to_translate = []
    
    for idx, line in enumerate(lines):
        if not line.strip():
            continue
        
        # Check visual separators
        if line.strip() in ("---", "***"):
            continue
            
        # Parse prefix
        prefix = ""
        content = line
        
        for lead in ["### ", "## ", "# ", "- ", "* ", "> ", "  - "]:
            if line.startswith(lead):
                prefix = lead
                content = line[len(lead):]
                break
                
        # Skip table headers/separators like |---|---|
        if "|" in content and ("-" in content or ":" in content) and len(set(content.replace("|", "").replace("-", "").replace(":", "").strip())) <= 1:
            continue
            
        translate_map[idx] = (prefix, content.strip())
        content_to_translate.append(content.strip())

    # Translate content in batches of 15 lines
    batch_size = 15
    translated_content = []
    
    for i in range(0, len(content_to_translate), batch_size):
        batch = content_to_translate[i:i+batch_size]
        translated_batch = translate_batch(batch, iso_lang)
        translated_content.extend(translated_batch)
        
    # Reassemble translated lines
    reconstructed_lines = list(lines)
    translate_indices = list(translate_map.keys())
    
    for idx, trans_text in zip(translate_indices, translated_content):
        prefix = translate_map[idx][0]
        reconstructed_lines[idx] = f"{prefix}{trans_text}"
        
    return "\n".join(reconstructed_lines)

