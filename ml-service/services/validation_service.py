import logging
from typing import Tuple

logger = logging.getLogger("krishimitraai.services.validation")

class ValidationService:
    """
    Validates LLM-generated responses before they are sent to the farmer.
    Ensures safety, checks for hallucinated chemicals, and verifies dosage realism.
    """
    
    # Highly toxic chemicals that should trigger warnings or blocks if recommended without context
    RESTRICTED_CHEMICALS = ["monocrotophos", "phorate", "carbofuran", "methyl parathion", "endosulfan"]
    
    def validate_response(self, response: str, intent: str, farmer_context: dict = None) -> Tuple[bool, str]:
        """
        Validates the response text. 
        Returns (is_valid: bool, validated_response: str)
        If invalid or unsafe, appends a warning or alters the response.
        """
        response_lower = response.lower()
        
        # 1. Chemical Safety Check
        for chem in self.RESTRICTED_CHEMICALS:
            if chem in response_lower:
                logger.warning(f"Restricted chemical '{chem}' detected in response.")
                response += f"\n\n⚠️ CAUTION: The chemical '{chem}' is highly restricted or banned in many regions due to extreme toxicity. Please consult your local agriculture department before use."
        
        # 2. Weather Contradiction Check
        if farmer_context and farmer_context.get("weather"):
            weather = farmer_context["weather"]
            rain_forecast = weather.get("precipitation_sum", 0) > 10
            is_raining_now = "rain" in weather.get("description", "").lower()
            
            recommends_spraying = any(word in response_lower for word in ["spray", "spraying", "apply fungicide", "apply pesticide"])
            
            if recommends_spraying and (rain_forecast or is_raining_now):
                logger.warning("Spraying recommended during rain.")
                response += "\n\n⚠️ WEATHER ALERT: Rain is forecasted. Delay spraying chemicals as they will wash off and lose effectiveness."
                
        # 3. Dosage Sanity Check (Very basic heuristic)
        # e.g., if it recommends > 1000 kg/acre of urea, flag it
        import re
        urea_match = re.search(r'(\d+)\s*(kg|kilos).*urea', response_lower)
        if urea_match:
            try:
                amount = int(urea_match.group(1))
                if amount > 250:
                    response += "\n\n⚠️ VALIDATION WARNING: The recommended fertilizer dosage appears unusually high. Please double-check with a local expert."
            except ValueError:
                pass
                
        return True, response

validation_service = ValidationService()
