"""
Unified LLM Service — Configurable LLM Priority (Gemini-First by default)

Priority chain (controlled by LLM_PRIMARY env var):
  Default (LLM_PRIMARY=gemini or unset when GEMINI_API_KEY exists):
    1. Gemini (fast cloud API, ~2s response)
    2. Ollama (offline fallback — works without internet)
  When LLM_PRIMARY=ollama:
    1. Ollama (local inference, no token limits)
    2. Gemini (cloud fallback if Ollama fails)
  3. Structured fallback (if both LLMs fail)

Provides: chat(), chat_stream(), vision(), health_check()
"""
import asyncio
import base64
import logging
import os
from typing import Optional, List, AsyncIterator
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()
load_dotenv(Path(__file__).resolve().parent.parent.parent / '.env')

logger = logging.getLogger("krishimitraai.unified_llm")

# Ollama configuration
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.1:8b")
OLLAMA_VISION_MODEL = os.getenv("OLLAMA_VISION_MODEL", "llava:7b")
OLLAMA_HOST = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")


class UnifiedLLMService:
    def __init__(self):
        self.ollama_available = False
        self.ollama_models = []
        self.gemini_client = None
        self.gemini_model = os.getenv("GEMINI_MODEL", "gemini-3.5-flash")

        # Initialize both backends
        self._init_ollama()
        self._init_gemini()

        # Determine priority: gemini-first by default when API key is available
        env_primary = os.getenv("LLM_PRIMARY", "").lower().strip()
        if env_primary == "ollama":
            self._primary = "ollama"
        elif env_primary == "gemini":
            self._primary = "gemini"
        else:
            # Auto-detect: prefer gemini if available (faster), ollama if offline
            self._primary = "gemini" if self.gemini_client else "ollama"
        logger.info("🧠 LLM priority: %s-first (configurable via LLM_PRIMARY env var)", self._primary)

    def _init_ollama(self):
        """Check if Ollama is running and discover available models."""
        try:
            import ollama
            client = ollama.Client(host=OLLAMA_HOST, timeout=0.5)
            models_res = client.list()
            self.ollama_models = [m.get("name", m.get("model", "")) for m in models_res.get("models", [])]
            if self.ollama_models:
                self.ollama_available = True
                logger.info("✅ Ollama ready with models: %s", ", ".join(self.ollama_models))
            else:
                logger.warning("⚠️ Ollama is running but no models found.")
        except Exception as e:
            self.ollama_available = False
            logger.info("ℹ️ Ollama offline: %s", e)

    def _init_gemini(self):
        """Initialize Gemini as optional fallback."""
        api_key = os.getenv("GEMINI_API_KEY")
        if api_key:
            try:
                from google import genai
                self.gemini_client = genai.Client(api_key=api_key)
                logger.info("✅ Gemini fallback configured (model: %s)", self.gemini_model)
            except Exception as e:
                logger.warning("⚠️ Gemini fallback not available: %s", e)
        else:
            logger.info("ℹ️ No GEMINI_API_KEY set — running in full offline mode (Ollama only)")

    def _select_ollama_model(self, preferred: str = None) -> Optional[str]:
        """Find the best matching Ollama model from available models."""
        target = preferred or OLLAMA_MODEL
        if not self.ollama_models:
            return None

        # Exact match
        if target in self.ollama_models:
            return target
        # With :latest suffix
        if f"{target}:latest" in self.ollama_models:
            return f"{target}:latest"
        # Partial match
        for m in self.ollama_models:
            if target in m or m in target:
                return m
        # Fallback to first available
        return self.ollama_models[0] if self.ollama_models else None

    def _select_vision_model(self) -> Optional[str]:
        """Find a vision-capable Ollama model."""
        vision_models = ["llava", "llava:7b", "llava:13b", "llava:latest",
                         "bakllava", "llava-phi3", "moondream"]
        for vm in vision_models:
            for m in self.ollama_models:
                if vm in m.lower():
                    return m
        return None

    async def _chat_ollama(self, system_prompt: str, full_message: str, temperature: float) -> str:
        """Try Ollama chat (async then sync fallback)."""
        model = self._select_ollama_model()
        if not model or not self.ollama_available:
            raise RuntimeError("Ollama not available")
        try:
            from ollama import AsyncClient
            ollama_timeout = float(os.getenv("OLLAMA_TIMEOUT", 90.0))
            client = AsyncClient(host=OLLAMA_HOST, timeout=ollama_timeout)
            res = await client.chat(
                model=model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": full_message}
                ],
                options={"temperature": temperature}
            )
            logger.info("✅ Ollama chat completed (model: %s, temperature: %.2f)", model, temperature)
            return res["message"]["content"]
        except Exception as e:
            logger.warning("Ollama async chat failed: %s", e)
            try:
                import ollama
                ollama_timeout = float(os.getenv("OLLAMA_TIMEOUT", 90.0))
                client = ollama.Client(host=OLLAMA_HOST, timeout=ollama_timeout)
                res = client.chat(
                    model=model,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": full_message}
                    ],
                    options={"temperature": temperature}
                )
                return res["message"]["content"]
            except Exception as e2:
                logger.warning("Ollama sync chat also failed: %s", e2)
                raise RuntimeError(f"Ollama chat failed: {e2}")

    async def _chat_gemini(self, system_prompt: str, full_message: str, temperature: float) -> str:
        """Try Gemini chat."""
        if not self.gemini_client:
            raise RuntimeError("Gemini not configured")
        from google.genai import types
        def _gemini_gen():
            config = types.GenerateContentConfig(
                system_instruction=system_prompt,
                temperature=temperature,
            )
            response = self.gemini_client.models.generate_content(
                model=self.gemini_model,
                contents=full_message,
                config=config
            )
            return response.text
        result = await asyncio.to_thread(_gemini_gen)
        logger.info("☁️ Gemini chat completed (temperature: %.2f)", temperature)
        return result

    async def chat(self, system_prompt: str, user_message: str,
                   context: Optional[List[str]] = None,
                   temperature: float = 0.25) -> str:
        """
        Send a chat query. Priority order determined by LLM_PRIMARY env var.
        Default: Gemini first (fast), Ollama fallback (offline).
        Accepts optional temperature for per-modality precision control.
        """
        context_str = "\n\n".join(context) if context else ""
        full_message = (f"Agricultural Reference Context (use this as primary evidence):\n{context_str}\n\n"
                        f"User Question:\n{user_message}") if context_str else user_message

        # Build ordered list of backends based on priority
        if self._primary == "ollama":
            backends = [("ollama", self._chat_ollama), ("gemini", self._chat_gemini)]
        else:
            backends = [("gemini", self._chat_gemini), ("ollama", self._chat_ollama)]

        last_error = None
        for name, fn in backends:
            try:
                return await fn(system_prompt, full_message, temperature)
            except Exception as e:
                logger.warning("%s chat failed: %s", name.capitalize(), e)
                last_error = e

        # No LLM available
        raise RuntimeError(f"No LLM available. Last error: {last_error}. "
                           "Ensure Ollama is running (ollama serve) or set GEMINI_API_KEY.")

    async def chat_stream(self, system_prompt: str, query: str,
                          history: Optional[List[dict]] = None,
                          context: Optional[List[str]] = None) -> AsyncIterator[str]:
        """
        Stream a chat response. Priority order determined by LLM_PRIMARY.
        """
        context_str = "\n\n".join(context) if context else ""
        full_message = (f"Agricultural Reference Context:\n{context_str}\n\n"
                        f"User Question:\n{query}") if context_str else query

        messages = []
        messages.append({"role": "system", "content": system_prompt})
        if history:
            for turn in history:
                if turn.get("role") == "system":
                    continue
                role = "assistant" if turn.get("role") in ("assistant", "model") else "user"
                messages.append({"role": role, "content": turn.get("content", "")})
        messages.append({"role": "user", "content": full_message})

        async def _stream_ollama():
            model = self._select_ollama_model()
            if not model:
                raise RuntimeError("No Ollama model available")
            from ollama import AsyncClient
            client = AsyncClient(host=OLLAMA_HOST)
            stream = await client.chat(model=model, messages=messages, stream=True)
            tokens = []
            async for chunk in stream:
                token = chunk.get("message", {}).get("content", "")
                if token:
                    tokens.append(token)
            logger.info("🦙 Ollama streaming completed (model: %s)", model)
            return tokens

        async def _stream_gemini():
            if not self.gemini_client:
                raise RuntimeError("Gemini not configured")
            from google.genai import types
            gemini_contents = []
            for msg in messages:
                if msg["role"] == "system":
                    continue
                role = "model" if msg["role"] in ("assistant", "model") else "user"
                gemini_contents.append(
                    types.Content(
                        role=role,
                        parts=[types.Part.from_text(text=msg["content"])]
                    )
                )
            config = types.GenerateContentConfig(
                system_instruction=system_prompt,
                temperature=0.2,
            )
            stream = await self.gemini_client.aio.models.generate_content_stream(
                model=self.gemini_model,
                contents=gemini_contents,
                config=config
            )
            tokens = []
            async for chunk in stream:
                if chunk.text:
                    tokens.append(chunk.text)
            logger.info("☁️ Gemini streaming completed")
            return tokens

        # Build ordered list of backends based on priority
        if self._primary == "ollama":
            backends = [("ollama", _stream_ollama), ("gemini", _stream_gemini)]
        else:
            backends = [("gemini", _stream_gemini), ("ollama", _stream_ollama)]

        for name, fn in backends:
            try:
                tokens = await fn()
                for token in tokens:
                    yield token
                return
            except Exception as e:
                logger.warning("%s streaming failed: %s", name.capitalize(), e)

        yield "⚠️ No LLM available. Please ensure Ollama is running (`ollama serve`) for offline use."

    async def _vision_ollama(self, system_prompt: str, image_b64: str, user_prompt: str) -> str:
        """Try Ollama LLaVA vision."""
        vision_model = self._select_vision_model()
        if not vision_model:
            raise RuntimeError("No Ollama vision model available")
        from ollama import AsyncClient
        client = AsyncClient(host=OLLAMA_HOST)
        full_prompt = f"{system_prompt}\n\n{user_prompt}"
        res = await client.chat(
            model=vision_model,
            messages=[{
                "role": "user",
                "content": full_prompt,
                "images": [image_b64]
            }]
        )
        logger.info("👁️ LLaVA vision completed (model: %s)", vision_model)
        return res["message"]["content"]

    async def _vision_gemini(self, system_prompt: str, image_b64: str, user_prompt: str,
                             mime_type: str, temperature: float) -> str:
        """Try Gemini vision."""
        if not self.gemini_client:
            raise RuntimeError("Gemini not configured")
        image_bytes = base64.b64decode(image_b64)
        from google.genai import types
        def _gemini_vision():
            config = types.GenerateContentConfig(
                system_instruction=system_prompt,
                temperature=temperature,
            )
            image_part = types.Part.from_bytes(data=image_bytes, mime_type=mime_type)
            text_part = types.Part.from_text(text=user_prompt)
            response = self.gemini_client.models.generate_content(
                model=self.gemini_model,
                contents=[image_part, text_part],
                config=config
            )
            return response.text
        result = await asyncio.to_thread(_gemini_vision)
        logger.info("☁️ Gemini vision completed (temperature: %.2f)", temperature)
        return result

    async def vision(self, system_prompt: str, image_b64: str,
                     mime_type: str = "image/jpeg",
                     user_prompt: str = "Analyze this leaf image.",
                     temperature: float = 0.1) -> str:
        """
        Analyze an image. Priority order determined by LLM_PRIMARY.
        Lower default temperature (0.1) for precise factual disease diagnosis.
        """
        # Build ordered list of backends based on priority
        if self._primary == "ollama":
            backends = [
                ("ollama", lambda: self._vision_ollama(system_prompt, image_b64, user_prompt)),
                ("gemini", lambda: self._vision_gemini(system_prompt, image_b64, user_prompt, mime_type, temperature)),
            ]
        else:
            backends = [
                ("gemini", lambda: self._vision_gemini(system_prompt, image_b64, user_prompt, mime_type, temperature)),
                ("ollama", lambda: self._vision_ollama(system_prompt, image_b64, user_prompt)),
            ]

        last_error = None
        for name, fn in backends:
            try:
                return await fn()
            except Exception as e:
                logger.warning("%s vision failed: %s", name.capitalize(), e)
                last_error = e

        raise RuntimeError(f"No vision model available. Last error: {last_error}. "
                           "Install LLaVA: ollama pull llava:7b or set GEMINI_API_KEY.")

    async def analyze_image(self, image_b64: str, user_prompt: str = "Analyze this leaf image.",
                            system_prompt: str = "You are a crop pathology system.",
                            mime_type: str = "image/jpeg",
                            temperature: float = 0.1) -> str:
        """Alias for vision() for backward compatibility. Low temperature for accurate diagnosis."""
        return await self.vision(system_prompt=system_prompt, image_b64=image_b64,
                                 mime_type=mime_type, user_prompt=user_prompt, temperature=temperature)

    def health_check(self) -> dict:
        """Check availability of all LLM backends (non-blocking fast check)."""
        status = {
            "ollama": {"available": self.ollama_available, "models": self.ollama_models},
            "gemini": {"available": bool(self.gemini_client)},
            "primary": self._primary
        }
        return status

    def refresh_models(self):
        """Re-scan Ollama for newly pulled models."""
        self._init_ollama()


# Singleton instance
unified_llm_service = UnifiedLLMService()
unified_llm = unified_llm_service
