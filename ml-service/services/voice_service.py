"""
Voice NLP Service
1. Whisper ASR  — transcribe audio (offline, multilingual)
2. spaCy NER    — extract agricultural entities
3. Intent detection — route to correct module
"""
import os
import io
import tempfile
from typing import Any, Optional
import numpy as np

import spacy
import whisper

INTENTS = {
    "disease":     ["disease", "spot", "yellow", "wilt", "blight", "fungus", "dying", "rogi", "byadhi"],
    "crop_advise": ["grow", "plant", "crop", "soil", "recommend", "beku", "ugadu", "khai"],
    "weather":     ["rain", "weather", "forecast", "mausam", "maleya"],
    "market":      ["price", "sell", "mandi", "bazar", "rate", "belay"],
    "irrigation":  ["water", "irrigate", "neer", "neeru", "paani"],
    "fertilizer":  ["fertilizer", "urea", "nutrient", "gobe", "khad"],
}

KNOWN_CROPS = [
    # English names
    "rice", "paddy", "wheat", "corn", "maize", "tomato", "potato", "onion", "garlic", "pepper",
    "cotton", "soybean", "sugarcane", "banana", "mango", "coffee", "tea", "groundnut",
    "sunflower", "mustard", "chickpea", "lentil", "pea", "ragi", "bajra", "jowar",
    "sorghum", "barley", "oats", "eggplant", "brinjal", "cucumber", "pumpkin",
    "okra", "cabbage", "cauliflower", "carrot", "spinach", "lettuce", "strawberry",
    "grapes", "apple", "orange", "pomegranate", "guava", "papaya", "watermelon",
    "ginger", "turmeric", "chilli", "coriander", "cumin", "cardamom", "rubber",
    "coconut", "jute", "tobacco",

    # Hindi (hi) regional names
    "आम", "टमाटर", "धान", "चावल", "कपास", "मक्का", "भुट्टा", "गेहूं", "केला", "आलू", "नारियल", "बैंगन", "मिर्च",
    "tamatar", "gehun", "chawal", "makka", "aloo", "nariyal", "aam", "kela", "kapas",

    # Kannada (kn) regional names
    "ಮಾವು", "ಮಾವಿನಕಾಯಿ", "ಟೊಮೆಟೊ", "ಭತ್ತ", "ಅಕ್ಕಿ", "ಹತ್ತಿ", "ಮೆಕ್ಕೆಜೋಳ", "ಗೋಧಿ", "ಬಾಳೆಹಣ್ಣು", "ಬಾಳೆ", "ಆಲೂಗಡ್ಡೆ", "ತೆಂಗಿನಕಾಯಿ", "ಕೊಬ್ಬರಿ", "ಬದನೆಕಾಯಿ", "ಮೆಣಸಿನಕಾಯಿ",
    "maavu", "maavinakaayi", "bhatta", "akki", "hatti", "mekkejola", "godhi", "balehannu", "aloogadde", "tenginakayi",

    # Telugu (te) regional names
    "మామిడి", "టమోటా", "టమాటా", "వరి", "బియ్యం", "ప్రత్తి", "పత్తి", "మొక్కజొన్న", "గోధుమ", "అరటి", "బంగాళాదుంప", "కొబ్బరికాయ", "వంకায়", "మిరపకಾಯ",
    "mamidi", "vari", "biyyam", "patti", "pratti", "mokkajonna", "godhuma", "arati", "bangaladumpa",

    # Tamil (ta) regional names
    "மா", "மாம்பழம்", "தக்காளி", "நெல்", "அரிசி", "பருத்தி", "சோளம்", "கோதுமை", "வாழை", "வாழைப்பழம்", "உருளைக்கிழங்கு", "தேங்காய்", "கத்தரிக்காய்", "மிளகாய்",
    "maa", "maambazham", "thakkali", "nel", "arisi", "paruthi", "cholam", "gothumai", "urulaikilangu",

    # Marathi (mr) regional names
    "आंबा", "टोमॅटो", "भात", "तांदूळ", "कापूस", "मका", "गहू", "केळी", "बटाटा", "नारळ", "वांगी", "मिरची",
    "amba", "bhat", "tandul", "kapus", "maka", "gahu", "keli", "batata", "naral"
]


class VoiceService:
    def __init__(self):
        self.whisper_model = None
        self._whisper_loaded = False
        self.nlp = None
        self._nlp_loaded = False

    def _ensure_whisper(self):
        if self._whisper_loaded: return
        self._whisper_loaded = True
        try:
            import whisper
            # Configurable via WHISPER_MODEL env var.
            # 'base' works offline but misses agricultural terms (Mancozeb, Alternaria, etc.)
            # Set WHISPER_MODEL=small or WHISPER_MODEL=medium in .env for better accuracy
            # with Indian language dialects and crop-specific vocabulary.
            model_size = os.getenv("WHISPER_MODEL", "base")
            self.whisper_model = whisper.load_model(model_size)
            import logging
            logging.getLogger("krishimitraai").info("✅ Whisper model loaded: %s", model_size)
        except Exception as e:
            import logging
            logging.getLogger("krishimitraai").warning("⚠️  Whisper failed to load: %s", e)

    def _ensure_nlp(self):
        if self._nlp_loaded: return
        self._nlp_loaded = True
        try:
            import spacy
            self.nlp = spacy.load("en_core_web_sm")
        except OSError:
            self.nlp = None

    # ──────────────────────────────────────────
    def transcribe(self, audio_bytes: bytes, language: Optional[str] = None) -> dict:
        """Transcribe audio to text using Whisper."""
        self._ensure_whisper()
        if self.whisper_model is None:
            raise RuntimeError("Whisper model not loaded. Check installation.")

        # Detect audio container format from magic bytes
        suffix = ".webm"
        if audio_bytes.startswith(b"RIFF"):
            suffix = ".wav"
        elif audio_bytes.startswith(b"OggS"):
            suffix = ".ogg"
        elif audio_bytes.startswith(b"ID3") or audio_bytes[:2] in (b"\xff\xfb", b"\xff\xf3", b"\xff\xf2"):
            suffix = ".mp3"
        elif audio_bytes.startswith(b"fLaC"):
            suffix = ".flac"
        elif audio_bytes.startswith(b"\x1a\x45\xdf\xa3"):
            suffix = ".webm"

        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as f:
            f.write(audio_bytes)
            tmp_path = f.name

        try:
            opts: dict[str, Any] = {"task": "transcribe"}
            if language:
                full_to_iso = {
                    "kannada": "kn", "hindi": "hi", "tamil": "ta", "telugu": "te", "marathi": "mr",
                    "english": "en", "kn": "kn", "hi": "hi", "ta": "ta", "te": "te", "mr": "mr", "en": "en"
                }
                iso_lang = full_to_iso.get(language.lower().strip(), None)
                if iso_lang:
                    opts["language"] = iso_lang

            result: Any = self.whisper_model.transcribe(tmp_path, **opts)
        finally:
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)

        return {
            "text":     result["text"].strip(),
            "language": result.get("language", "en"),
            "segments": result.get("segments", []),
        }

    # ──────────────────────────────────────────
    async def stream_transcribe_chunk(self, audio_bytes: bytes, context: str = "", language: str = "en") -> dict:
        """Process streaming chunks with Whisper."""
        self._ensure_whisper()
        if self.whisper_model is None:
            return {"partial": "Whisper offline", "is_final": False, "confidence": 0.0}
        
        suffix = ".wav"
        if audio_bytes.startswith(b"\x1a\x45\xdf\xa3"):
            suffix = ".webm"
        elif audio_bytes.startswith(b"OggS"):
            suffix = ".ogg"

        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as f:
            f.write(audio_bytes)
            tmp_path = f.name

        try:
            opts: dict[str, Any] = {"task": "transcribe", "language": language}
            if context:
                opts["initial_prompt"] = context
            result: Any = self.whisper_model.transcribe(tmp_path, **opts)
            text = result["text"].strip()
            
            # Accurate confidence calculation based on Whisper token probabilities & no_speech_prob
            confidence = 0.85
            if result.get("segments"):
                avg_probs = []
                for seg in result["segments"]:
                    no_speech = seg.get("no_speech_prob", 0.0)
                    logprob = seg.get("avg_logprob", -0.5)
                    prob = max(0.0, min(1.0, float(np.exp(logprob))))
                    if no_speech > 0.6:
                        prob *= (1.0 - no_speech)
                    avg_probs.append(prob)
                if avg_probs:
                    confidence = round(sum(avg_probs) / len(avg_probs), 2)
            
            return {
                "partial": text,
                "is_final": False,
                "confidence": confidence
            }
        except Exception:
            return {"partial": "", "is_final": False, "confidence": 0.0}
        finally:
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)

    def analyze_audio_quality(self, audio_bytes: bytes) -> dict:
        """Use librosa/numpy to compute signal-to-noise ratio (SNR)."""
        try:
            import librosa  # type: ignore
            # Try to load audio bytes
            y, sr = librosa.load(io.BytesIO(audio_bytes))
            noise_floor = np.percentile(np.abs(y), 10)
            signal_level = np.percentile(np.abs(y), 90)
            snr = 20 * np.log10(signal_level / (noise_floor + 1e-8))
            return {
                "snr_db": round(snr, 1), 
                "clarity": "good" if snr > 15 else "fair" if snr > 8 else "poor"
            }
        except Exception:
            # Fallback numpy raw byte evaluation
            try:
                samples = np.frombuffer(audio_bytes, dtype=np.int16)
                if len(samples) > 0:
                    abs_samples = np.abs(samples)
                    noise_floor = np.percentile(abs_samples, 10)
                    signal_level = np.percentile(abs_samples, 90)
                    snr = 20 * np.log10(signal_level / (noise_floor + 1e-8))
                    return {
                        "snr_db": round(snr, 1),
                        "clarity": "good" if snr > 15 else "fair" if snr > 8 else "poor"
                    }
            except Exception:
                pass
        
        return {"snr_db": 15.0, "clarity": "good"}

    def detect_intent(self, text: str) -> str:
        try:
            from services.intent_service import intent_service
            res = intent_service.classify(text)
            # Map search_pipeline intents to voice_service intents
            mapping = {
                "disease_diagnosis": "disease",
                "pest_control": "disease",
                "crop_selection": "crop_advise",
                "soil_analysis": "crop_advise",
                "weather_query": "weather",
                "market_query": "market",
                "government_scheme": "general",
                "irrigation_query": "irrigation",
                "fertilizer_query": "fertilizer",
                "general_farming": "general"
            }
            return mapping.get(res.intent, "general")
        except Exception:
            text_lower = text.lower()
            scores = {
                intent: sum(1 for kw in keywords if kw in text_lower)
                for intent, keywords in INTENTS.items()
            }
            best = max(scores, key=lambda k: scores[k])
            return best if scores[best] > 0 else "general"

    # ──────────────────────────────────────────
    def extract_entities(self, text: str) -> dict:
        entities: dict = {"crops": [], "locations": [], "symptoms": [], "quantities": []}

        self._ensure_nlp()
        if self.nlp:
            doc = self.nlp(text)
            for ent in doc.ents:
                if ent.label_ in ("GPE", "LOC"):
                    entities["locations"].append(ent.text)
                elif ent.label_ in ("QUANTITY", "CARDINAL"):
                    entities["quantities"].append(ent.text)

        for crop in KNOWN_CROPS:
            if crop in text.lower() and crop not in entities["crops"]:
                entities["crops"].append(crop)

        return entities

    # ──────────────────────────────────────────
    def detect_language_from_text(self, text: str) -> str:
        """
        Fallback Unicode script detection.
        Kannada range: U+0C80 to U+0CFF
        Devanagari range: U+0900 to U+097F (used for Hindi & Marathi)
        Tamil range: U+0B80 to U+0BFF
        Telugu range: U+0C00 to U+0C7F
        """
        if not text:
            return "en"
        
        kannada_chars = 0
        devanagari_chars = 0
        tamil_chars = 0
        telugu_chars = 0
        
        for char in text:
            cp = ord(char)
            if 0x0C80 <= cp <= 0x0CFF:
                kannada_chars += 1
            elif 0x0900 <= cp <= 0x097F:
                devanagari_chars += 1
            elif 0x0B80 <= cp <= 0x0BFF:
                tamil_chars += 1
            elif 0x0C00 <= cp <= 0x0C7F:
                telugu_chars += 1
                
        counts = {
            "kn": kannada_chars,
            "hi": devanagari_chars,
            "ta": tamil_chars,
            "te": telugu_chars,
            "mr": 0
        }
        
        # If Devanagari is dominant, distinguish between Hindi (hi) and Marathi (mr)
        if devanagari_chars > 0 and devanagari_chars >= max(kannada_chars, tamil_chars, telugu_chars):
            marathi_indicators = ["ळ", "आहे", "आहेत", "नाही", "साठी", "मध्ये", "झाले", "करून", "करू", "करतात", "पण", "आम्ही", "तुम्ही", "कशी", "करावी", "लागवड", "कसे", "का", "करणे", "माहिती", "कृषी"]
            hindi_indicators = ["है", "हैं", "नहीं", "के लिए", "में", "हुआ", "करके", "करते", "करना", "लेकिन", "हम", "तुम", "कैसे", "करना", "खेती", "जानकारी", "कृषि"]
            
            marathi_score = sum(3 for char in text if char == "ळ")
            marathi_score += sum(2 for word in marathi_indicators if word in text)
            hindi_score = sum(2 for word in hindi_indicators if word in text)
            
            if marathi_score > hindi_score:
                counts["mr"] = devanagari_chars
                counts["hi"] = 0
            else:
                counts["hi"] = devanagari_chars
                counts["mr"] = 0

        best_lang = max(counts, key=counts.get)
        if counts[best_lang] > 0:
            return best_lang
            
        return "en"

    # ──────────────────────────────────────────
    def process_voice_query(self, audio_bytes: bytes, language: Optional[str] = None) -> dict:
        """Full pipeline: audio → transcription → intent → entities → route."""
        transcription = self.transcribe(audio_bytes, language)
        text          = transcription["text"]
        intent        = self.detect_intent(text)
        entities      = self.extract_entities(text)

        return {
            "transcription": transcription,
            "intent":        intent,
            "entities":      entities,
            "route_to":      intent,
            "display_text":  text,
        }


voice_service = VoiceService()
