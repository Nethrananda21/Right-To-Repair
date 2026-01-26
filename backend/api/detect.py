"""
Detection API Routes
"""
from fastapi import APIRouter, UploadFile, File, HTTPException
from typing import Optional
from pydantic import BaseModel
from services.ollama_service import ollama_service

router = APIRouter()


class DetectionResponse(BaseModel):
    object: str
    brand: str
    model: str
    serial_number: str
    manufacturer: str
    condition: str
    issues: list[str]
    description: str
    other_codes: list[str]
    confidence_note: str


class ObjectDetectionResponse(BaseModel):
    object: str
    brand: str
    model: str
    condition: str
    issues: list[str]
    description: str


class SerialExtractionResponse(BaseModel):
    serial_number: str
    model_number: str
    manufacturer: str
    other_codes: list[str]


@router.post("/full", response_model=DetectionResponse)
async def detect_full(
    item_image: UploadFile = File(..., description="Image of the item"),
    serial_image: Optional[UploadFile] = File(None, description="Image of the serial number/label")
):
    """
    Combined detection endpoint - analyzes item and serial number images together.
    
    Upload both images at once:
    - item_image: Main image of the broken/damaged item
    - serial_image: (Optional) Close-up of serial number, label, or product info
    
    Returns detected object info, brand, model, serial number, condition, and issues.
    """
    try:
        # Read item image
        item_bytes = await item_image.read()
        
        # Read serial image if provided
        serial_bytes = None
        if serial_image:
            serial_bytes = await serial_image.read()
        
        # Run combined detection
        result = await ollama_service.combined_detection(item_bytes, serial_bytes)
        
        return DetectionResponse(**result)
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Detection failed: {str(e)}")


@router.post("/object", response_model=ObjectDetectionResponse)
async def detect_object(
    image: UploadFile = File(..., description="Image of the item to detect")
):
    """Detect object, brand, model, and condition from a single image"""
    try:
        image_bytes = await image.read()
        result = await ollama_service.detect_object(image_bytes)
        return ObjectDetectionResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Detection failed: {str(e)}")


@router.post("/serial", response_model=SerialExtractionResponse)
async def extract_serial(
    image: UploadFile = File(..., description="Image containing serial number")
):
    """Extract serial number and product codes from image"""
    try:
        image_bytes = await image.read()
        result = await ollama_service.extract_serial(image_bytes)
        return SerialExtractionResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Serial extraction failed: {str(e)}")
