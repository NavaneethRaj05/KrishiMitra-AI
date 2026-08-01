from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

class ToolResult(BaseModel):
    """Standardized output format for all tools."""
    success: bool
    data: Any
    message: str = ""
    metadata: Dict[str, Any] = Field(default_factory=dict)

class BaseTool(ABC):
    """Abstract base class for all KrishiMitra tools."""
    
    @property
    @abstractmethod
    def name(self) -> str:
        """The unique name of the tool."""
        pass
        
    @property
    @abstractmethod
    def description(self) -> str:
        """Description of what the tool does and when to use it."""
        pass
        
    @property
    def required_params(self) -> List[str]:
        """List of required parameters in kwargs for execute."""
        return []

    @abstractmethod
    async def execute(self, **kwargs) -> ToolResult:
        """
        Execute the tool with the given parameters.
        Must return a ToolResult.
        """
        pass
