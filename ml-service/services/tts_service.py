"""
Text-to-Speech using Coqui TTS.
Converts AI response text to audio in regional Indian languages.
Supported: English, Hindi, Kannada, Tamil, Telugu (via XTTS-v2 multilingual model)

The model is lazy-loaded on first use (~2GB download).
Subsequent calls are fast (in-memory inference).
"""
import base64
import io
import logging

logger = logging.getLogger("krishimitraai.tts")

# XTTS-v2 is a multilingual neural TTS model supporting Indian languages
MODEL_NAME = "tts_models/multilingual/multi-dataset/xtts_v2"

# Language code mapping — XTTS-v2 language identifiers
LANG_MAP = {
    "en": "en",
    "hi": "hi",
    "kn": "kn",
    "ta": "ta",
    "te": "te",
    "mr": "mr",
}


class TTSService:
    def __init__(self):
        self._model = None  # lazy load — 2GB model, only load when first needed

    def _get_model(self):
        if self._model is None:
            try:
                from TTS.api import TTS  # type: ignore # noqa: import inside method for lazy loading
                logger.info("Loading XTTS-v2 TTS model (first-time download may take a few minutes)...")
                self._model = TTS(MODEL_NAME, progress_bar=False)
                logger.info("✅ TTS model loaded")
            except Exception as e:
                logger.error("Failed to load TTS model: %s", e)
                raise
        return self._model

    def synthesise(self, text: str, language: str = "en") -> str:
        """
        Convert text to speech.
        Returns base64-encoded WAV audio string.

        Args:
            text:     Input text (capped at 500 chars for speed)
            language: ISO 639-1 code — "en", "hi", "kn", "ta", "te"

        Returns:
            base64-encoded WAV audio string
        """
        tts_lang = LANG_MAP.get(language, "en")
        text_trimmed = text[:500].strip()  # cap for inference speed

        model = self._get_model()
        buf   = io.BytesIO()

        model.tts_to_file(
            text=text_trimmed,
            language=tts_lang,
            file_path=buf,
            speaker_wav=None,   # use default XTTS voice
        )
        buf.seek(0)
        return base64.b64encode(buf.read()).decode("utf-8")

    def is_available(self) -> bool:
        """Check if TTS model can be loaded (non-blocking probe)."""
        try:
            from TTS.api import TTS  # type: ignore # noqa
            return True
        except Exception:
            return False


tts_service = TTSService()
