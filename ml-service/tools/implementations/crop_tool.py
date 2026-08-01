import asyncio
import logging
from tools.base import BaseTool, ToolResult
from services.crop_service import crop_service

logger = logging.getLogger("krishimitraai.tools.crop")

class CropTool(BaseTool):
    @property
    def name(self) -> str:
        return "crop_tool"
        
    @property
    def description(self) -> str:
        return "Recommends the best crop based on soil NPK, pH, and environmental parameters using SHAP-explained ML models."
        
    @property
    def required_params(self) -> list:
        return ["soil_metrics"]

    async def execute(self, **kwargs) -> ToolResult:
        soil_metrics = kwargs.get("soil_metrics")
        if not soil_metrics:
            return ToolResult(success=False, data=None, message="Missing soil_metrics parameter")
            
        try:
            # We run this in a thread since XGBoost predict might be synchronous/CPU bound
            crop_res = await asyncio.to_thread(crop_service.predict, soil_metrics)
            
            summary = (
                f"Soil Crop Recommendation: {crop_res['recommended_crop']}\n"
                f"Explanation: {crop_res['explanation']} (Confidence: {crop_res['confidence']}%).\n"
                f"Top alternatives: {', '.join([c['crop'] for c in crop_res['top3_crops']])}."
            )
            
            return ToolResult(
                success=True, 
                data=summary,
                metadata={"full_response": crop_res},
                message="Crop recommendation generated successfully."
            )
            
        except Exception as e:
            logger.error(f"Crop Tool execution failed: {e}")
            return ToolResult(success=False, data=None, message=str(e))
