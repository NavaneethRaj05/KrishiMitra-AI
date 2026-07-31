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

logger = logging.getLogger("krishimind.language")

def translate_fallback_text(text: str, target_lang: str) -> str:
    """Translate text response to target language using Google Translate API, chunk by chunk, preserving markdown."""
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

    # Split lines to translate independently
    lines = text.split("\n")
    translated_lines = []
    
    for line in lines:
        if not line.strip():
            translated_lines.append(line)
            continue
        
        # Preserve markdown prefixes
        prefix = ""
        content = line
        
        # Check standard markdown patterns
        for lead in ["### ", "## ", "# ", "- ", "* ", "> ", "  - "]:
            if line.startswith(lead):
                prefix = lead
                content = line[len(lead):]
                break
        
        # Skip translation for visual dividers
        if content.strip() == "---" or content.strip() == "***":
            translated_lines.append(line)
            continue
            
        try:
            quoted = urllib.parse.quote(content.strip())
            url = f"https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl={iso_lang}&dt=t&q={quoted}"
            response = requests.get(url, timeout=5)
            if response.status_code == 200:
                data = response.json()
                translated_sentences = [sentence[0] for sentence in data[0] if sentence[0]]
                translated_content = "".join(translated_sentences)
                # Re-add prefix and maintain trailing/leading spaces
                translated_lines.append(f"{prefix}{translated_content}")
            else:
                translated_lines.append(line)
        except Exception as e:
            logger.error("Auto-translation of line failed: %s", e)
            translated_lines.append(line)
            
    return "\n".join(translated_lines)

