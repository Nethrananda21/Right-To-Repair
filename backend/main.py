"""
Right to Repair - FastAPI Backend
Main application entry point
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.detect import router as detect_router
from api.repair import router as repair_router
from api.chat import router as chat_router
from api.vision_stream import router as vision_stream_router
from services.database import db_service
from services.ollama_service import ollama_service


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database and model on startup"""
    await db_service.initialize()
    await ollama_service.warmup()  # Pre-load model for faster first inference
    yield


app = FastAPI(
    title="Right to Repair API",
    description="AI-powered object detection and repair solution finder",
    version="2.0.0",
    lifespan=lifespan
)

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(detect_router, prefix="/api/detect", tags=["Detection"])
app.include_router(repair_router, prefix="/api/repair", tags=["Repair"])
app.include_router(chat_router, prefix="/api/chat", tags=["Chat"])
app.include_router(vision_stream_router, tags=["Live Video"])


@app.get("/")
async def root():
    return {"message": "Right to Repair API", "version": "2.0.0", "status": "running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

