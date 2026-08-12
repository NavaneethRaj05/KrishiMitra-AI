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
import os
import tempfile

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

        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            tmp_path = tmp.name

        try:
            # XTTS-v2 requires speaker or speaker_wav.
            # If the model has built-in speakers, pick one (e.g. "Ana Florence" or first available).
            speaker_name = None
            if hasattr(model, "speakers") and model.speakers:
                if "Ana Florence" in model.speakers:
                    speaker_name = "Ana Florence"
                else:
                    speaker_name = model.speakers[0]

            if speaker_name:
                model.tts_to_file(
                    text=text_trimmed,
                    language=tts_lang,
                    file_path=tmp_path,
                    speaker=speaker_name,
                )
            else:
                model.tts_to_file(
                    text=text_trimmed,
                    language=tts_lang,
                    file_path=tmp_path,
                    speaker_wav=None,
                )
            with open(tmp_path, "rb") as f:
                audio_bytes = f.read()
        finally:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)

        return base64.b64encode(audio_bytes).decode("utf-8")

    def is_available(self) -> bool:
        """Check if TTS model is installed and already downloaded locally."""
        try:
            from TTS.api import TTS  # checks if library is installed
            import os
            from pathlib import Path
            
            # Determine local tts path
            tts_home = os.environ.get("TTS_HOME")
            if not tts_home:
                xdg_data = os.environ.get("XDG_DATA_HOME")
                if xdg_data:
                    tts_home = os.path.join(xdg_data, "tts")
                else:
                    if os.name == "nt":
                        local_appdata = os.environ.get("LOCALAPPDATA")
                        if local_appdata:
                            tts_home = os.path.join(local_appdata, "tts")
                        else:
                            tts_home = os.path.expanduser("~/AppData/Local/tts")
                    else:
                        tts_home = os.path.expanduser("~/.local/share/tts")
            
            # The model subfolder is named by replacing "/" with "--"
            model_dir_name = MODEL_NAME.replace("/", "--")
            model_path = Path(tts_home) / model_dir_name
            
            # Check if config.json exists in the directory (indicating download is complete)
            config_file = model_path / "config.json"
            return config_file.exists()
        except Exception:
            return False


tts_service = TTSService()
