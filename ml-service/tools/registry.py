from typing import Dict, List, Type
from tools.base import BaseTool
import logging

logger = logging.getLogger("krishimitraai.tool_registry")

class ToolRegistry:
    """Registry to manage and retrieve available tools."""
    
    def __init__(self):
        self._tools: Dict[str, BaseTool] = {}
        
    def register(self, tool: BaseTool) -> None:
        """Register a tool instance."""
        if tool.name in self._tools:
            logger.warning(f"Tool {tool.name} is already registered. Overwriting.")
        self._tools[tool.name] = tool
        
    def get_tool(self, name: str) -> BaseTool:
        """Retrieve a tool by name."""
        if name not in self._tools:
            raise KeyError(f"Tool '{name}' not found in registry.")
        return self._tools[name]
        
    def get_all_tools(self) -> List[BaseTool]:
        """Get a list of all registered tools."""
        return list(self._tools.values())
        
    def get_tool_descriptions(self) -> str:
        """Get formatted descriptions of all tools for the LLM Planner."""
        descriptions = []
        for tool in self._tools.values():
            params = ", ".join(tool.required_params) if tool.required_params else "None"
            desc = f"- **{tool.name}**: {tool.description} (Required params: {params})"
            descriptions.append(desc)
        return "\n".join(descriptions)

# Global registry instance
tool_registry = ToolRegistry()
