import asyncio
import logging
from tools.base import BaseTool, ToolResult
from services.kag_service import kag_service

logger = logging.getLogger("krishimitraai.tools.kag")

class KagTool(BaseTool):
    @property
    def name(self) -> str:
        return "kag_tool"
        
    @property
    def description(self) -> str:
        return "Queries the agricultural Knowledge Graph (Neo4j) for crop profiles, climate suitability, and disease treatments."
        
    @property
    def required_params(self) -> list:
        return ["crops"]

    async def execute(self, **kwargs) -> ToolResult:
        crops = kwargs.get("crops", [])
        intent = kwargs.get("intent", "")
        agro_zone = kwargs.get("agro_zone")
        soil_type = kwargs.get("soil_type")
        
        parts = []
        try:
            # 1. Look up mentioned crops
            if crops:
                # Wrap in to_thread if kag_service is blocking
                profile = await asyncio.to_thread(kag_service.get_full_crop_profile, crops[0].title())
                if profile.get("crop"):
                    info = profile["crop"]
                    diseases = [d["disease"] for d in profile.get("diseases", [])]
                    soils    = info.get("soils", [])
                    if diseases:
                        parts.append(f"Known diseases of {crops[0]}: {', '.join(diseases)}")
                    if soils:
                        parts.append(f"Suitable soils: {', '.join(soils)}")
                    if intent == "disease_diagnosis" and profile.get("diseases"):
                        for d in profile["diseases"][:2]:
                            if d.get("treatments"):
                                tnames = [t["treatment"] for t in d["treatments"]]
                                parts.append(f"Treatments for {d['disease']}: {', '.join(tnames)}")
                                
            # 2. Look up location-suited crops from Neo4j
            if agro_zone:
                suited = await asyncio.to_thread(kag_service.get_crops_for_climate, agro_zone, soil_type)
                if suited:
                    cnames = [c["crop"] for c in suited]
                    parts.append(f"Suited crops for {agro_zone} zone (soil={soil_type or 'any'}): {', '.join(cnames)}")
                    
            kg_context = ("\n[Knowledge Graph] " + ". ".join(parts) + ".") if parts else "No specific Knowledge Graph data found."
            
            return ToolResult(
                success=True, 
                data=kg_context,
                message="KAG retrieval successful."
            )
            
        except Exception as e:
            logger.error(f"KAG Tool execution failed: {e}")
            return ToolResult(success=False, data=None, message=str(e))
