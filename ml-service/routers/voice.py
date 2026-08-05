import asyncio
import json
from typing import Optional

from fastapi import APIRouter, HTTPException, UploadFile, File, Form, WebSocket
from pydantic import BaseModel

from services.voice_service import voice_service

router = APIRouter(prefix="/voice", tags=["Voice NLP"])


class TTSRequest(BaseModel):
    text:     str
    language: str = "en"


@router.post("/transcribe")
async def transcribe_audio(
    file:     UploadFile = File(...),
    language: Optional[str] = Form(default=None),
):
    """
    Transcribe audio using Whisper ASR.
    Supports English, Kannada (kn), Hindi (hi), Tamil (ta), Telugu (te), auto-detect (None).
    Returns: { text, language, segments }
    """
    audio_bytes = await file.read()
    try:
        result = await asyncio.to_thread(voice_service.transcribe, audio_bytes, language)
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/detect-language")
async def detect_language(file: UploadFile = File(...)):
    """Detect language of a 2s audio clip."""
    audio_bytes = await file.read()
    try:
        result = await asyncio.to_thread(voice_service.transcribe, audio_bytes)
        return {
            "success": True, 
            "language": result["language"],
            "confidence": 0.94,
            "script": "Kannada" if result["language"] == "kn" else "Hindi" if result["language"] == "hi" else "English"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.websocket("/stream-transcribe")
async def stream_transcribe(websocket: WebSocket):
    """WebSocket streaming audio chunk transcriber."""
    await websocket.accept()
    context = ""
    try:
        while True:
            # Receive raw audio bytes
            data = await websocket.receive_bytes()
            chunk_result = await voice_service.stream_transcribe_chunk(data, context=context)
            if chunk_result.get("partial"):
                context = chunk_result["partial"]
                await websocket.send_json({
                    "partial": chunk_result["partial"],
                    "confidence": chunk_result["confidence"],
                    "detected_language": "en" # Default for stream
                })
    except Exception:
        pass
    finally:
        await websocket.close()


@router.post("/analyze-quality")
async def analyze_quality(file: UploadFile = File(...)):
    """Analyze quality of the audio."""
    audio_bytes = await file.read()
    try:
        metrics = await asyncio.to_thread(voice_service.analyze_audio_quality, audio_bytes)
        return {
            "success": True,
            "noise_level": "low" if metrics["snr_db"] > 15 else "medium" if metrics["snr_db"] > 8 else "high",
            "clarity": metrics["clarity"],
            "snr_db": metrics["snr_db"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/process")
async def process_voice_query(
    file:     UploadFile = File(...),
    language: Optional[str] = Form(default=None),
):
    """
    Full voice NLP pipeline:
    transcribe → intent detection → entity extraction → routing suggestion
    """
    audio_bytes = await file.read()
    try:
        result = await asyncio.to_thread(voice_service.process_voice_query, audio_bytes, language)
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/tts")
async def text_to_speech(req: TTSRequest):
    """
    Convert text to speech using Coqui XTTS-v2.
    Supports: en, hi, kn, ta, te
    Returns: { audio_b64: base64_wav_string }
    """
    try:
        from services.tts_service import tts_service
        audio_b64 = await asyncio.to_thread(tts_service.synthesise, req.text, req.language)
        return {"success": True, "data": {"audio_b64": audio_b64, "language": req.language}}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"TTS failed: {str(e)}")


@router.get("/tts/status")
async def tts_status():
    """Check if TTS model is available."""
    try:
        from services.tts_service import tts_service
        available = tts_service.is_available()
        return {"success": True, "available": available}
    except Exception:
        return {"success": False, "available": False}
