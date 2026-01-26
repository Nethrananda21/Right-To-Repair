"""
Search Service - DuckDuckGo web search for repair guides
No API keys required - uses ddgs library
"""
import asyncio
from ddgs import DDGS
from typing import Optional
from urllib.parse import urlparse


class SearchService:
    def __init__(self):
        pass  # DDGS is created per-request
    
    def build_repair_query(self, object_name: str, brand: str, model: str, issues: list) -> str:
        """Build optimized search query from detection result"""
        parts = []
        
        # Always include object type for context (laptop, headphones, etc.)
        if object_name and object_name.lower() not in ["unknown", ""]:
            parts.append(object_name)
        
        if brand and brand.lower() not in ["unknown", ""]:
            parts.append(brand)
        if model and model.lower() not in ["unknown", ""]:
            parts.append(model)
        
        # Add top issue (clean it up)
        if issues and len(issues) > 0:
            issue = issues[0]
            # Extract just the problem part if formatted as "Location: Problem"
            if ":" in issue:
                issue = issue.split(":")[-1].strip()
            parts.append(issue)
        
        parts.append("repair guide")
        
        return " ".join(parts)
    
    def extract_component_from_issues(self, issues: list) -> str:
        """Extract the damaged component name from issues list"""
        if not issues:
            return ""
        
        # Common component keywords to look for
        components = [
            'screen', 'display', 'lcd', 'battery', 'keyboard', 'trackpad', 'touchpad',
            'speaker', 'camera', 'microphone', 'port', 'usb', 'charging', 'hinge',
            'fan', 'motherboard', 'ram', 'ssd', 'hard drive', 'power button',
            'headphone jack', 'wifi', 'bluetooth', 'antenna', 'glass', 'back cover',
            'front cover', 'bezel', 'frame', 'button', 'connector', 'cable', 'flex'
        ]
        
        # Check each issue for component keywords
        for issue in issues:
            issue_lower = issue.lower()
            for component in components:
                if component in issue_lower:
                    return component
        
        # If no specific component found, extract the first word of first issue
        # (often the component like "screen cracked" -> "screen")
        if issues:
            first_issue = issues[0].lower()
            # Handle "Location: Problem" format
            if ":" in first_issue:
                first_issue = first_issue.split(":")[0].strip()
            first_word = first_issue.split()[0] if first_issue.split() else ""
            # Only use if it looks like a component (not a verb or adjective)
            skip_words = ['broken', 'damaged', 'cracked', 'not', 'does', 'won\'t', 'can\'t', 'dead', 'faulty']
            if first_word and first_word not in skip_words:
                return first_word
        
        return ""
    
    def build_parts_query(self, object_name: str, brand: str, model: str, issues: list = None) -> str:
        """Build search query for replacement parts - uses component from issues if available"""
        parts = []
        
        # Extract the specific component from issues (e.g., "screen" from "screen cracked")
        component = self.extract_component_from_issues(issues or [])
        
        if component:
            # Use the specific component instead of general object name
            # e.g., "HP screen replacement" instead of "HP laptop replacement"
            parts.append(component)
        elif object_name and object_name.lower() not in ["unknown", ""]:
            # Fallback to general object if no specific component found
            parts.append(object_name)
        
        if brand and brand.lower() not in ["unknown", ""]:
            parts.append(brand)
        if model and model.lower() not in ["unknown", ""]:
            parts.append(model)
        
        parts.append("replacement parts buy")
        
        query = " ".join(parts)
        print(f"Parts search query: {query}")
        return query
    
    async def search_repair_guides(
        self,
        object_name: str,
        brand: str = "",
        model: str = "",
        issues: list = None,
        max_results: int = 10
    ) -> list:
        """Search for repair guides and tutorials"""
        query = self.build_repair_query(object_name, brand, model, issues or [])
        
        try:
            loop = asyncio.get_event_loop()
            results = await loop.run_in_executor(None, self._search_sync, query, max_results)
            return results
        except Exception as e:
            print(f"Search error: {e}")
            return []
    
    def _search_sync(self, query: str, max_results: int) -> list:
        """Synchronous search helper"""
        formatted = []
        try:
            with DDGS() as ddgs:
                results = list(ddgs.text(query, max_results=max_results))
                
                for r in results:
                    url = r.get("href", r.get("link", ""))
                    formatted.append({
                        "title": r.get("title", ""),
                        "url": url,
                        "snippet": r.get("body", r.get("snippet", "")),
                        "source": self._extract_domain(url)
                    })
        except Exception as e:
            print(f"Search sync error: {e}")
        
        return formatted
    
    async def search_ifixit(
        self,
        object_name: str,
        brand: str = "",
        model: str = ""
    ) -> list:
        """Search specifically for iFixit guides"""
        parts = []
        
        # Always include object type for accurate results
        if object_name and object_name.lower() not in ["unknown", ""]:
            parts.append(object_name)
        if brand and brand.lower() not in ["unknown", ""]:
            parts.append(brand)
        if model and model.lower() not in ["unknown", ""]:
            parts.append(model)
        
        query = " ".join(parts) + " repair site:ifixit.com"
        
        try:
            loop = asyncio.get_event_loop()
            results = await loop.run_in_executor(None, self._search_ifixit_sync, query)
            return results
        except Exception as e:
            print(f"iFixit search error: {e}")
            return []
    
    def _search_ifixit_sync(self, query: str) -> list:
        """Synchronous iFixit search helper"""
        formatted = []
        try:
            with DDGS() as ddgs:
                results = list(ddgs.text(query, max_results=5))
                
                for r in results:
                    url = r.get("href", r.get("link", ""))
                    if "ifixit.com" in url:
                        formatted.append({
                            "title": r.get("title", ""),
                            "url": url,
                            "snippet": r.get("body", r.get("snippet", "")),
                            "source": "iFixit"
                        })
        except Exception as e:
            print(f"iFixit sync error: {e}")
        
        return formatted
    
    async def search_spare_parts(
        self,
        object_name: str,
        brand: str = "",
        model: str = "",
        issues: list = None,
        max_results: int = 8
    ) -> list:
        """Search for replacement parts"""
        query = self.build_parts_query(object_name, brand, model, issues)
        
        try:
            loop = asyncio.get_event_loop()
            results = await loop.run_in_executor(None, self._search_sync, query, max_results)
            return results
        except Exception as e:
            print(f"Parts search error: {e}")
            return []
    
    def _extract_domain(self, url: str) -> str:
        """Extract domain name from URL"""
        try:
            parsed = urlparse(url)
            domain = parsed.netloc
            if domain.startswith("www."):
                domain = domain[4:]
            return domain
        except:
            return ""


# Singleton instance
search_service = SearchService()
