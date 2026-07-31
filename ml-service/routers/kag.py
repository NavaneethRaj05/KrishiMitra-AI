from fastapi import APIRouter, HTTPException, Query
from typing import Optional

router = APIRouter(prefix="/kag", tags=["KAG"])


@router.get("/crop/{crop_name}/profile")
async def crop_profile(crop_name: str):
    """Full knowledge graph profile: soils, climates, diseases, treatments."""
    try:
        from services.kag_service import kag_service
        data = kag_service.get_full_crop_profile(crop_name.title())
        return {"success": True, "data": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/crop/{crop_name}/diseases")
async def crop_diseases(crop_name: str):
    """All diseases a crop is vulnerable to."""
    try:
        from services.kag_service import kag_service
        data = kag_service.get_diseases_for_crop(crop_name.title())
        return {"success": True, "data": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/disease/{disease_name}/treatments")
async def disease_treatments(
    disease_name: str,
    organic_only: bool = Query(False, description="Return only organic treatments"),
):
    """All treatments for a disease, with optional organic filter."""
    try:
        from services.kag_service import kag_service
        data = kag_service.find_safe_treatments(disease_name, organic_only)
        return {"success": True, "data": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/climate/{zone}/crops")
async def crops_by_climate(
    zone: str,
    soil: Optional[str] = Query(None, description="Filter by soil type"),
):
    """Crops suited to a climate zone, optionally filtered by soil type."""
    try:
        from services.kag_service import kag_service
        data = kag_service.get_crops_for_climate(zone, soil)
        return {"success": True, "data": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/graph")
async def get_graph():
    """Fetch the entire graph nodes and relationships for visual exploration."""
    try:
        from services.kag_service import kag_service
        data = kag_service.get_entire_graph()
        return {"success": True, "data": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def kag_health():
    """Check Neo4j connectivity."""
    try:
        from services.kag_service import kag_service
        ok = kag_service.health_check()
        return {"success": ok, "connected": ok}
    except Exception:
        return {"success": False, "connected": False}
