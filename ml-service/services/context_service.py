import os
import logging
from datetime import datetime
import httpx
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("krishimitraai.context")

# Try to import pymongo, but fallback if not installed/available
try:
    from pymongo import MongoClient
    from bson import ObjectId
    mongo_uri = os.getenv("MONGODB_URI", "mongodb://localhost:27017/krishimitraai")
    mongo_client = MongoClient(mongo_uri)
    db = mongo_client.get_database()
except Exception as e:
    logger.warning("pymongo client initiation failed, using fallback mock: %s", e)
    mongo_client = None
    db = None
    ObjectId = None

class ContextService:
    async def get_farmer_data(self, farmer_id: Optional[str]) -> dict:
        """Fetch farmer from mongodb or return a demo farmer profile."""
        if db is not None and ObjectId is not None and farmer_id and len(farmer_id) in (12, 24):
            try:
                # Query mongo
                farmer_col = db.get_collection("farmers")
                farmer = farmer_col.find_one({"_id": ObjectId(farmer_id)})
                if farmer:
                    return {
                        "name": farmer.get("name", "Farmer"),
                        "district": farmer.get("location", {}).get("district", "Hassan"),
                        "state": farmer.get("location", {}).get("state", "Karnataka"),
                        "block": farmer.get("location", {}).get("block", ""),
                        "soil_type": farmer.get("soilType", farmer.get("soil_type", "Sandy Loam")),
                        "irrigation_type": farmer.get("irrigationType", "Rainfed"),
                        "land_acres": farmer.get("landAcres", farmer.get("farmSize", 2.0)),
                        "registered_crops": farmer.get("preferredCrops", ["paddy", "tomato"]),
                        "preferred_language": farmer.get("language", "en"),
                        "sowing_dates": farmer.get("sowingDates", farmer.get("sowing_dates", {}))
                    }
            except Exception as e:
                logger.error("Error fetching farmer from db: %s", e)

        # Demo fallback (generic, globally applicable)
        return {
            "name": "Demo Farmer",
            "district": "",
            "state": "",
            "block": "",
            "soil_type": "Sandy Loam",
            "irrigation_type": "Rainfed",
            "land_acres": 2.5,
            "registered_crops": ["paddy", "tomato"],
            "preferred_language": "en",
            "sowing_dates": {
                "paddy": (datetime.now().replace(month=5, day=1)).strftime("%Y-%m-%d"),
                "tomato": (datetime.now().replace(month=5, day=15)).strftime("%Y-%m-%d")
            }
        }

    async def fetch_weather(self, district: str) -> dict:
        """Fetch real-time weather from Open-Meteo using geocoding, or return static mock."""
        WEATHER_CODES = {
            0: "Clear Sky",
            1: "Partly Cloudy", 2: "Partly Cloudy", 3: "Partly Cloudy",
            45: "Foggy", 48: "Foggy",
            51: "Drizzle", 53: "Drizzle", 55: "Drizzle",
            61: "Rainy", 63: "Rainy", 65: "Rainy",
            80: "Rain Showers", 81: "Rain Showers", 82: "Rain Showers",
            95: "Thunderstorm", 96: "Thunderstorm", 99: "Thunderstorm"
        }
        try:
            # Use neutral global default coordinates
            lat, lng = 20.0, 78.0
            if district:
                import httpx as _httpx
                async with _httpx.AsyncClient() as client:
                    try:
                        geo_url = f"https://geocoding-api.open-meteo.com/v1/search?name={district}&count=1&language=en&format=json"
                        geo_res = await client.get(geo_url, timeout=3.0)
                        if geo_res.status_code == 200:
                            geo_data = geo_res.json()
                            results = geo_data.get("results", [])
                            if results:
                                lat = results[0].get("latitude", lat)
                                lng = results[0].get("longitude", lng)
                    except Exception:
                        pass

            import httpx
            url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lng}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code"
            async with httpx.AsyncClient() as client:
                res = await client.get(url, timeout=3.0)
                if res.status_code == 200:
                    data = res.json()
                    curr = data.get("current", {})
                    code = curr.get("weather_code", 0)
                    return {
                        "temperature": curr.get("temperature_2m", 28.0),
                        "humidity": curr.get("relative_humidity_2m", 65.0),
                        "windspeed": curr.get("wind_speed_10m", 5.0),
                        "description": WEATHER_CODES.get(code, "Overcast"),
                        "rainfall_last_7d": 12.5
                    }
        except Exception as e:
            logger.warning("Failed to fetch live weather, using mock: %s", e)

        return {
            "temperature": 27.5,
            "humidity": 65,
            "windspeed": 6.0,
            "description": "Clear Sky",
            "rainfall_last_7d": 10.0
        }

    def get_current_season(self) -> str:
        """Kharif (Jun-Oct), Rabi (Nov-Mar), Zaid (Apr-May)"""
        month = datetime.now().month
        if 6 <= month <= 10:
            return "Kharif"
        elif month >= 11 or month <= 3:
            return "Rabi"
        else:
            return "Zaid"

    def get_crop_phase(self, crop: str, days_elapsed: int) -> str:
        """Basic phase determination based on standard crop calendars."""
        if days_elapsed < 15:
            return "germination"
        elif days_elapsed < 45:
            return "vegetative"
        elif days_elapsed < 75:
            return "flowering"
        elif days_elapsed < 100:
            return "grain_fill"
        elif days_elapsed < 120:
            return "maturity"
        else:
            return "harvest"

    async def get_context(self, farmer_id: Optional[str], lat: float = None, lon: float = None) -> dict:
        """
        Get farmer context. If GPS coordinates provided, uses GPS-based context.
        Otherwise falls back to profile-based context.
        """
        # If GPS coordinates are provided, use GPS-based context
        if lat is not None and lon is not None:
            return await self.get_context_from_gps(lat, lon, farmer_id)

        # Fallback: profile-based context (original behavior)
        farmer = await self.get_farmer_data(farmer_id)
        weather = await self.fetch_weather(farmer["district"])
        season = self.get_current_season()

        crop_phases = []
        for crop in farmer["registered_crops"]:
            sowing_str = farmer["sowing_dates"].get(crop)
            if sowing_str:
                try:
                    sowing_date = datetime.strptime(sowing_str, "%Y-%m-%d")
                    days_elapsed = (datetime.now() - sowing_date).days
                    phase = self.get_crop_phase(crop, days_elapsed)
                    crop_phases.append({"crop": crop, "phase": phase, "days": days_elapsed})
                except Exception:
                    crop_phases.append({"crop": crop, "phase": "vegetative", "days": 30})
            else:
                crop_phases.append({"crop": crop, "phase": "vegetative", "days": 30})

        return {
            "farmer_id": farmer_id,
            "name": farmer.get("name", "Farmer"),
            "district": farmer["district"],
            "state": farmer["state"],
            "block": farmer.get("block", ""),
            "soil_type": farmer["soil_type"],
            "irrigation_type": farmer.get("irrigation_type", "Rainfed"),
            "land_acres": farmer.get("land_acres", 2.0),
            "registered_crops": farmer["registered_crops"],
            "crop_phases": crop_phases,
            "season": season,
            "weather": weather,
            "language": farmer["preferred_language"],
        }

    async def get_context_from_gps(self, lat: float, lon: float, farmer_id: Optional[str] = None) -> dict:
        """
        Build full context from GPS coordinates using offline reverse geocoding.
        Merges location intelligence with farmer profile data if available.
        """
        from services.location_service import location_service

        # Get GPS-based location intelligence
        loc_ctx = await location_service.get_full_location_context(lat, lon)

        # Get farmer profile data (if available)
        farmer = await self.get_farmer_data(farmer_id)

        # Merge: GPS data takes priority for location/soil/weather,
        # farmer profile provides crops/preferences
        crop_phases = []
        registered_crops = farmer.get("registered_crops", loc_ctx.get("major_crops", ["paddy"]))
        for crop in registered_crops:
            sowing_str = farmer.get("sowing_dates", {}).get(crop)
            if sowing_str:
                try:
                    sowing_date = datetime.strptime(sowing_str, "%Y-%m-%d")
                    days_elapsed = (datetime.now() - sowing_date).days
                    phase = self.get_crop_phase(crop, days_elapsed)
                    crop_phases.append({"crop": crop, "phase": phase, "days": days_elapsed})
                except Exception:
                    crop_phases.append({"crop": crop, "phase": "vegetative", "days": 30})
            else:
                crop_phases.append({"crop": crop, "phase": "vegetative", "days": 30})

        return {
            "farmer_id": farmer_id,
            "name": farmer.get("name", "Farmer"),
            # GPS-derived location (overrides profile)
            "district": loc_ctx.get("district", farmer.get("district", "")),
            "state": loc_ctx.get("state", farmer.get("state", "")),
            "block": farmer.get("block", ""),
            # GPS-derived soil/agro data
            "soil_type": loc_ctx.get("soil", {}).get("soil_type", farmer.get("soil_type", "Sandy Loam")),
            "agro_zone": loc_ctx.get("agro_zone", ""),
            "soil_analysis": loc_ctx.get("soil", {}),
            # GPS-derived weather (live or cached)
            "weather": loc_ctx.get("weather", {}),
            "weather_source": loc_ctx.get("weather_source", "unknown"),
            # Farmer profile data
            "irrigation_type": farmer.get("irrigation_type", "Rainfed"),
            "land_acres": farmer.get("land_acres", 2.0),
            "registered_crops": registered_crops,
            "crop_phases": crop_phases,
            "season": loc_ctx.get("season", self.get_current_season()),
            "language": farmer.get("preferred_language", "en"),
            # Additional location context
            "major_crops_in_area": loc_ctx.get("major_crops", []),
            "avg_rainfall_mm": loc_ctx.get("avg_rainfall_mm", 800),
            "nearest_kvk": loc_ctx.get("nearest_kvk", ""),
            "coordinates": loc_ctx.get("coordinates", {"lat": lat, "lon": lon}),
            "location_context_string": location_service.get_location_context_string(loc_ctx),
        }

context_service = ContextService()

