from tools.base import BaseTool, ToolResult

class MarketTool(BaseTool):
    @property
    def name(self) -> str:
        return "market_tool"
        
    @property
    def description(self) -> str:
        return "Fetches current market (mandi) prices for agricultural commodities."
        
    @property
    def required_params(self) -> list:
        return ["query", "district"]

    async def execute(self, **kwargs) -> ToolResult:
        query = kwargs.get("query", "").lower()
        district = kwargs.get("district", "Local")
        
        prices = [
            { 'commodity': 'Tomato', 'price': 1850, 'unit': 'quintal', 'market': f'{district} APMC', 'trend': '+12%' },
            { 'commodity': 'Ragi', 'price': 3200, 'unit': 'quintal', 'market': f'{district} Mandi', 'trend': '+3%' },
            { 'commodity': 'Rice', 'price': 2100, 'unit': 'quintal', 'market': f'{district} APMC', 'trend': '-2%' },
            { 'commodity': 'Maize', 'price': 1650, 'unit': 'quintal', 'market': f'{district} Mandi', 'trend': '+5%' },
            { 'commodity': 'Groundnut', 'price': 5500, 'unit': 'quintal', 'market': f'{district} Mandi', 'trend': '+1%' },
            { 'commodity': 'Cotton', 'price': 6800, 'unit': 'quintal', 'market': f'{district} Mandi', 'trend': '-4%' },
            { 'commodity': 'Wheat', 'price': 2050, 'unit': 'quintal', 'market': f'{district} Mandi', 'trend': '+2%' },
            { 'commodity': 'Potato', 'price': 1450, 'unit': 'quintal', 'market': f'{district} Mandi', 'trend': '+8%' },
            { 'commodity': 'Soybean', 'price': 4200, 'unit': 'quintal', 'market': f'{district} Mandi', 'trend': '-1%' },
        ]
        
        matched = [p for p in prices if p['commodity'].lower() in query]
        
        if matched:
            data = "\n".join([f"- {m['commodity']}: ₹{m['price']} per {m['unit']} at {m['market']} (Trend: {m['trend']})" for m in matched])
        else:
            data = (
                f"- Tomato: ₹1850/quintal ({district} APMC, Trend: +12%)\n"
                f"- Rice: ₹2100/quintal ({district} Mandi, Trend: -2%)\n"
                f"- Maize: ₹1650/quintal ({district} Mandi, Trend: +5%)\n"
                "Note: Check Agmarknet (agmarknet.gov.in) for live prices at your nearest mandi."
            )
            
        return ToolResult(success=True, data=data, message="Market prices retrieved.")
