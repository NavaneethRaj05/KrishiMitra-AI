import re

with open("c:/Users/aksha/OneDrive/Desktop/KrishiMind/ml-service/routers/query_router.py", "r", encoding="utf-8") as f:
    content = f.read()

# Add get_gps_context import
content = content.replace("from fastapi import APIRouter, Depends, Request, UploadFile, File, Form", "from fastapi import APIRouter, Depends, Request, UploadFile, File, Form\nfrom dependencies.context import get_gps_context, get_current_user")

# Regex replaces for the 4 handlers

pattern_text = r'''@router\.post\("/text"\)\s+async def handle_text_query\(request: TextQueryRequest, user=Depends\(get_current_user\)\):([\s\S]*?)weather_str = f"Temp: \{weather\.get\('temperature'\)\}°C, Humidity: \{weather\.get\('humidity'\)\}%, Wind: \{weather\.get\('windspeed', 5\)\} km/h, Conditions: \{weather\.get\('description', 'Normal'\)\}"'''
repl_text = r'''@router.post("/text")
async def handle_text_query(request: TextQueryRequest, gps_ctx: dict = Depends(get_gps_context)):
    user = gps_ctx["user"]
    district = gps_ctx["district"]
    state = gps_ctx["state"]
    weather = gps_ctx["weather"]
    weather_str = gps_ctx["weather_str"]
    season = gps_ctx["season"]
    soil_type = gps_ctx["soil_type"]
    agro_zone = gps_ctx["agro_zone"]
    major_crops = gps_ctx["major_crops"]
    location_ctx_str = gps_ctx["location_ctx_str"]
    crop = gps_ctx["crop"]
\1'''
content = re.sub(pattern_text, repl_text, content)

pattern_img = r'''@router\.post\("/image"\)\s+async def handle_image_query\(\s+request: Request,\s+file: UploadFile = File\(\.\.\.\),\s+query: Optional\[str\] = Form\(default=None\),\s+user=Depends\(get_current_user\)\s+\):([\s\S]*?)weather_str = f"Temp: \{weather\.get\('temperature'\)\}°C, Humidity: \{weather\.get\('humidity'\)\}%, Wind: \{weather\.get\('windspeed', 5\)\} km/h, Conditions: \{weather\.get\('description', 'Normal'\)\}"'''
repl_img = r'''@router.post("/image")
async def handle_image_query(
    request: Request,
    file: UploadFile = File(...),
    query: Optional[str] = Form(default=None),
    gps_ctx: dict = Depends(get_gps_context)
):
    user = gps_ctx["user"]
    district = gps_ctx["district"]
    state = gps_ctx["state"]
    weather = gps_ctx["weather"]
    weather_str = gps_ctx["weather_str"]
    soil_type = gps_ctx["soil_type"]
    crop = gps_ctx["crop"]
\1'''
content = re.sub(pattern_img, repl_img, content)

pattern_soil = r'''@router\.post\("/soil"\)\s+async def handle_soil_query\(data: SoilData, request: Request, user=Depends\(get_current_user\)\):([\s\S]*?)weather_str = f"Temp: \{weather\.get\('temperature'\)\}°C, Humidity: \{weather\.get\('humidity'\)\}%, Wind: \{weather\.get\('windspeed', 5\)\} km/h, Conditions: \{weather\.get\('description', 'Normal'\)\}"'''
repl_soil = r'''@router.post("/soil")
async def handle_soil_query(data: SoilData, request: Request, gps_ctx: dict = Depends(get_gps_context)):
    user = gps_ctx["user"]
    district = gps_ctx["district"]
    state = gps_ctx["state"]
    weather = gps_ctx["weather"]
    weather_str = gps_ctx["weather_str"]
    soil_type = gps_ctx["soil_type"]
    agro_zone = gps_ctx["agro_zone"]
    location_ctx_str = gps_ctx["location_ctx_str"]
\1'''
content = re.sub(pattern_soil, repl_soil, content)

pattern_voice = r'''@router\.post\("/voice"\)\s+async def handle_voice_query\(request: VoiceQueryRequest, req: Request, user=Depends\(get_current_user\)\):([\s\S]*?)weather_str = f"Temp: \{weather\.get\('temperature'\)\}°C, Humidity: \{weather\.get\('humidity'\)\}%, Wind: \{weather\.get\('windspeed', 5\)\} km/h, Conditions: \{weather\.get\('description', 'Normal'\)\}"'''
repl_voice = r'''@router.post("/voice")
async def handle_voice_query(request: VoiceQueryRequest, req: Request, gps_ctx: dict = Depends(get_gps_context)):
    user = gps_ctx["user"]
    district = gps_ctx["district"]
    state = gps_ctx["state"]
    weather = gps_ctx["weather"]
    weather_str = gps_ctx["weather_str"]
    location_ctx_str = gps_ctx["location_ctx_str"]
\1'''
content = re.sub(pattern_voice, repl_voice, content)

with open("c:/Users/aksha/OneDrive/Desktop/KrishiMind/ml-service/routers/query_router.py", "w", encoding="utf-8") as f:
    f.write(content)
