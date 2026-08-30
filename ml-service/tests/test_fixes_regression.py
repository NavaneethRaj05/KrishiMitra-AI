import sys
import os
from unittest.mock import MagicMock, patch, mock_open

# ─── Mock Ollama Clients BEFORE importing any local services to prevent network calls ───
import ollama
mock_client_instance = MagicMock()
mock_client_instance.list.return_value = {"models": []}
ollama.Client = MagicMock(return_value=mock_client_instance)

# Patch AsyncClient chat to throw by default to test fallbacks
mock_async_instance = MagicMock()
async def mock_async_chat(*args, **kwargs):
    raise RuntimeError("Mock AsyncClient error")
mock_async_instance.chat = mock_async_chat
ollama.AsyncClient = MagicMock(return_value=mock_async_instance)

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import pytest

# 1. Test intent_service LLM fallback (FAIL-02)
@pytest.mark.asyncio
async def test_intent_service_llm_fallback(monkeypatch):
    from services.intent_service import intent_service
    
    # Mock ollama.chat to return a valid output
    mock_chat = MagicMock(return_value={"message": {"content": "crop_selection"}})
    monkeypatch.setattr("ollama.chat", mock_chat)
    
    # Trigger query that has low keyword confidence to force LLM classification
    res = await intent_service.classify_with_llm("what crop should I grow here?")
    
    # Verify it fell back and executed successfully
    assert res is not None
    assert res.intent in ["crop_selection", "general_farming"]


# 2. Test TTS service speaker selection (FAIL-05)
def test_tts_service_speaker():
    from services.tts_service import tts_service
    
    # Mock the internal TTS model
    mock_model = MagicMock()
    mock_model.speakers = ["Ana Florence", "Speaker 2"]
    
    # Patch _get_model to return our mocked model
    with patch.object(tts_service, "_get_model", return_value=mock_model):
        # Trigger synthesise
        with patch("tempfile.NamedTemporaryFile") as mock_tmp, \
             patch("builtins.open", mock_open(read_data=b"fake_wav")), \
             patch("os.path.exists", return_value=True), \
             patch("os.remove") as mock_remove:
            
            mock_tmp.return_value.__enter__.return_value.name = "fake.wav"
            res = tts_service.synthesise("Hello world", "en")
            
            # Check that model.tts_to_file was called with speaker="Ana Florence"
            mock_model.tts_to_file.assert_called_once_with(
                text="Hello world",
                language="en",
                file_path="fake.wav",
                speaker="Ana Florence"
            )
            assert res is not None


# 3. Test query_router llm_vision fallback when LLM fails (FAIL-09)
@pytest.mark.asyncio
async def test_llm_vision_fallback():
    from routers.query_router import llm_vision
    
    # Call llm_vision with failing unified_llm_service and a cnn_result
    with patch("services.unified_llm_service.UnifiedLLMService.vision", side_effect=RuntimeError("LLM down")):
        cnn_result = {
            "crop": "Tomato",
            "disease": "Early Blight",
            "confidence": 95.0,
            "severity": "high"
        }
        res = await llm_vision("system", "image_b64", cnn_result=cnn_result)
        
        # Assert the formatted cnn results fallback was used
        assert "Tomato" in res["answer"]
        assert "Early Blight" in res["answer"]
        assert "95.0%" in res["answer"]


# 4. Test batched translation logic
def test_translate_fallback_text_batched(monkeypatch):
    from utils.language import translate_fallback_text
    
    # Mock requests.get response
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = [
        [
            ["ಹಲೋ ವರ್ಲ್ಡ್\nಟೊಮೆಟೊ", "Hello world\nTomato", None, None, 0]
        ]
    ]
    monkeypatch.setattr("requests.get", MagicMock(return_value=mock_response))
    
    res = translate_fallback_text("Hello world\nTomato", "kn")
    assert "ಹಲೋ ವರ್ಲ್ಡ್" in res
    assert "ಟೊಮೆಟೊ" in res


# 5. Test reverse_geocode pruning logic
def test_reverse_geocode_pruning():
    from services.location_service import location_service
    
    # Let's save original districts and restore them later
    original_districts = location_service.districts
    original_global = location_service.global_regions
    
    try:
        location_service.districts = [
            {"name": "Bengaluru", "state": "Karnataka", "lat": 12.97, "lon": 77.59, "typical_soil": "Red Soil"},
            {"name": "Hassan", "state": "Karnataka", "lat": 13.06, "lon": 76.10, "typical_soil": "Sandy Loam"},
        ]
        location_service.global_regions = []
        
        res = location_service.reverse_geocode(12.98, 77.60)
        assert res is not None
        assert res["name"] == "Bengaluru"
    finally:
        location_service.districts = original_districts
        location_service.global_regions = original_global


# 6. Test weather key corrections in validation_service
def test_validation_weather_keys():
    from services.validation_service import validation_service
    
    farmer_context = {
        "weather": {
            "precipitation": 12.0,   # Correct key
            "windspeed": 18.0,       # Correct key
            "description": "Rainy"
        }
    }
    
    is_valid, msg = validation_service.validate_response(
        "Please spray Mancozeb on your crops.",
        "pest_control",
        farmer_context
    )
    
    assert "WEATHER ALERT" in msg
    assert "WIND ALERT" in msg

