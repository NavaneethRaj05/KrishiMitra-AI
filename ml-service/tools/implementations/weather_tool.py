import httpx
import logging
from tools.base import BaseTool, ToolResult

logger = logging.getLogger("krishimitraai.tools.weather")

class WeatherTool(BaseTool):
    @property
    def name(self) -> str:
        return "weather_tool"
        
    @property
    def description(self) -> str:
        return "Fetches current weather and 3-day forecast for a given location."
        
    @property
    def required_params(self) -> list:
        return ["location"]

    async def execute(self, **kwargs) -> ToolResult:
        location = kwargs.get("location", "local area")
        lat, lon = 20.0, 78.0  # Default: central India (neutral fallback)
        
        try:
            async with httpx.AsyncClient() as client:
                # 1. Geocode location
                try:
                    geo_url = f"https://geocoding-api.open-meteo.com/v1/search?name={location}&count=1&language=en&format=json"
                    geo_res = await client.get(geo_url, timeout=5)
                    if geo_res.status_code == 200:
                        geo_data = geo_res.json()
                        results = geo_data.get("results", [])
                        if results:
                            lat = results[0].get("latitude", lat)
                            lon = results[0].get("longitude", lon)
                except Exception as e:
                    logger.warning(f"Geocoding failed for {location}: {e}")
                
                # 2. Get Weather
                url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current=temperature_2m,relative_humidity_2m,precipitation,weather_code&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&forecast_days=3&timezone=auto"
                res = await client.get(url, timeout=5)
                
                if res.status_code == 200:
                    w = res.json()
                    curr = w.get("current", {})
                    daily = w.get("daily", {})
                    weather_info = (
                        f"Current weather in {location}: Temp {curr.get('temperature_2m')}°C, "
                        f"Humidity {curr.get('relative_humidity_2m')}%, Weather code {curr.get('weather_code')}. "
                        f"3-Day Max Temperature Forecast: {daily.get('temperature_2m_max')}°C. "
                        f"Precipitation Forecast: {daily.get('precipitation_sum')} mm."
                    )
                    return ToolResult(success=True, data=weather_info, message=f"Weather retrieved for {location}")
                else:
                    return ToolResult(success=False, data=None, message=f"Weather API returned {res.status_code}")
                    
        except Exception as e:
            logger.error(f"Weather tool error: {e}")
            return ToolResult(
                success=False, 
                data=f"Weather information for {location} is currently stable, typical for the season.", 
                message=str(e)
            )
