"""
Unified LLM Service — Ollama-First with Optional Gemini Fallback

Priority chain:
  1. Ollama (always tried first — works offline, no token limits)
  2. Gemini (only if GEMINI_API_KEY exists AND Ollama fails)
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
        self.gemini_model = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")

        # Initialize Ollama
        self._init_ollama()

        # Initialize Gemini as optional fallback
        self._init_gemini()

    def _init_ollama(self):
        """Check if Ollama is running and discover available models."""
        try:
            import ollama
            client = ollama.Client(host=OLLAMA_HOST, timeout=3.0)
            models_res = client.list()
            self.ollama_models = [m.get("name", m.get("model", "")) for m in models_res.get("models", [])]
            if self.ollama_models:
                self.ollama_available = True
                logger.info("✅ Ollama ready with models: %s", ", ".join(self.ollama_models))
            else:
                logger.warning("⚠️ Ollama is running but no models found. Run: ollama pull llama3.1:8b")
        except Exception as e:
            self.ollama_available = False
            logger.warning("⚠️ Ollama not available: %s. Text/vision will use Gemini fallback if configured.", e)

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

    async def chat(self, system_prompt: str, user_message: str,
                   context: Optional[List[str]] = None,
                   temperature: float = 0.25) -> str:
        """
        Send a chat query. Tries Ollama first, falls back to Gemini.
        Accepts optional temperature for per-modality precision control.
        """
        context_str = "\n\n".join(context) if context else ""
        full_message = (f"Agricultural Reference Context (use this as primary evidence):\n{context_str}\n\n"
                        f"User Question:\n{user_message}") if context_str else user_message

        # 1. Try Ollama
        model = self._select_ollama_model()
        if model and self.ollama_available:
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

        # 2. Fallback to Gemini
        if self.gemini_client:
            try:
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
                logger.info("☁️ Gemini fallback used for chat (temperature: %.2f)", temperature)
                return result
            except Exception as e:
                logger.error("Gemini fallback also failed: %s", e)

        # 3. No LLM available
        raise RuntimeError("No LLM available. Ensure Ollama is running (ollama serve) or set GEMINI_API_KEY.")

    async def chat_stream(self, system_prompt: str, query: str,
                          history: Optional[List[dict]] = None,
                          context: Optional[List[str]] = None) -> AsyncIterator[str]:
        """
        Stream a chat response. Ollama-first with Gemini fallback.
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

        # 1. Try Ollama streaming
        model = self._select_ollama_model()
        if model:
            try:
                from ollama import AsyncClient
                client = AsyncClient(host=OLLAMA_HOST)
                stream = await client.chat(
                    model=model,
                    messages=messages,
                    stream=True
                )
                async for chunk in stream:
                    token = chunk.get("message", {}).get("content", "")
                    if token:
                        yield token
                logger.info("🦙 Ollama streaming completed (model: %s)", model)
                return
            except Exception as e:
                logger.warning("Ollama streaming failed: %s", e)

        # 2. Fallback to Gemini streaming
        if self.gemini_client:
            try:
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
                async for chunk in stream:
                    if chunk.text:
                        yield chunk.text
                logger.info("☁️ Gemini streaming fallback used")
                return
            except Exception as e:
                logger.error("Gemini streaming also failed: %s", e)

        yield "⚠️ No LLM available. Please ensure Ollama is running (`ollama serve`) for offline use."

    async def vision(self, system_prompt: str, image_b64: str,
                     mime_type: str = "image/jpeg",
                     user_prompt: str = "Analyze this leaf image.",
                     temperature: float = 0.1) -> str:
        """
        Analyze an image. Uses LLaVA (Ollama) first, Gemini fallback.
        Lower default temperature (0.1) for precise factual disease diagnosis.
        """
        image_bytes = base64.b64decode(image_b64)

        # 1. Try Ollama LLaVA
        vision_model = self._select_vision_model()
        if vision_model:
            try:
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
            except Exception as e:
                logger.warning("LLaVA vision failed: %s", e)

        # 2. Fallback to Gemini Vision
        if self.gemini_client:
            try:
                from google.genai import types
                def _gemini_vision():
                    config = types.GenerateContentConfig(
                        system_instruction=system_prompt,
                        temperature=temperature,  # Use per-call temperature for vision
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
                logger.info("☁️ Gemini vision fallback used (temperature: %.2f)", temperature)
                return result
            except Exception as e:
                logger.error("Gemini vision also failed: %s", e)

        raise RuntimeError("No vision model available. Install LLaVA: ollama pull llava:7b")

    async def analyze_image(self, image_b64: str, user_prompt: str = "Analyze this leaf image.",
                            system_prompt: str = "You are a crop pathology system.",
                            mime_type: str = "image/jpeg",
                            temperature: float = 0.1) -> str:
        """Alias for vision() for backward compatibility. Low temperature for accurate diagnosis."""
        return await self.vision(system_prompt=system_prompt, image_b64=image_b64,
                                 mime_type=mime_type, user_prompt=user_prompt, temperature=temperature)

    def health_check(self) -> dict:
        """Check availability of all LLM backends."""
        status = {
            "ollama": {"available": False, "models": []},
            "gemini": {"available": False},
            "primary": "none"
        }

        # Check Ollama
        try:
            import ollama
            models_res = ollama.list()
            models = [m.get("name", m.get("model", "")) for m in models_res.get("models", [])]
            if models:
                status["ollama"] = {"available": True, "models": models}
                self.ollama_available = True
                self.ollama_models = models
        except Exception:
            pass

        # Check Gemini
        if self.gemini_client:
            import time
            now = time.time()
            if not hasattr(self, "_gemini_available") or (now - getattr(self, "_last_gemini_check", 0) > 300):
                try:
                    from google.genai import types
                    response = self.gemini_client.models.generate_content(
                        model=self.gemini_model,
                        contents="ping",
                        config=types.GenerateContentConfig(max_output_tokens=5, temperature=0.1)
                    )
                    self._gemini_available = bool(response.text)
                except Exception:
                    self._gemini_available = False
                self._last_gemini_check = now
            status["gemini"]["available"] = self._gemini_available

        # Determine primary
        if status["ollama"]["available"]:
            status["primary"] = "ollama"
        elif status["gemini"]["available"]:
            status["primary"] = "gemini"

        return status

    def refresh_models(self):
        """Re-scan Ollama for newly pulled models."""
        self._init_ollama()


# Singleton instance
unified_llm_service = UnifiedLLMService()
unified_llm = unified_llm_service
