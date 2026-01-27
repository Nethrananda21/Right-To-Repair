"""
Pydantic models for search results
"""
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime


class SearchQuery(BaseModel):
    """Input query model"""
    query: str = Field(..., description="The search query")
    context: Optional[str] = Field(None, description="Additional context")
    sources: List[str] = Field(
        default=["reddit", "forums", "youtube"],
        description="Sources to search"
    )
    max_results: int = Field(default=10, description="Max results per source")
    language: str = Field(default="en", description="Language code")


class RedditResult(BaseModel):
    """Reddit search result"""
    title: str
    url: str
    subreddit: str
    score: int = 0
    num_comments: int = 0
    content: str = ""
    author: str = ""
    created_utc: Optional[int] = None
    relevance: float = 0.0


class ForumResult(BaseModel):
    """Forum/Article search result"""
    title: str
    url: str
    source: str
    snippet: str = ""
    relevance: float = 0.0


class YouTubeResult(BaseModel):
    """YouTube video result"""
    title: str
    url: str
    video_id: str
    channel: str = ""
    duration: str = ""
    views: str = ""
    thumbnail: str = ""
    transcript: str = ""
    relevance: float = 0.0


class SearchResults(BaseModel):
    """Aggregated search results"""
    query: str
    timestamp: str = Field(default_factory=lambda: datetime.now().isoformat())
    results: Dict[str, List[Any]] = Field(default_factory=dict)
    total_results: int = 0
    search_time_ms: float = 0.0
    
    def to_dict(self) -> dict:
        """Convert to dictionary"""
        return {
            "query": self.query,
            "timestamp": self.timestamp,
            "results": self.results,
            "total_results": self.total_results,
            "search_time_ms": self.search_time_ms
        }
