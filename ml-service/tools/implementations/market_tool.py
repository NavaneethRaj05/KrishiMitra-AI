"""
Market Tool — Real Agricultural Market Prices
Priority chain:
  1. data.gov.in Open API (free, no registration for basic access)
  2. Tavily web search for current mandi prices
  3. Gemini LLM for contextual price intelligence
  4. MSP (Minimum Support Price) offline fallback — always available
"""
import logging
import os
import httpx
from tools.base import BaseTool, ToolResult

logger = logging.getLogger("krishimitraai.tools.market")

# Government-declared MSP for Kharif & Rabi 2024-25 (guaranteed offline fallback)
MSP_DATA = {
    "paddy":      {"msp": 2300, "season": "Kharif", "grade": "Common"},
    "rice":       {"msp": 2300, "season": "Kharif", "grade": "Common"},
    "jowar":      {"msp": 3371, "season": "Kharif", "grade": "Hybrid"},
    "bajra":      {"msp": 2625, "season": "Kharif", "grade": "—"},
    "maize":      {"msp": 2225, "season": "Kharif", "grade": "—"},
    "ragi":       {"msp": 4290, "season": "Kharif", "grade": "—"},
    "tur":        {"msp": 7550, "season": "Kharif", "grade": "—"},
    "moong":      {"msp": 8682, "season": "Kharif", "grade": "—"},
    "urad":       {"msp": 7400, "season": "Kharif", "grade": "—"},
    "groundnut":  {"msp": 6783, "season": "Kharif", "grade": "—"},
    "sunflower":  {"msp": 7280, "season": "Kharif", "grade": "—"},
    "soybean":    {"msp": 4892, "season": "Kharif", "grade": "Yellow"},
    "cotton":     {"msp": 7121, "season": "Kharif", "grade": "Medium Staple"},
    "wheat":      {"msp": 2275, "season": "Rabi",   "grade": "—"},
    "barley":     {"msp": 1850, "season": "Rabi",   "grade": "—"},
    "gram":       {"msp": 5650, "season": "Rabi",   "grade": "—"},
    "chana":      {"msp": 5650, "season": "Rabi",   "grade": "—"},
    "masur":      {"msp": 6425, "season": "Rabi",   "grade": "—"},
    "lentil":     {"msp": 6425, "season": "Rabi",   "grade": "—"},
    "mustard":    {"msp": 5950, "season": "Rabi",   "grade": "—"},
    "safflower":  {"msp": 5940, "season": "Rabi",   "grade": "—"},
    "sugarcane":  {"msp": 3150, "season": "—",      "grade": "FRP"},
    "coconut":    {"msp": 10860, "season": "—",     "grade": "Milling Copra"},
    "jute":       {"msp": 5250, "season": "Kharif", "grade": "TD-5"},
    "sesamum":    {"msp": 8635, "season": "Kharif", "grade": "—"},
    "nigerseed":  {"msp": 7734, "season": "Kharif", "grade": "—"},
}

# Common commodity name aliases for matching
COMMODITY_ALIASES = {
    "tomato": "tomato", "tamatar": "tomato", "thakkali": "tomato",
    "potato": "potato", "aloo": "potato", "aaloo": "potato",
    "onion": "onion", "pyaz": "onion", "pyaaz": "onion", "eerulli": "onion",
    "rice": "rice", "paddy": "paddy", "dhan": "paddy", "chawal": "rice",
    "wheat": "wheat", "gehun": "wheat", "gehu": "wheat", "godhi": "wheat",
    "maize": "maize", "corn": "maize", "makka": "maize",
    "cotton": "cotton", "kapas": "cotton",
    "soybean": "soybean", "soya": "soybean",
    "groundnut": "groundnut", "peanut": "groundnut", "moongphali": "groundnut",
    "sugarcane": "sugarcane", "ganna": "sugarcane",
    "ragi": "ragi", "finger millet": "ragi", "nachni": "ragi",
    "chana": "chana", "gram": "gram", "chickpea": "chana",
    "tur": "tur", "arhar": "tur", "toor": "tur",
    "moong": "moong", "green gram": "moong",
    "urad": "urad", "black gram": "urad",
    "mustard": "mustard", "sarson": "mustard",
    "jowar": "jowar", "sorghum": "jowar",
    "bajra": "bajra", "pearl millet": "bajra",
    "brinjal": "brinjal", "eggplant": "brinjal",
    "chilli": "chilli", "mirchi": "chilli",
    "banana": "banana", "kela": "banana",
    "mango": "mango", "aam": "mango",
    "coconut": "coconut", "nariyal": "coconut",
}


def _detect_commodity(query: str) -> str:
    """Extract the main commodity from query text using alias matching."""
    q = query.lower()
    for alias, canonical in COMMODITY_ALIASES.items():
        if alias in q:
            return canonical
    return ""


class MarketTool(BaseTool):
    @property
    def name(self) -> str:
        return "market_tool"

    @property
    def description(self) -> str:
        return "Fetches current market (mandi) prices for agricultural commodities using live APIs and government MSP data."

    @property
    def required_params(self) -> list:
        return ["query", "district"]

    async def _fetch_from_data_gov(self, commodity: str, district: str) -> str:
        """Try data.gov.in commodity daily price API (free, no key required for basic)."""
        try:
            # data.gov.in has a public commodity price endpoint
            api_key = os.getenv("DATA_GOV_API_KEY", "")
            params = {
                "api-key": api_key or "579b464db66ec23bdd000001cdd3946e44ce4aad7209ff7b23ac571b",
                "format": "json",
                "limit": 10,
                "filters[commodity]": commodity.title(),
            }
            if district and district.lower() not in ("local", "unknown", "none", ""):
                params["filters[district]"] = district.title()

            async with httpx.AsyncClient(timeout=8) as client:
                res = await client.get(
                    "https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070",
                    params=params,
                )

            if res.status_code == 200:
                data = res.json()
                records = data.get("records", [])
                if records:
                    lines = []
                    seen_markets = set()
                    for r in records[:5]:
                        market = r.get("market", "")
                        if market in seen_markets:
                            continue
                        seen_markets.add(market)
                        modal = r.get("modal_price", "N/A")
                        min_p = r.get("min_price", "N/A")
                        max_p = r.get("max_price", "N/A")
                        dist = r.get("district", district)
                        state = r.get("state", "")
                        commodity_name = r.get("commodity", commodity.title())
                        arrival_date = r.get("arrival_date", "")
                        lines.append(
                            f"- {commodity_name}: Rs.{modal}/quintal "
                            f"(Min: Rs.{min_p}, Max: Rs.{max_p}) "
                            f"at {market} mandi, {dist}, {state}"
                            + (f" (Date: {arrival_date})" if arrival_date else "")
                        )
                    if lines:
                        return "LIVE MANDI PRICES (data.gov.in):\n" + "\n".join(lines)
        except Exception as e:
            logger.warning(f"[data.gov.in] API failed: {e}")
        return ""

    async def _fetch_from_tavily(self, commodity: str, district: str) -> str:
        """Search web for current mandi prices via Tavily."""
        tavily_key = os.getenv("TAVILY_API_KEY", "")
        if not tavily_key:
            return ""
        try:
            search_query = f"current mandi price {commodity} {district} India today per quintal APMC"
            async with httpx.AsyncClient(timeout=8) as client:
                res = await client.post(
                    "https://api.tavily.com/search",
                    json={
                        "api_key": tavily_key,
                        "query": search_query,
                        "search_depth": "basic",
                        "include_domains": [
                            "agmarknet.gov.in", "commodityonline.com",
                            "krishijagran.com", "agriwatch.com",
                            "mandibhav.com", "marketyard.in",
                        ],
                        "max_results": 3,
                    },
                )
            data = res.json()
            results = data.get("results", [])
            if results:
                snippets = []
                for r in results[:3]:
                    title = r.get("title", "")
                    content = r.get("content", "")[:200]
                    url = r.get("url", "")
                    snippets.append(f"- [{title}]({url}): {content}")
                return "WEB PRICE INTELLIGENCE:\n" + "\n".join(snippets)
        except Exception as e:
            logger.warning(f"[Tavily Market] {e}")
        return ""

    async def _get_gemini_estimate(self, commodity: str, district: str) -> str:
        """Use Gemini LLM for contextual price estimate when APIs fail."""
        try:
            from services.unified_llm_service import unified_llm_service
            prompt = (
                f"What is the approximate current market price of {commodity} "
                f"in {district}, India in Rs per quintal? "
                f"Give a brief factual answer with price range and market context. "
                f"If you don't know the exact current price, give the typical recent range. "
                f"Also mention the current MSP if applicable. Keep it under 100 words."
            )
            answer = await unified_llm_service.chat(
                system_prompt="You are an Indian agricultural market expert. Give factual, specific price information.",
                user_message=prompt,
                temperature=0.2,
            )
            return f"AI MARKET ESTIMATE:\n{answer}"
        except Exception as e:
            logger.warning(f"[Gemini Market] {e}")
        return ""

    def _get_msp_fallback(self, commodity: str) -> str:
        """Return government MSP data as offline fallback."""
        canonical = COMMODITY_ALIASES.get(commodity.lower(), commodity.lower())
        msp_entry = MSP_DATA.get(canonical)
        if msp_entry:
            return (
                f"GOVERNMENT MSP DATA (2024-25):\n"
                f"- {canonical.title()}: Rs.{msp_entry['msp']}/quintal "
                f"(MSP — {msp_entry['season']} season"
                f"{', Grade: ' + msp_entry['grade'] if msp_entry['grade'] != '—' else ''})\n"
                f"- Note: Actual mandi prices may be higher or lower than MSP depending on demand and supply.\n"
                f"- Check agmarknet.gov.in or mandibhav.com for live rates at your nearest mandi."
            )
        return ""

    async def execute(self, **kwargs) -> ToolResult:
        query = kwargs.get("query", "").lower()
        district = kwargs.get("district", "Local")

        commodity = _detect_commodity(query)
        if not commodity:
            # Try to extract from raw query words
            for word in query.split():
                if word in COMMODITY_ALIASES:
                    commodity = COMMODITY_ALIASES[word]
                    break

        if not commodity:
            commodity = query.replace("price", "").replace("market", "").replace("mandi", "").strip()

        results_parts = []

        # 1. Try data.gov.in live API
        live_data = await self._fetch_from_data_gov(commodity, district)
        if live_data:
            results_parts.append(live_data)

        # 2. Try Tavily web search for price context
        web_data = await self._fetch_from_tavily(commodity, district)
        if web_data:
            results_parts.append(web_data)

        # 3. If no live data, get Gemini estimate
        if not results_parts:
            gemini_data = await self._get_gemini_estimate(commodity, district)
            if gemini_data:
                results_parts.append(gemini_data)

        # 4. Always include MSP as reference
        msp_data = self._get_msp_fallback(commodity)
        if msp_data:
            results_parts.append(msp_data)

        if results_parts:
            data = "\n\n".join(results_parts)
            return ToolResult(success=True, data=data, message=f"Market prices retrieved for {commodity}.")
        else:
            fallback = (
                f"Could not fetch live prices for '{commodity}' in {district}.\n"
                f"Please check:\n"
                f"- agmarknet.gov.in — Official mandi prices\n"
                f"- mandibhav.com — Daily mandi rates\n"
                f"- Kisan Call Centre: 1800-180-1551 (toll-free)"
            )
            return ToolResult(success=True, data=fallback, message="Live prices unavailable, showing guidance.")
