import json
import base64
import logging
from fastapi import Request, Depends
from services.context_service import context_service

logger = logging.getLogger("krishimind.query")

async def get_current_user(request: Request) -> dict:
    profile_header = request.headers.get("x-user-profile")
    user = {"preferredLanguage": "english"}
    if profile_header:
        try:
            decoded_bytes = base64.b64decode(profile_header)
            user = json.loads(decoded_bytes.decode('utf-8'))
        except Exception as e:
            logger.error("Failed to decode base64 x-user-profile header: %s", e)

    # Extract GPS coordinates from headers (always-on GPS)
    lat = request.headers.get("x-latitude") or request.headers.get("X-Latitude")
    lon = request.headers.get("x-longitude") or request.headers.get("X-Longitude")
    if lat and lon:
        try:
            user["_gps_lat"] = float(lat)
            user["_gps_lon"] = float(lon)
        except (ValueError, TypeError):
            pass
    return user


async def get_gps_context(user: dict = Depends(get_current_user)) -> dict:
    """
    Extracts location, weather, and crop details based on GPS (or fallback profile).
    """
    gps_lat = user.get("_gps_lat")
    gps_lon = user.get("_gps_lon")

    if gps_lat is not None and gps_lon is not None:
        # Use GPS for accurate location-based context
        gps_context = await context_service.get_context_from_gps(gps_lat, gps_lon)
        district = gps_context.get("district", "Unknown")
        state = gps_context.get("state", "Unknown")
        weather = gps_context.get("weather", {})
        season = gps_context.get("season", "Kharif")
        soil_type = gps_context.get("soil_type", "Loamy")
        agro_zone = gps_context.get("agro_zone", "")
        major_crops = gps_context.get("major_crops_in_area", [])
        location_ctx_str = gps_context.get("location_context_string", "")
        crop = user.get("crop", major_crops[0] if major_crops else "Tomato")
    else:
        # Fallback: profile-based context
        district = user.get("district", "Hassan")
        state = user.get("state", "Karnataka")
        crop = user.get("crop", "Tomato")
        weather = await context_service.fetch_weather(district)
        season = context_service.get_current_season()
        soil_type = user.get("soilType", "Sandy Loam")
        agro_zone = ""
        major_crops = []
        location_ctx_str = ""

    weather_str = f"Temp: {weather.get('temperature')}°C, Humidity: {weather.get('humidity')}%, Wind: {weather.get('windspeed', 5)} km/h, Conditions: {weather.get('description', 'Normal')}"

    return {
        "district": district,
        "state": state,
        "weather": weather,
        "weather_str": weather_str,
        "season": season,
        "soil_type": soil_type,
        "agro_zone": agro_zone,
        "major_crops": major_crops,
        "location_ctx_str": location_ctx_str,
        "crop": crop,
        "user": user
    }
