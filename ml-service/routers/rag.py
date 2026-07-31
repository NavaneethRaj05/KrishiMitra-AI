import asyncio
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

from services.rag_service import rag_service

router = APIRouter(prefix="/rag", tags=["RAG"])


class QueryRequest(BaseModel):
    question:       str
    language:       str = "en"   # "en", "kn", "hi", "ta", "te"
    farmer_id:      Optional[str] = None
    farmer_history: Optional[list] = []   # NEW
    speak:          bool = False         # NEW — return TTS audio


class IngestRequest(BaseModel):
    force_reload: bool = False


@router.post("/ask")
async def ask_question(req: QueryRequest):
    """Main RAG endpoint — returns AI answer + source documents + optional TTS."""
    try:
        result = await asyncio.to_thread(
            rag_service.generate_answer, req.question, req.language, req.farmer_history or []
        )
        if req.speak:
            try:
                from services.tts_service import tts_service
                result["audio_b64"] = await asyncio.to_thread(
                    tts_service.synthesise, result["answer"], req.language
                )
            except Exception:
                result["audio_b64"] = None   # TTS optional
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



@router.post("/ingest")
async def ingest_documents(req: IngestRequest):
    """Trigger knowledge base rebuild from the documents folder."""
    try:
        added = await asyncio.to_thread(rag_service.ingest_documents)
        total = rag_service.collection.count()
        return {
            "success": True,
            "data": {"chunks_added": added, "total_chunks": total},
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats")
async def get_kb_stats():
    """Return number of chunks and collection info."""
    try:
        total = rag_service.collection.count()
        return {
            "success": True,
            "data": {
                "total_chunks":  total,
                "embed_model":   "all-MiniLM-L6-v2",
                "vector_store":  "ChromaDB",
            },
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
