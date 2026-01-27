"""
Repair API Routes - Search for repair guides, tutorials, and parts
Uses Deep Search for comprehensive results from Reddit, Forums, and YouTube
"""
import asyncio
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from services.deep_search import deep_search
from services.guide_extractor import guide_extractor

router = APIRouter()


class RepairSearchRequest(BaseModel):
    object: str
    brand: str = ""
    model: str = ""
    issues: list[str] = []


class RepairSearchResponse(BaseModel):
    youtube: list
    web: list
    reddit: list = []
    query_used: str
    search_time_ms: float = 0.0


class TranscriptRequest(BaseModel):
    video_id: str


class TranscriptResponse(BaseModel):
    video_id: str
    title: str
    description: str
    summary: str


class ExtractRequest(BaseModel):
    url: str


@router.post("/search", response_model=RepairSearchResponse)
async def search_repairs(request: RepairSearchRequest):
    """
    Search for repair guides from Reddit, Forums, and YouTube using Deep Search.
    """
    try:
        # Build search query from request
        query_parts = []
        if request.brand:
            query_parts.append(request.brand)
        if request.model:
            query_parts.append(request.model)
        if request.object:
            query_parts.append(request.object)
        if request.issues:
            # Add first issue for specificity
            first_issue = request.issues[0]
            if ":" in first_issue:
                first_issue = first_issue.split(":")[-1].strip()
            query_parts.append(first_issue)
        query_parts.append("repair")
        
        search_query = " ".join(query_parts)
        context = f"Issues: {', '.join(request.issues)}" if request.issues else None
        
        # Run deep search
        results = await deep_search({
            "query": search_query,
            "context": context,
            "sources": ["reddit", "forums", "youtube"],
            "max_results": 10
        })
        
        return RepairSearchResponse(
            youtube=results.get("results", {}).get("youtube", []),
            web=results.get("results", {}).get("forums", []),
            reddit=results.get("results", {}).get("reddit", []),
            query_used=search_query,
            search_time_ms=results.get("search_time_ms", 0)
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")


@router.post("/transcript", response_model=TranscriptResponse)
async def get_video_transcript(request: TranscriptRequest):
    """Get video info and transcript."""
    try:
        from services.deep_search.youtube_search import YouTubeSearch
        
        youtube = YouTubeSearch()
        transcript = await youtube._get_transcript(request.video_id)
        
        return TranscriptResponse(
            video_id=request.video_id,
            title="",  # Would need separate API call for title
            description="",
            summary=transcript[:1000] if transcript else "No transcript available"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Transcript failed: {str(e)}")


@router.post("/extract")
async def extract_guide(request: ExtractRequest):
    """Extract repair guide content from a URL."""
    try:
        url = request.url
        
        if "ifixit.com" in url:
            result = await guide_extractor.extract_ifixit_guide(url)
        else:
            result = await guide_extractor.extract_article_content(url)
        
        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Extraction failed: {str(e)}")


@router.post("/parts")
async def search_parts(request: RepairSearchRequest):
    """Search for replacement parts using deep search."""
    try:
        # Build parts-specific query
        query_parts = []
        if request.brand:
            query_parts.append(request.brand)
        if request.model:
            query_parts.append(request.model)
        if request.object:
            query_parts.append(request.object)
        query_parts.append("replacement parts buy")
        
        search_query = " ".join(query_parts)
        
        # Use forums search for parts (includes eBay, Amazon links)
        results = await deep_search({
            "query": search_query,
            "sources": ["forums"],
            "max_results": 10
        })
        
        return {"parts": results.get("results", {}).get("forums", [])}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Parts search failed: {str(e)}")
