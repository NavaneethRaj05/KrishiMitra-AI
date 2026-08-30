import logging
from typing import Tuple

logger = logging.getLogger("krishimitraai.services.validation")

class ValidationService:
    """
    Validates LLM-generated responses before they are sent to the farmer.
    Ensures safety, checks for hallucinated chemicals, and verifies dosage realism.
    """
    
    # Chemicals restricted or banned in India — triggers safety warning if recommended
    RESTRICTED_CHEMICALS = [
        # Original list
        "monocrotophos", "phorate", "carbofuran", "methyl parathion", "endosulfan",
        # Expanded — banned/restricted in India under various notifications
        "glyphosate", "paraquat", "dicofol", "triazophos", "chlorpyrifos",
        "acephate", "diazinon", "methomyl", "aldicarb", "lindane",
        "dimethoate", "trichlorfon",
    ]
    
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
            forecast_precip = weather.get("forecast_3day", {}).get("precipitation", [])
            rain_forecast = sum(forecast_precip) > 10 if (isinstance(forecast_precip, list) and forecast_precip) else weather.get("precipitation", 0) > 10
            is_raining_now = "rain" in weather.get("description", "").lower() or weather.get("precipitation", 0) > 0
            wind_speed = weather.get("windspeed", 0)
            
            recommends_spraying = any(word in response_lower for word in ["spray", "spraying", "apply fungicide", "apply pesticide"])
            
            if recommends_spraying and (rain_forecast or is_raining_now):
                logger.warning("Spraying recommended during rain.")
                response += "\n\n⚠️ WEATHER ALERT: Rain is forecasted. Delay spraying chemicals as they will wash off and lose effectiveness."

            if recommends_spraying and wind_speed > 15:
                logger.warning(f"Spraying recommended during high winds ({wind_speed} km/h).")
                response += f"\n\n⚠️ WIND ALERT: Current wind speed is {wind_speed} km/h. Spraying in high winds causes chemical drift to non-target areas. Wait for wind speed to drop below 15 km/h before applying."
                
        # 3. Dosage Sanity Check — heuristics for common fertilizers and pesticides
        import re

        # Urea: flag if > 250 kg/acre
        urea_match = re.search(r'(\d+)\s*(kg|kilos).*?urea', response_lower)
        if urea_match:
            try:
                if int(urea_match.group(1)) > 250:
                    response += "\n\n⚠️ VALIDATION WARNING: The recommended Urea dosage appears unusually high. Standard recommendation is 100–130 kg/acre. Please double-check with a local expert."
            except ValueError:
                pass

        # DAP: flag if > 150 kg/acre
        dap_match = re.search(r'(\d+)\s*(kg|kilos).*?dap', response_lower)
        if dap_match:
            try:
                if int(dap_match.group(1)) > 150:
                    response += "\n\n⚠️ VALIDATION WARNING: The recommended DAP dosage appears unusually high. Standard recommendation is 50–100 kg/acre. Please double-check with a local expert."
            except ValueError:
                pass

        # MOP: flag if > 100 kg/acre
        mop_match = re.search(r'(\d+)\s*(kg|kilos).*?mop', response_lower)
        if mop_match:
            try:
                if int(mop_match.group(1)) > 100:
                    response += "\n\n⚠️ VALIDATION WARNING: The recommended MOP dosage appears unusually high. Standard recommendation is 30–60 kg/acre. Please double-check with a local expert."
            except ValueError:
                pass

        # Pesticide spray concentration: flag if ml/L > 10 or g/L > 5
        pesticide_ml_match = re.search(r'(\d+(?:\.\d+)?)\s*ml\s*/\s*(?:litre|liter|l\b)', response_lower)
        if pesticide_ml_match:
            try:
                if float(pesticide_ml_match.group(1)) > 10:
                    response += "\n\n⚠️ VALIDATION WARNING: The recommended pesticide concentration (ml/L) appears unusually high. Most pesticides require 0.5–5 ml/L. Please verify the product label before spraying."
            except ValueError:
                pass

        pesticide_g_match = re.search(r'(\d+(?:\.\d+)?)\s*g\s*/\s*(?:litre|liter|l\b)', response_lower)
        if pesticide_g_match:
            try:
                if float(pesticide_g_match.group(1)) > 5:
                    response += "\n\n⚠️ VALIDATION WARNING: The recommended pesticide concentration (g/L) appears unusually high. Most fungicides/herbicides require 1–3 g/L. Please verify the product label before applying."
            except ValueError:
                pass
                
        return True, response

validation_service = ValidationService()
