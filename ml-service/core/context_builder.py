from typing import Dict, Any
import logging

logger = logging.getLogger("krishimitraai.core.context")

class ContextBuilder:
    """Builds a centralized FarmerContext object for the entire pipeline."""
    
    def build(self, gps_ctx: dict) -> Dict[str, Any]:
        """Construct a unified context dict from the raw GPS context."""
        context = {
            "district": gps_ctx.get("district", "Unknown"),
            "state": gps_ctx.get("state", "Unknown"),
            "soil_type": gps_ctx.get("soil_type", "Unknown"),
            "crop": gps_ctx.get("crop", "Unknown"),
            "season": gps_ctx.get("season", "Unknown"),
            "agro_zone": gps_ctx.get("agro_zone", ""),
            "weather": gps_ctx.get("weather", {}),
            "major_crops": gps_ctx.get("major_crops", [])
        }
        return context

context_builder = ContextBuilder()
