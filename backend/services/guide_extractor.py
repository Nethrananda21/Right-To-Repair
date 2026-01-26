"""
Guide Extractor - Extract repair guides from iFixit and web articles
"""
import httpx
from bs4 import BeautifulSoup
from typing import Optional


class GuideExtractor:
    def __init__(self):
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
    
    async def extract_ifixit_guide(self, url: str) -> dict:
        """Extract structured guide from iFixit URL"""
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(url, headers=self.headers, follow_redirects=True)
                
                if response.status_code != 200:
                    return {"error": "Failed to fetch page"}
                
                soup = BeautifulSoup(response.text, "lxml")
                
                # Extract title
                title = ""
                title_elem = soup.find("h1", class_="title")
                if title_elem:
                    title = title_elem.get_text(strip=True)
                else:
                    title_elem = soup.find("h1")
                    if title_elem:
                        title = title_elem.get_text(strip=True)
                
                # Extract difficulty
                difficulty = ""
                diff_elem = soup.find("div", class_="difficulty")
                if diff_elem:
                    difficulty = diff_elem.get_text(strip=True)
                
                # Extract time estimate
                time_estimate = ""
                time_elem = soup.find("div", class_="time-required")
                if time_elem:
                    time_estimate = time_elem.get_text(strip=True)
                
                # Extract tools
                tools = []
                tools_section = soup.find("div", class_="tools")
                if tools_section:
                    tool_items = tools_section.find_all("a")
                    tools = [t.get_text(strip=True) for t in tool_items]
                
                # Extract parts
                parts = []
                parts_section = soup.find("div", class_="parts")
                if parts_section:
                    part_items = parts_section.find_all("a")
                    parts = [p.get_text(strip=True) for p in part_items]
                
                # Extract steps
                steps = []
                step_sections = soup.find_all("div", class_="step")
                for i, step in enumerate(step_sections, 1):
                    step_text = ""
                    content = step.find("div", class_="step-content")
                    if content:
                        paragraphs = content.find_all("p")
                        step_text = " ".join([p.get_text(strip=True) for p in paragraphs])
                    
                    if step_text:
                        steps.append({
                            "number": i,
                            "text": step_text
                        })
                
                return {
                    "title": title,
                    "url": url,
                    "difficulty": difficulty,
                    "time_estimate": time_estimate,
                    "tools": tools,
                    "parts": parts,
                    "steps": steps,
                    "source": "iFixit"
                }
                
        except Exception as e:
            print(f"iFixit extraction error: {e}")
            return {"error": str(e)}
    
    async def extract_article_content(self, url: str) -> dict:
        """Extract main content from any web article"""
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(url, headers=self.headers, follow_redirects=True)
                
                if response.status_code != 200:
                    return {"error": "Failed to fetch page"}
                
                soup = BeautifulSoup(response.text, "lxml")
                
                # Remove script and style elements
                for script in soup(["script", "style", "nav", "footer", "header"]):
                    script.decompose()
                
                # Get title
                title = ""
                title_elem = soup.find("title")
                if title_elem:
                    title = title_elem.get_text(strip=True)
                
                # Try to find main content
                main_content = ""
                
                # Look for article or main tags
                article = soup.find("article") or soup.find("main")
                if article:
                    paragraphs = article.find_all("p")
                    main_content = "\n\n".join([p.get_text(strip=True) for p in paragraphs if len(p.get_text(strip=True)) > 50])
                else:
                    # Fallback: get all paragraphs
                    paragraphs = soup.find_all("p")
                    main_content = "\n\n".join([p.get_text(strip=True) for p in paragraphs if len(p.get_text(strip=True)) > 50][:10])
                
                # Extract any lists (often contain steps)
                lists = []
                for ol in soup.find_all(["ol", "ul"]):
                    items = ol.find_all("li")
                    if len(items) >= 3:  # Likely a meaningful list
                        lists.append([li.get_text(strip=True) for li in items])
                
                return {
                    "title": title,
                    "url": url,
                    "content": main_content[:3000],  # Limit content size
                    "lists": lists[:3],  # Top 3 lists
                    "source": self._extract_domain(url)
                }
                
        except Exception as e:
            print(f"Article extraction error: {e}")
            return {"error": str(e)}
    
    def _extract_domain(self, url: str) -> str:
        """Extract domain name from URL"""
        try:
            from urllib.parse import urlparse
            parsed = urlparse(url)
            domain = parsed.netloc
            if domain.startswith("www."):
                domain = domain[4:]
            return domain
        except:
            return ""


# Singleton instance
guide_extractor = GuideExtractor()
