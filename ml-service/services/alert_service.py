import logging
import random
from datetime import datetime

logger = logging.getLogger("krishimitraai.alerts")

class AlertService:
    async def get_district_alerts(self, district: str, crops: list) -> list:
        alerts = []
        
        # Source 1: NIPHM alerts simulation
        alerts.append({
            "id": "niphm_1",
            "title": "NIPHM Pest Advisory: Whiteflies in Tomato",
            "description": f"Increased whitefly populations reported in {district} district due to dry spell. Farmers are advised to set yellow sticky traps.",
            "severity": 80,
            "crop": "tomato",
            "source": "NIPHM"
        })

        # Source 2: Crowd-sourced outbreak
        # If random simulation: say 8 reports in district
        alerts.append({
            "id": "outbreak_1",
            "title": f"Community Alert: Paddy Blast Outbreak in {district}",
            "description": f"Over 8 farmers in your district reported Paddy Blast disease in the last 7 days. Inspect your nursery fields immediately.",
            "severity": 90,
            "crop": "paddy",
            "source": "Community Outbreak Detection"
        })

        # Source 3: IMD weather risk advisory
        alerts.append({
            "id": "weather_risk_1",
            "title": "IMD Weather Disease Risk Warning",
            "description": "High relative humidity (>85%) forecasted for next 3 days. High risk of fungal late blight propagation in Tomato.",
            "severity": 65,
            "crop": "tomato",
            "source": "IMD Weather Advisory"
        })

        # Filter alerts matching farmer's crops
        matching = [a for a in alerts if a["crop"].lower() in [c.lower() for c in crops]]
        
        return sorted(matching, key=lambda x: x["severity"], reverse=True)

alert_service = AlertService()
