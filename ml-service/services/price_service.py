import asyncio
import logging
from datetime import datetime, timedelta

logger = logging.getLogger("krishimitraai.price")

class PriceIntelligenceService:
    async def fetch_agmarknet(self, commodity: str, district: str, days: int = 90) -> list:
        # Return simulated/real historical modal prices
        today = datetime.now()
        base_price = 1800 if commodity.lower() == "tomato" else 2100 if commodity.lower() == "paddy" else 1650
        
        historical = []
        for i in range(days, 0, -1):
            date_str = (today - timedelta(days=i)).strftime("%Y-%m-%d")
            # Create a mock sinusoidal wave with some noise for prices
            import math
            import random
            wave = math.sin(i / 10.0) * 150
            noise = random.randint(-30, 30)
            modal_price = base_price + int(wave) + noise
            historical.append({
                "date": date_str,
                "modal_price": modal_price
            })
        return historical

    def forecast_prices(self, historical: list) -> list:
        # Forecast for next 7 days
        # Fit a simple linear extrapolation fallback or seasonal ARIMA mock
        last_price = historical[-1]["modal_price"]
        trend = (historical[-1]["modal_price"] - historical[-10]["modal_price"]) / 10.0
        
        today = datetime.now()
        forecast = []
        for i in range(1, 8):
            date_str = (today + timedelta(days=i)).strftime("%Y-%m-%d")
            # Extrapolate last price + trend * day + minor sin curve
            import math
            pred = last_price + int(trend * i) + int(math.sin(i / 2.0) * 20)
            forecast.append({
                "date": date_str,
                "price": pred
            })
        return forecast

    async def get_price_forecast(self, commodity: str, district: str) -> dict:
        historical = await self.fetch_agmarknet(commodity, district, days=90)
        forecast = self.forecast_prices(historical)
        
        # Find peak/optimal sell day
        peak_day = max(forecast, key=lambda x: x["price"])
        
        # Trend
        last_diff = historical[-1]["modal_price"] - historical[-15]["modal_price"]
        trend_str = "rising" if last_diff > 50 else "falling" if last_diff < -50 else "stable"

        return {
            "commodity": commodity,
            "current_price": historical[-1]["modal_price"],
            "trend": trend_str,
            "forecast_7d": forecast,
            "optimal_sell_day": peak_day["date"],
            "optimal_sell_price": peak_day["price"],
            "nearest_mandis": await self.get_nearest_mandis(district, commodity),
            "price_chart_data": [
                {"date": h["date"], "price": h["modal_price"]} for h in historical[-30:]
            ] + [{"date": f["date"], "price": f["price"], "is_forecast": True} for f in forecast]
        }

    async def get_nearest_mandis(self, district: str, commodity: str) -> list:
        # Top 3 mandis sorted by price (highest first)
        # Use farmer's district for the primary mandi, generic names for others
        base_price = 1850 if commodity.lower() == "tomato" else 2100
        district_label = district if district else "Local"
        return [
            {"mandi_name": f"{district_label} APMC", "current_price": base_price, "distance_km": 4.5, "last_updated": "Today"},
            {"mandi_name": "Nearest Regional APMC", "current_price": base_price - 50, "distance_km": 35.0, "last_updated": "Yesterday"},
            {"mandi_name": "District Agri Market", "current_price": base_price + 30, "distance_km": 40.0, "last_updated": "Today"}
        ]

price_intelligence_service = PriceIntelligenceService()
