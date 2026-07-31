"""KrishiSearch SSE streaming endpoint."""
import json
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from services.krishi_search_service import krishi_search_service

router = APIRouter(prefix="/search", tags=["KrishiSearch"])


from typing import Optional


class SearchRequest(BaseModel):
    query:          str
    language:       str  = "en"
    online:         bool = True
    conversation:   list = []
    farmer_history: list = []
    image_b64:      Optional[str] = None
    farmer_id:      Optional[str] = None
    image_context:  Optional[dict] = None
    latitude:       Optional[float] = None
    longitude:      Optional[float] = None


@router.post("/ask")
async def search_ask(req: SearchRequest):
    """SSE stream: status → intent → sources → tokens → related → done."""
    from services.context_service import context_service
    # Use GPS coordinates if available for location-aware context
    if req.latitude is not None and req.longitude is not None:
        farmer_context = await context_service.get_context_from_gps(req.latitude, req.longitude, req.farmer_id)
    elif req.farmer_id:
        farmer_context = await context_service.get_context(req.farmer_id)
    else:
        farmer_context = {}

    # Normalize farmer_context to consistent flat keys so all downstream services
    # reliably find soil_type, agro_zone, major_crops etc. regardless of nesting
    soil_obj = farmer_context.get("soil") or {}
    farmer_context.setdefault("soil_type",    soil_obj.get("soil_type") or farmer_context.get("soil_type", ""))
    farmer_context.setdefault("agro_zone",    farmer_context.get("agro_zone", ""))
    farmer_context.setdefault("major_crops",  farmer_context.get("major_crops") or farmer_context.get("major_crops_in_area") or [])
    farmer_context.setdefault("season",       farmer_context.get("season", ""))
    farmer_context.setdefault("district",     farmer_context.get("district", ""))
    farmer_context.setdefault("state",        farmer_context.get("state", ""))
    farmer_context.setdefault("weather",      farmer_context.get("weather") or {})
    farmer_context.setdefault("crop",         farmer_context.get("crop") or farmer_context.get("primary_crop", ""))

    async def stream():
        async for event in krishi_search_service.stream_answer(
            query=          req.query,
            language=       req.language,
            conversation=   req.conversation,
            farmer_history= req.farmer_history,
            online=         req.online,
            image_b64=      req.image_b64,
            farmer_context= farmer_context,
        ):
            yield f"data: {json.dumps(event)}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(
        stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control":               "no-cache",
            "X-Accel-Buffering":           "no",
            "Access-Control-Allow-Origin": "*",
        }
    )



@router.post("")
async def search(req: SearchRequest):
    from services.context_service import context_service
    from services.search_pipeline import search_pipeline
    
    # Auto-detect image_b64 and run disease diagnosis if context not provided
    image_context = req.image_context
    if not image_context and req.image_b64:
        try:
            from services.disease_service import disease_service
            import base64
            
            # Fetch farmer crop context to guide classification
            farmer_crop = None
            try:
                if req.latitude is not None and req.longitude is not None:
                    fc = await context_service.get_context_from_gps(req.latitude, req.longitude, req.farmer_id)
                else:
                    fc = await context_service.get_context(req.farmer_id)
                farmer_crop = fc.get("crop")
            except Exception:
                pass

            img_bytes = base64.b64decode(req.image_b64)
            # Run cnn + llava + KAG treatments
            image_context = await disease_service.full_diagnosis(img_bytes, crop_context=farmer_crop, query=req.query)
        except Exception:
            pass

    # Use GPS coordinates if available for location-aware context
    if req.latitude is not None and req.longitude is not None:
        farmer_context = await context_service.get_context_from_gps(req.latitude, req.longitude, req.farmer_id)
    else:
        farmer_context = await context_service.get_context(req.farmer_id)
    result = await search_pipeline.run(
        query=req.query,
        farmer_context=farmer_context,
        thread_context=req.conversation,
        image_context=image_context,
        language=req.language,
        online=req.online
    )
    if image_context:
        result["image_context"] = image_context
    return result


@router.get("/trending")
async def trending(district: str = "Hassan", season: str = "Kharif"):
    # Attempt to query Redis or return static defaults
    try:
        import redis
        import os
        r = redis.from_url(os.getenv("REDIS_URL", "redis://localhost:6379"), decode_responses=True)
        key = f"trending:{district}:{season}"
        queries = r.zrevrange(key, 0, 5)
        if queries:
            return {"success": True, "data": queries}
    except Exception:
        pass

    # Static seasonal fallback queries
    dist_label = district if district else "Local"
    fallbacks = {
        "Kharif": [
            f"Best paddy variety for {dist_label}",
            "How to control tomato leaf curl virus?",
            "Organic pesticide for armyworm in maize",
            f"Tomato modal market price in {dist_label} APMC",
            "PM Kisan Yojana eligibility details",
            "Subsidy on drip irrigation in Karnataka"
        ],
        "Rabi": [
            "Wheat yellow rust treatment",
            "Chickpea wilt management",
            f"Groundnut crop sowing date in {dist_label}",
            "Onion price forecast for this month",
            "Crop insurance PMFBY registration",
            "NPK ratio for potato crop"
        ]
    }
    return {"success": True, "data": fallbacks.get(season, fallbacks["Kharif"])}


@router.get("/price-forecast")
async def get_price_forecast(commodity: str = "tomato", district: str = "Hassan"):
    from services.price_service import price_intelligence_service
    try:
        data = await price_intelligence_service.get_price_forecast(commodity, district)
        return {"success": True, "data": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/schemes")
async def get_schemes(query: str = "", land_acres: float = 2.0, state: str = "Karnataka"):
    from services.scheme_service import find_schemes
    try:
        farmer_profile = {"farmSize": land_acres, "state": state}
        data = await find_schemes(query, farmer_profile)
        return {"success": True, "data": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/alerts")
async def get_alerts(district: str = "Hassan", crops: str = "tomato,paddy"):
    from services.alert_service import alert_service
    try:
        crops_list = crops.split(",")
        data = await alert_service.get_district_alerts(district, crops_list)
        return {"success": True, "data": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def search_health():
    import os
    return {
        "success": True,
        "data": {
            "tavily":           bool(os.getenv("TAVILY_API_KEY")),
            "semantic_scholar": True,
            "vikaspedia":       True,
            "pubmed":           True,
            "fao":              True,
            "offline_rag":      True,
        }
    }


@router.get("/location/reverse")
async def reverse_geocode_location(lat: float, lon: float):
    from services.location_service import location_service
    try:
        res = location_service.reverse_geocode(lat, lon)
        if res:
            return {"success": True, "district": res.get("name"), "state": res.get("state")}
        return {"success": False, "error": "Location outside India or not found in database"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/location/details")
async def get_location_details(district: str):
    from services.location_service import location_service
    try:
        dist_lower = district.lower().strip()
        found = None
        for d in location_service.districts:
            if d.get("name", "").lower() == dist_lower:
                found = d
                break
        if found:
            return {
                "success": True,
                "district": found.get("name"),
                "state": found.get("state"),
                "lat": found.get("lat"),
                "lon": found.get("lon"),
                "major_crops": found.get("major_crops", []),
                "agro_zone": found.get("agro_zone"),
                "typical_soil": found.get("typical_soil"),
                "avg_rainfall_mm": found.get("avg_rainfall_mm"),
                "nearest_kvk": found.get("nearest_kvk")
            }
        return {"success": False, "error": f"District '{district}' not found in database"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



