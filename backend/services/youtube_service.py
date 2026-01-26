"""
YouTube Service - Search tutorials and extract transcripts via yt-dlp
No API keys required - uses Python yt-dlp module
"""
import asyncio
import yt_dlp
from typing import Optional
import httpx


class YouTubeService:
    def __init__(self):
        # yt-dlp options for search
        self.search_opts = {
            'quiet': True,
            'no_warnings': True,
            'extract_flat': True,
            'default_search': 'ytsearch',
        }
        # yt-dlp options for video info
        self.info_opts = {
            'quiet': True,
            'no_warnings': True,
            'skip_download': True,
        }
    
    async def search_tutorials(self, query: str, max_results: int = 5) -> list:
        """Search YouTube for repair tutorials"""
        search_query = f"ytsearch{max_results}:{query}"
        
        try:
            # Run in thread pool to avoid blocking
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(None, self._search_sync, search_query)
            return result
        except Exception as e:
            print(f"YouTube search error: {e}")
            return []
    
    def _search_sync(self, query: str) -> list:
        """Synchronous search helper"""
        videos = []
        try:
            with yt_dlp.YoutubeDL(self.search_opts) as ydl:
                result = ydl.extract_info(query, download=False)
                
                if result and 'entries' in result:
                    for entry in result['entries']:
                        if entry:
                            video_id = entry.get('id', '')
                            videos.append({
                                "video_id": video_id,
                                "title": entry.get('title', ''),
                                "channel": entry.get('channel', entry.get('uploader', '')),
                                "duration": self._format_duration(entry.get('duration')),
                                "views": self._format_views(entry.get('view_count')),
                                "thumbnail": entry.get('thumbnail', f"https://i.ytimg.com/vi/{video_id}/hqdefault.jpg"),
                                "url": f"https://www.youtube.com/watch?v={video_id}"
                            })
        except Exception as e:
            print(f"Search sync error: {e}")
        
        return videos
    
    async def get_video_info(self, video_id: str) -> dict:
        """Get detailed video info including description"""
        url = f"https://www.youtube.com/watch?v={video_id}"
        
        try:
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(None, self._get_info_sync, url)
            return result
        except Exception as e:
            print(f"Video info error: {e}")
            return {}
    
    def _get_info_sync(self, url: str) -> dict:
        """Synchronous video info helper"""
        try:
            with yt_dlp.YoutubeDL(self.info_opts) as ydl:
                info = ydl.extract_info(url, download=False)
                
                if info:
                    return {
                        "video_id": info.get("id", ""),
                        "title": info.get("title", ""),
                        "channel": info.get("channel", info.get("uploader", "")),
                        "description": info.get("description", ""),
                        "duration": self._format_duration(info.get("duration")),
                        "views": self._format_views(info.get("view_count")),
                        "thumbnail": info.get("thumbnail", ""),
                        "url": url
                    }
        except Exception as e:
            print(f"Info sync error: {e}")
        
        return {}
    
    async def get_transcript(self, video_id: str) -> Optional[str]:
        """Get video description as fallback for transcript"""
        info = await self.get_video_info(video_id)
        return info.get("description", None)
    
    async def summarize_for_repair(self, video_title: str, description: str) -> str:
        """Use AI to summarize video content for repair guidance"""
        if not description:
            return "No description available for this video."
        
        prompt = f"""Based on this repair tutorial video, extract the key repair steps:

Video Title: {video_title}
Description: {description[:2000]}

Provide a brief summary of:
1. What is being repaired
2. Tools needed (if mentioned)
3. Key steps

Keep it concise (3-5 bullet points). Do not use thinking tags."""

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    "http://localhost:11434/api/generate",
                    json={
                        "model": "qwen3-vl:4b",
                        "prompt": prompt,
                        "stream": False
                    }
                )
                if response.status_code == 200:
                    return response.json().get("response", "")
        except Exception as e:
            print(f"Summarization error: {e}")
        
        return "Could not generate summary."
    
    def _format_duration(self, seconds) -> str:
        """Format duration in seconds to MM:SS or HH:MM:SS"""
        if not seconds:
            return "N/A"
        seconds = int(seconds)
        if seconds < 3600:
            return f"{seconds // 60}:{seconds % 60:02d}"
        return f"{seconds // 3600}:{(seconds % 3600) // 60:02d}:{seconds % 60:02d}"
    
    def _format_views(self, views) -> str:
        """Format view count to human readable"""
        if not views:
            return "N/A"
        views = int(views)
        if views >= 1_000_000:
            return f"{views / 1_000_000:.1f}M"
        if views >= 1_000:
            return f"{views / 1_000:.1f}K"
        return str(views)


# Singleton instance
youtube_service = YouTubeService()
