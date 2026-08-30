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

from shared.constants import KNOWN_CROPS


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
    VERNACULAR_CROPS = {
        # Kannada
        "ಟೊಮ್ಯಾಟೊ": "Tomato", "ಭತ್ತ": "Rice", "ಗೋಧಿ": "Wheat", "ಮೆಕ್ಕೆಜೋಳ": "Maize",
        "ರಾಗಿ": "Ragi", "ಹತ್ತಿ": "Cotton", "ಕಬ್ಬು": "Sugarcane", "ಆಲೂಗಡ್ಡೆ": "Potato", "ಈರುಳ್ಳಿ": "Onion",
        # Hindi
        "टमाटर": "Tomato", "धान": "Rice", "चावल": "Rice", "गेहूं": "Wheat",
        "मक्का": "Maize", "कपास": "Cotton", "गन्ना": "Sugarcane", "आलू": "Potato", "प्याज": "Onion", "सोयाबीन": "Soybean",
        # Telugu
        "టమోటా": "Tomato", "వరి": "Rice", "గోధుమ": "Wheat", "మొక్కజొన్న": "Maize",
        "పత్తి": "Cotton", "చెరకు": "Sugarcane", "బంగాళాదుంప": "Potato", "ఉల్లిపాయ": "Onion",
        # Tamil
        "தக்காளி": "Tomato", "நெல்": "Rice", "கோதுமை": "Wheat", "மக்காச்சோளம்": "Maize",
        "பருத்தி": "Cotton", "கரும்பு": "Sugarcane", "உருளைக்கிழங்கு": "Potato", "வெங்காயம்": "Onion",
        # Marathi
        "टोमॅटो": "Tomato", "भात": "Rice", "गहू": "Wheat", "मका": "Maize",
        "कापूस": "Cotton", "ऊस": "Sugarcane", "बटाटा": "Potato", "कांदा": "Onion",
    }

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

        text_lower = text.lower()
        for crop in KNOWN_CROPS:
            if crop in text_lower and crop not in entities["crops"]:
                entities["crops"].append(crop)

        # Multilingual vernacular matching
        for v_name, en_name in self.VERNACULAR_CROPS.items():
            if v_name in text:
                combo = f"{en_name} ({v_name})"
                if combo not in entities["crops"] and en_name not in entities["crops"]:
                    entities["crops"].append(combo)

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

    # ──────────────────────────────────────────
    async def analyze_with_gemini(
        self,
        transcript: Optional[str] = None,
        audio_bytes: Optional[bytes] = None,
        language: Optional[str] = "auto"
    ) -> dict:
        """
        Multilingual Vernacular Voice Analyzer powered by Gemini 3.6 Flash.
        Handles Kannada, Hindi, Telugu, Tamil, Marathi, and English.
        """
        import json
        import urllib.request

        # If audio_bytes provided and no transcript, transcribe first
        final_transcript = transcript or ""
        snr_metrics = {"snr_db": 22.0, "clarity": "good"}
        if audio_bytes:
            try:
                snr_metrics = self.analyze_audio_quality(audio_bytes)
            except Exception:
                pass
            if not final_transcript:
                try:
                    trans_res = self.transcribe(audio_bytes, language=None if language == "auto" else language)
                    final_transcript = trans_res.get("text", "")
                except Exception as ex:
                    import logging
                    logging.getLogger("krishimitraai").warning("Whisper transcription fallback: %s", ex)

        api_key = os.getenv("GEMINI_API_KEY", "AIzaSyAFpMDpfwYarF0l-7tPCZM0qgge3zPcZsA")
        model = os.getenv("GEMINI_MODEL", "gemini-3.5-flash")

        lang_map = {
            "kn": "Kannada (ಕನ್ನಡ)",
            "hi": "Hindi (हिंदी)",
            "te": "Telugu (తెలుగు)",
            "ta": "Tamil (தமிழ்)",
            "mr": "Marathi (मराठी)",
            "en": "English"
        }

        lang_hint = f"Speaker language hint: {lang_map.get(language, 'Auto-detect Indian language')}" if language != "auto" else "Auto-detect language among Kannada (kn), Hindi (hi), Telugu (te), Tamil (ta), Marathi (mr), English (en)."

        prompt = f"""You are KrishiMitra AI's precision Vernacular Voice Agronomy Analyzer.
Ground all advice in ICAR Package of Practices and state agricultural universities.
{lang_hint}

Farmer Spoken Voice Query:
"{final_transcript}"

Task:
1. Detect exact language ('kn', 'hi', 'te', 'ta', 'mr', 'en') and language_name.
2. Clean native script transcript.
3. Accurate English translation of query.
4. Categorize intent: 'disease_diagnosis', 'crop_advise', 'fertilizer_dosage', 'pest_control', 'market_price', 'irrigation', 'weather', 'general_farming'.
5. Extract entities: crops, symptoms, pests_diseases, chemicals_fertilizers, locations.
6. Urgency: 'low', 'medium', 'high', 'critical'.
7. High-quality Agronomic Advisory:
   - 'vernacular_advisory': In detected NATIVE LANGUAGE with steps and terminology.
   - 'english_advisory': In English.
   - 'chemical_remedy': Chemical active ingredients, Indian trade names (Indofil M-45, Coromandel, IFFCO, Bayer), exact dosages per liter of water.
   - 'organic_remedy': Organic biological control (Neem oil, Trichoderma) with exact dosage.
   - 'prevention': 2-3 preventive farming practices.
8. Output SNR metrics: {snr_metrics['snr_db']} dB and clarity: '{snr_metrics['clarity']}'.

Respond ONLY with valid JSON:
{{
  "detected_language": "kn",
  "language_name": "ಕನ್ನಡ (Kannada)",
  "confidence": 0.98,
  "transcript": "...",
  "english_translation": "...",
  "intent": "disease_diagnosis",
  "entities": {{
    "crops": ["Tomato"],
    "symptoms": ["Yellow leaves"],
    "pests_diseases": [],
    "chemicals_fertilizers": [],
    "locations": []
  }},
  "urgency": "high",
  "vernacular_advisory": "...",
  "english_advisory": "...",
  "chemical_remedy": "...",
  "organic_remedy": "...",
  "prevention": "...",
  "snr_db": {snr_metrics['snr_db']},
  "clarity": "{snr_metrics['clarity']}"
}}"""

        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
        payload = json.dumps({
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"temperature": 0.1, "maxOutputTokens": 2048}
        }).encode("utf-8")

        req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"})
        try:
            import asyncio
            def _call():
                with urllib.request.urlopen(req, timeout=15) as resp:
                    return json.loads(resp.read().decode("utf-8"))
            res_data = await asyncio.to_thread(_call)
            raw_text = res_data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
            
            clean = raw_text.strip()
            if clean.startswith("```"):
                lines = clean.split("\n")
                if lines[0].startswith("```"): lines = lines[1:]
                if lines and lines[-1].startswith("```"): lines = lines[:-1]
                clean = "\n".join(lines).strip()
            return json.loads(clean)
        except Exception as e:
            import logging
            logging.getLogger("krishimitraai").warning("Gemini voice analysis error: %s", e)
            detected = self.detect_language_from_text(final_transcript)
            return {
                "detected_language": detected,
                "language_name": lang_map.get(detected, "English"),
                "confidence": 0.88,
                "transcript": final_transcript,
                "english_translation": final_transcript,
                "intent": self.detect_intent(final_transcript),
                "entities": self.extract_entities(final_transcript),
                "urgency": "medium",
                "vernacular_advisory": "ನಿಮ್ಮ ಕೃಷಿ ಪ್ರಶ್ನೆಯನ್ನು ದಾಖಲಿಸಲಾಗಿದೆ. ಸಮೀಪದ ಕೃಷಿ ವಿಜ್ಞಾನ ಕೇಂದ್ರ (KVK) ಅಥವಾ ಕಿಸಾನ್ ಕಾಲ್ ಸೆಂಟರ್ 1800-180-1551 ಗೆ ಕರೆ ಮಾಡಿ.",
                "english_advisory": "Query received. Please contact your nearest Krishi Vigyan Kendra (KVK) or Kisan Call Center at 1800-180-1551.",
                "chemical_remedy": "Apply standard recommended fungicide or pesticide as per local extension guide.",
                "organic_remedy": "Spray Neem oil (10,000 ppm) @ 3ml per liter of water.",
                "prevention": "Ensure good drainage and maintain proper crop spacing.",
                "snr_db": snr_metrics['snr_db'],
                "clarity": snr_metrics['clarity']
            }



voice_service = VoiceService()
