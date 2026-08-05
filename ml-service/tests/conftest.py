"""
Shared fixtures for KrishiMitraAI ML service unit tests.
Provides: isolated in-memory ChromaDB, mocked Ollama, sample soil data.
"""
import os
import sys
import pytest
import numpy as np

# Ensure ml-service root is importable
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

# ─── Fixtures ───────────────────────────────────────────────────────────────

@pytest.fixture
def sample_soil():
    """Typical Karnataka soil data for crop recommendation tests."""
    return {
        "N": 90.0,
        "P": 42.0,
        "K": 43.0,
        "temperature": 25.0,
        "humidity": 80.0,
        "ph": 6.5,
        "rainfall": 202.0,
    }


@pytest.fixture
def tomato_image_bytes():
    """Minimal 1x1 pixel RGB JPEG as stand-in for a real leaf photo."""
    from PIL import Image
    import io
    img = Image.new("RGB", (224, 224), color=(60, 120, 60))  # green-ish leaf colour
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


@pytest.fixture
def mock_ollama(monkeypatch):
    """
    Patch ollama.chat to return a deterministic response so tests
    don't require a running Ollama server.
    """
    import unittest.mock as mock

    def fake_chat(model, messages, **kwargs):
        return {"message": {"content": "Mock LLM response for testing."}}

    monkeypatch.setattr("ollama.chat", fake_chat)
    return fake_chat


@pytest.fixture
def chroma_tmp(tmp_path):
    """
    Ephemeral ChromaDB client backed by a temp directory.
    Returns (client, collection) ready for test ingestion.
    """
    import chromadb
    from chromadb.config import Settings
    client = chromadb.PersistentClient(
        path=str(tmp_path / "chroma"),
        settings=Settings(anonymized_telemetry=False),
    )
    collection = client.get_or_create_collection(
        name="test_kb",
        metadata={"hnsw:space": "cosine"},
    )
    return client, collection
