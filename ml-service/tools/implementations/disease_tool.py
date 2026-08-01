import base64
import logging
from tools.base import BaseTool, ToolResult
from services.disease_service import disease_service

logger = logging.getLogger("krishimitraai.tools.disease")

class DiseaseTool(BaseTool):
    @property
    def name(self) -> str:
        return "disease_tool"
        
    @property
    def description(self) -> str:
        return "Analyzes plant images using a local CNN model backed by a Vision LLM to diagnose diseases, pests, and nutrient deficiencies."
        
    @property
    def required_params(self) -> list:
        return ["image_b64"]

    async def execute(self, **kwargs) -> ToolResult:
        image_b64 = kwargs.get("image_b64")
        if not image_b64:
            return ToolResult(success=False, data=None, message="Missing image_b64 parameter")
            
        try:
            img_bytes = base64.b64decode(image_b64)
            diag = await disease_service.full_diagnosis(img_bytes)
            
            summary = (
                f"AI Plant Diagnosis: {diag['disease']} in {diag['crop']}\n"
                f"CNN Confidence: {diag['confidence']}%. Severity: {diag['severity']}.\n"
                f"Pathologist Report: {diag['explanation']}"
            )
            
            return ToolResult(
                success=True, 
                data=summary,
                metadata={"full_response": diag},
                message="Disease diagnosis generated successfully."
            )
            
        except Exception as e:
            logger.error(f"Disease Tool execution failed: {e}")
            return ToolResult(success=False, data=None, message=str(e))
