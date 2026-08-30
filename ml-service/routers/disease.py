import asyncio
import base64
import os
from typing import Optional

from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel

from services.disease_service import disease_service

router = APIRouter(prefix="/disease", tags=["Disease Detection"])


async def _run_diagnosis(image_bytes: bytes) -> dict:
    """Shared pipeline: CNN → LLaVA → RAG treatment enrichment."""
    result = await disease_service.full_diagnosis(image_bytes)

    if result.get("treatment_rag") is None:
        try:
            from services.rag_service import rag_service
            rag_query = (
                f"Treatment and management of {result['disease']} in {result['crop']} crop. "
                "What pesticides, fungicides, or organic treatments should a farmer use? "
                "Include dosage and application method."
            )
            rag_result = await asyncio.to_thread(rag_service.generate_answer, rag_query, language="en")
            result["treatment_rag"]     = rag_result.get("answer")
            result["treatment_sources"] = rag_result.get("sources", [])
        except Exception:
            result["treatment_rag"]     = None
            result["treatment_sources"] = []

    return result


@router.post("/diagnose")
@router.post("/predict")
async def diagnose(file: UploadFile = File(...)):
    """
    Accept an image upload (multipart) and return:
    - crop name, disease name, confidence, severity
    - top-3 predictions
    - LLaVA natural language explanation
    - RAG-backed treatment recommendations
    """
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image (jpg/png)")

    image_bytes = await file.read()
    try:
        result = await _run_diagnosis(image_bytes)
        return {"success": True, "data": result}
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/diagnose-b64")
async def diagnose_b64(image_b64: str, farmer_id: Optional[str] = None):
    """Accept base64-encoded image (alternative for API clients)."""
    try:
        image_bytes = base64.b64decode(image_b64)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid base64 image data")

    try:
        result = await _run_diagnosis(image_bytes)

        if farmer_id:
            try:
                import httpx
                async with httpx.AsyncClient() as client:
                    await client.post(
                        f"{os.getenv('BACKEND_URL', 'http://localhost:5000')}/api/farmer/journal",
                        json={
                            "farmer_id": farmer_id,
                            "entryType": "disease_detection",
                            "input":     {"image_size": len(image_bytes)},
                            "output":    result,
                        },
                        headers={"X-Internal-Key": os.getenv("INTERNAL_API_KEY", "internal")},
                    )
            except Exception:
                pass

        return {"success": True, "data": result}
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/history")
async def get_history(farmer_id: str = "demo", crop: str = "tomato"):
    try:
        data = await disease_service.get_disease_history(farmer_id, crop)
        return {"success": True, "data": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/estimate-cost")
async def estimate_cost(treatment: dict, district: str = "Hassan"):
    try:
        data = await disease_service.estimate_treatment_cost(treatment, district)
        return {"success": True, "data": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/classify")
async def classify_only(file: UploadFile = File(...)):
    """CNN-only classification without LLaVA or RAG (fastest)."""
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    image_bytes = await file.read()
    try:
        result = await disease_service.classify(image_bytes)
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
