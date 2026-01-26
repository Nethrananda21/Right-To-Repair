"""
Repair API Routes - Search for repair guides, tutorials, and parts
"""
import asyncio
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from services.youtube_service import youtube_service
from services.search_service import search_service
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
    ifixit: list
    parts: list = []
    query_used: str


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
    Search for repair guides from YouTube, web, iFixit, and spare parts concurrently.
    """
    try:
        # Build search query
        query = search_service.build_repair_query(
            request.object,
            request.brand,
            request.model,
            request.issues
        )
        
        # Create tasks for parallel execution
        youtube_task = youtube_service.search_tutorials(f"{query} tutorial", max_results=5)
        web_task = search_service.search_repair_guides(
            request.object,
            request.brand,
            request.model,
            request.issues,
            max_results=8
        )
        ifixit_task = search_service.search_ifixit(
            request.object,
            request.brand,
            request.model
        )
        parts_task = search_service.search_spare_parts(
            request.object,
            request.brand,
            request.model,
            max_results=6
        )
        
        # Run all searches concurrently
        youtube_results, web_results, ifixit_results, parts_results = await asyncio.gather(
            youtube_task, web_task, ifixit_task, parts_task
        )
        
        return RepairSearchResponse(
            youtube=youtube_results,
            web=web_results,
            ifixit=ifixit_results,
            parts=parts_results,
            query_used=query
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")


@router.post("/transcript", response_model=TranscriptResponse)
async def get_video_transcript(request: TranscriptRequest):
    """Get video info and AI-generated summary."""
    try:
        video_info = await youtube_service.get_video_info(request.video_id)
        
        if not video_info:
            raise HTTPException(status_code=404, detail="Video not found")
        
        transcript = await youtube_service.get_transcript(request.video_id)
        content = transcript or video_info.get("description", "")
        
        summary = ""
        if content:
            summary = await youtube_service.summarize_for_repair(
                video_info.get("title", ""),
                content
            )
        
        return TranscriptResponse(
            video_id=request.video_id,
            title=video_info.get("title", ""),
            description=video_info.get("description", "")[:500],
            summary=summary
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
    """Search for replacement parts."""
    try:
        results = await search_service.search_spare_parts(
            request.object,
            request.brand,
            request.model,
            max_results=10
        )
        
        return {"parts": results}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Parts search failed: {str(e)}")
