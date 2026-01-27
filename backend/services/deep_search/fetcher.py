"""
Async HTTP Fetcher utility for web scraping
"""
import asyncio
import httpx
from typing import Optional
from .config import config


class AsyncFetcher:
    """Async HTTP client for web scraping"""
    
    def __init__(self):
        self.headers = {
            "User-Agent": config.USER_AGENT,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
        }
        self._client: Optional[httpx.AsyncClient] = None
    
    async def get_client(self) -> httpx.AsyncClient:
        """Get or create HTTP client"""
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                headers=self.headers,
                timeout=httpx.Timeout(config.REQUEST_TIMEOUT),
                follow_redirects=True,
                limits=httpx.Limits(max_connections=config.MAX_CONCURRENT_REQUESTS)
            )
        return self._client
    
    async def fetch(self, url: str, json_response: bool = False) -> Optional[str | dict]:
        """Fetch a URL and return content"""
        try:
            client = await self.get_client()
            response = await client.get(url)
            
            if response.status_code == 200:
                if json_response:
                    return response.json()
                return response.text
        except Exception as e:
            print(f"Fetch error for {url}: {e}")
        
        return None
    
    async def close(self):
        """Close the HTTP client"""
        if self._client and not self._client.is_closed:
            await self._client.aclose()
