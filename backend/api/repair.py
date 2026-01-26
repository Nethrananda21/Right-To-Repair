"""
Repair API Routes - Search for repair solutions, guides, and spare parts
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from services.search_service import search_service

router = APIRouter()


class RepairSearchRequest(BaseModel):
    object_name: str
    brand: Optional[str] = ""
    model: Optional[str] = ""
    serial_number: Optional[str] = ""
    issue: Optional[str] = ""


class WebResult(BaseModel):
    title: str
    url: str
    snippet: Optional[str] = ""
    source: str


class YouTubeResult(BaseModel):
    title: str
    video_id: str
    url: str
    channel: str
    views: Optional[str] = ""
    duration: Optional[str] = ""
    thumbnail: Optional[str] = ""
    source: str


class IFixitResult(BaseModel):
    title: str
    url: str
    source: str
    type: Optional[str] = "guide"


class SparePartResult(BaseModel):
    store: str
    search_url: str
    icon: str
    query: str


class RepairSearchResponse(BaseModel):
    query: str
    web_results: list[WebResult]
    youtube_tutorials: list[YouTubeResult]
    ifixit_guides: list[IFixitResult]
    spare_parts: list[SparePartResult]


class GuideStep(BaseModel):
    number: int
    text: str


class GuideContentResponse(BaseModel):
    url: str
    title: str
    steps: list[GuideStep]
    tools: list[str]
    difficulty: Optional[str] = ""
    time_estimate: Optional[str] = ""
    error: Optional[str] = None


@router.post("/search", response_model=RepairSearchResponse)
async def search_repairs(request: RepairSearchRequest):
    """
    Search for repair solutions, YouTube tutorials, and spare parts.
    
    Combines results from:
    - Web search (DuckDuckGo)
    - YouTube tutorials
    - iFixit repair guides
    - Spare parts stores (Amazon, AliExpress, eBay, iFixit)
    """
    try:
        results = await search_service.search_repair_solutions(
            object_name=request.object_name,
            brand=request.brand or "",
            model=request.model or "",
            issue=request.issue or ""
        )
        
        return RepairSearchResponse(
            query=results["query"],
            web_results=[WebResult(**r) for r in results["web_results"]],
            youtube_tutorials=[YouTubeResult(**r) for r in results["youtube_tutorials"]],
            ifixit_guides=[IFixitResult(**r) for r in results["ifixit_guides"]],
            spare_parts=[SparePartResult(**r) for r in results["spare_parts"]]
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")


@router.post("/guide", response_model=GuideContentResponse)
async def extract_guide(url: str):
    """
    Extract repair guide content from a URL.
    Works best with iFixit guides but also supports general web pages.
    """
    try:
        content = await search_service.extract_guide_content(url)
        return GuideContentResponse(
            url=content["url"],
            title=content["title"],
            steps=[GuideStep(**s) for s in content["steps"]],
            tools=content["tools"],
            difficulty=content.get("difficulty", ""),
            time_estimate=content.get("time_estimate", ""),
            error=content.get("error")
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Guide extraction failed: {str(e)}")
