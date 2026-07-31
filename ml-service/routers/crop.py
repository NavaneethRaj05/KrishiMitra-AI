import asyncio
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from services.crop_service import crop_service

router = APIRouter(prefix="/crop", tags=["Crop Recommendation"])


class SoilData(BaseModel):
    N:           float = Field(..., ge=0, le=140, description="Nitrogen kg/ha")
    P:           float = Field(..., ge=0, le=140, description="Phosphorus kg/ha")
    K:           float = Field(..., ge=0, le=200, description="Potassium kg/ha")
    temperature: float = Field(..., ge=0, le=50,  description="Temperature °C")
    humidity:    float = Field(..., ge=10, le=100, description="Humidity %")
    ph:          float = Field(..., ge=3, le=10,   description="Soil pH")
    rainfall:    float = Field(..., ge=20, le=300, description="Rainfall mm")


@router.post("/recommend")
async def recommend_crop(soil: SoilData):
    """
    Predict the best crop and return:
    - recommended crop + confidence
    - top-3 alternatives
    - SHAP values + base64 waterfall chart
    - plain-English explanation
    """
    try:
        result = await asyncio.to_thread(crop_service.predict, soil.model_dump())
        return {"success": True, "data": result}
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
