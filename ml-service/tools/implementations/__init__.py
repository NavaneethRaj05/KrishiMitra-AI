from tools.registry import tool_registry

from .weather_tool import WeatherTool
from .market_tool import MarketTool
from .crop_tool import CropTool
from .disease_tool import DiseaseTool
from .rag_tool import RagTool
from .kag_tool import KagTool

# Initialize tools
weather_tool = WeatherTool()
market_tool = MarketTool()
crop_tool = CropTool()
disease_tool = DiseaseTool()
rag_tool = RagTool()
kag_tool = KagTool()

# Register tools automatically
tool_registry.register(weather_tool)
tool_registry.register(market_tool)
tool_registry.register(crop_tool)
tool_registry.register(disease_tool)
tool_registry.register(rag_tool)
tool_registry.register(kag_tool)

__all__ = [
    "weather_tool",
    "market_tool",
    "crop_tool",
    "disease_tool",
    "rag_tool",
    "kag_tool"
]
