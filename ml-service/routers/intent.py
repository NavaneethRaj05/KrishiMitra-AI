"""Intent detection router — exposes the intent classification agent."""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/intent", tags=["Intent Agent"])


class IntentRequest(BaseModel):
    query:    str
    use_llm:  bool = False  # set True for LLM-assisted classification


@router.post("/classify")
async def classify_intent(req: IntentRequest):
    """
    Classify a farmer query into a structured intent.
    Returns intent name, confidence, extracted crops/locations, urgency level.
    """
    try:
        from services.intent_service import intent_service
        if req.use_llm:
            result = await intent_service.classify_with_llm(req.query)
        else:
            result = intent_service.classify(req.query)
        return {
            "success": True,
            "data": {
                "intent":           result.intent,
                "confidence":       result.confidence,
                "keywords_matched": result.keywords_matched,
                "crops_mentioned":  result.crops_mentioned,
                "locations":        result.locations_mentioned,
                "urgency":          result.urgency,
                "strategy":         intent_service.get_search_strategy(result),
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
