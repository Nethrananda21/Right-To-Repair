"""
YouTube Search Engine - Web Scraping with Transcript Support
No API keys required!
"""
import asyncio
import re
import json
from typing import List
from urllib.parse import quote_plus

from .fetcher import AsyncFetcher
from .models import YouTubeResult


class YouTubeSearch:
    """YouTube video search engine using web scraping"""
    
    def __init__(self):
        self.fetcher = AsyncFetcher()
    
    async def search(self, query: str, max_results: int = 10) -> List[YouTubeResult]:
        """Search YouTube for relevant videos"""
        results = await self._search_scrape(query, max_results)
        
        # Fetch transcripts for top results (limits to 5 for speed)
        await self._enrich_transcripts(results[:5])
        
        # Calculate relevance
        results = self._calculate_relevance(results, query)
        
        # Sort by relevance
        results.sort(key=lambda x: x.relevance, reverse=True)
        return results[:max_results]
    
    async def _enrich_transcripts(self, results: List[YouTubeResult]):
        """Fetch transcripts for videos"""
        tasks = [self._get_transcript(r.video_id) for r in results]
        transcripts = await asyncio.gather(*tasks, return_exceptions=True)
        
        for result, transcript in zip(results, transcripts):
            if isinstance(transcript, str) and transcript:
                result.transcript = transcript[:500]
    
    async def _get_transcript(self, video_id: str) -> str:
        """Extract transcript using youtube-transcript-api"""
        try:
            from youtube_transcript_api import YouTubeTranscriptApi
            
            loop = asyncio.get_event_loop()
            
            def fetch_transcript():
                try:
                    transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)
                    
                    # Try English first
                    for lang in ['en', 'en-US', 'en-GB']:
                        try:
                            transcript = transcript_list.find_transcript([lang])
                            entries = transcript.fetch()
                            return ' '.join(entry['text'] for entry in entries[:50])
                        except:
                            continue
                    
                    # Try auto-generated
                    try:
                        transcript = transcript_list.find_generated_transcript(['en'])
                        entries = transcript.fetch()
                        return ' '.join(entry['text'] for entry in entries[:50])
                    except:
                        pass
                    
                    return ""
                except:
                    return ""
            
            return await loop.run_in_executor(None, fetch_transcript)
            
        except ImportError:
            return ""
        except Exception:
            return ""
    
    async def _search_scrape(self, query: str, limit: int = 10) -> List[YouTubeResult]:
        """Search YouTube via web scraping"""
        results = []
        encoded = quote_plus(query)
        url = f"https://www.youtube.com/results?search_query={encoded}"
        
        try:
            html = await self.fetcher.fetch(url)
            if html:
                # Extract ytInitialData JSON
                match = re.search(r'var ytInitialData = ({.*?});', html, re.DOTALL)
                if match:
                    data = json.loads(match.group(1))
                    results = self._parse_scrape_data(data, limit)
                else:
                    match = re.search(r'ytInitialData\s*=\s*({.*?});', html, re.DOTALL)
                    if match:
                        data = json.loads(match.group(1))
                        results = self._parse_scrape_data(data, limit)
        except Exception as e:
            print(f"YouTube search error: {e}")
        
        return results
    
    def _parse_scrape_data(self, data: dict, limit: int) -> List[YouTubeResult]:
        """Parse video data from YouTube's JSON"""
        results = []
        
        try:
            contents = (
                data.get("contents", {})
                .get("twoColumnSearchResultsRenderer", {})
                .get("primaryContents", {})
                .get("sectionListRenderer", {})
                .get("contents", [])
            )
            
            for section in contents:
                items = (
                    section.get("itemSectionRenderer", {})
                    .get("contents", [])
                )
                
                for item in items:
                    video = item.get("videoRenderer")
                    if video and len(results) < limit:
                        video_id = video.get("videoId", "")
                        
                        if not video_id:
                            continue
                        
                        # Title
                        title_runs = video.get("title", {}).get("runs", [])
                        title = title_runs[0].get("text", "") if title_runs else ""
                        
                        # Channel
                        channel_runs = video.get("ownerText", {}).get("runs", [])
                        channel = ""
                        if channel_runs:
                            channel = channel_runs[0].get("text", "")
                        
                        # Views
                        views = video.get("viewCountText", {}).get("simpleText", "")
                        
                        # Duration
                        duration = video.get("lengthText", {}).get("simpleText", "")
                        
                        # Thumbnail
                        thumbs = video.get("thumbnail", {}).get("thumbnails", [])
                        thumb = thumbs[-1].get("url", "") if thumbs else f"https://i.ytimg.com/vi/{video_id}/hqdefault.jpg"
                        
                        results.append(YouTubeResult(
                            title=title,
                            url=f"https://www.youtube.com/watch?v={video_id}",
                            video_id=video_id,
                            channel=channel,
                            duration=duration,
                            views=views,
                            thumbnail=thumb,
                        ))
        except Exception as e:
            print(f"YouTube parse error: {e}")
        
        return results
    
    def _calculate_relevance(self, results: List[YouTubeResult], query: str) -> List[YouTubeResult]:
        """Calculate relevance score"""
        query_terms = set(query.lower().split())
        
        # Repair-focused keywords boost
        repair_terms = {'fix', 'repair', 'tutorial', 'guide', 'how to', 'diy', 'replace', 'broken'}
        
        for result in results:
            score = 0.0
            
            # Title relevance (50%)
            title_lower = result.title.lower()
            title_terms = set(title_lower.split())
            title_overlap = len(query_terms & title_terms) / len(query_terms) if query_terms else 0
            score += title_overlap * 0.5
            
            # Repair term boost (20%)
            if any(term in title_lower for term in repair_terms):
                score += 0.2
            
            # Transcript relevance (20%)
            if result.transcript:
                transcript_lower = result.transcript.lower()
                transcript_terms = set(transcript_lower.split())
                transcript_overlap = len(query_terms & transcript_terms) / len(query_terms) if query_terms else 0
                score += transcript_overlap * 0.2
            
            # Channel quality indicators (10%)
            channel_lower = result.channel.lower()
            quality_channels = ['ifixit', 'jerryrigeverything', 'ltt', 'linus', 'hugh jeffreys']
            if any(ch in channel_lower for ch in quality_channels):
                score += 0.1
            
            result.relevance = min(score, 1.0)
        
        return results


def create_youtube_search() -> YouTubeSearch:
    return YouTubeSearch()
