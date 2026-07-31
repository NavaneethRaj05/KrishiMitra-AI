"""
LLM Service — thin wrapper around Ollama for direct LLM calls.
"""
import ollama

DEFAULT_MODEL = "llama3.1:8b"


class LLMService:
    def __init__(self, model: str = DEFAULT_MODEL):
        self.model = model

    def chat(self, system_prompt: str, user_prompt: str) -> str:
        """Send a chat request and return the assistant content."""
        response = ollama.chat(
            model=self.model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user",   "content": user_prompt},
            ],
        )
        return response["message"]["content"]

    def list_models(self) -> list:
        """Return names of locally available Ollama models."""
        models = ollama.list()
        return [m["name"] for m in models.get("models", [])]


llm_service = LLMService()
