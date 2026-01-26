"""
Right to Repair - FastAPI Backend
Main application entry point
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.detect import router as detect_router

app = FastAPI(
    title="Right to Repair API",
    description="AI-powered object detection and repair solution finder",
    version="1.0.0"
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

@app.get("/")
async def root():
    return {"message": "Right to Repair API", "status": "running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
