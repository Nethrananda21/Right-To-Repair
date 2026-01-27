"""
WebSocket endpoint for live video stream analysis
Implements DROP policy: discard frames if GPU is busy, don't queue
"""
import asyncio
import base64
import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from services.ollama_service import ollama_service
from services.database import db_service
from time import time
from typing import Optional

router = APIRouter()


class LiveVisionStream:
    """Manages WebSocket connections for live video analysis"""
    
    def __init__(self):
        self.connections: dict[str, WebSocket] = {}
        self.last_analysis_time: dict[str, float] = {}
    
    async def connect(self, websocket: WebSocket, client_id: str):
        await websocket.accept()
        self.connections[client_id] = websocket
        self.last_analysis_time[client_id] = 0
        print(f"📹 Client {client_id} connected to live vision stream")
    
    def disconnect(self, client_id: str):
        self.connections.pop(client_id, None)
        self.last_analysis_time.pop(client_id, None)
        print(f"📹 Client {client_id} disconnected")
    
    async def send_json(self, client_id: str, data: dict):
        """Send JSON to client if connected"""
        ws = self.connections.get(client_id)
        if ws:
            try:
                await ws.send_json(data)
            except Exception as e:
                print(f"Send error: {e}")
    
    async def process_frame(
        self,
        client_id: str,
        frame_base64: str,
        session_id: Optional[str] = None
    ):
        """
        Process a single frame from live video.
        DROP policy: if GPU is busy, discard frame immediately.
        """
        print(f"🔄 Processing frame for client {client_id}")
        ws = self.connections.get(client_id)
        if not ws:
            print(f"❌ No WebSocket for client {client_id}")
            return
        
        # Check if GPU is busy - DROP policy
        if ollama_service._is_processing:
            print(f"⏭️ GPU busy, dropping frame")
            await self.send_json(client_id, {
                "type": "dropped",
                "reason": "GPU busy processing previous frame"
            })
            return
        
        # Rate limiting: max 1 analysis per 2 seconds per client
        current_time = time()
        last_time = self.last_analysis_time.get(client_id, 0)
        time_diff = current_time - last_time
        if time_diff < 2.0:
            print(f"⏱️ Rate limit: {time_diff:.1f}s since last, need 2s")
            return  # Silently drop, too soon
        
        print(f"✅ Rate limit passed, processing frame...")
        self.last_analysis_time[client_id] = current_time
        
        try:
            # Decode frame
            frame_bytes = base64.b64decode(frame_base64)
            print(f"📦 Decoded frame: {len(frame_bytes)} bytes")
            
            # Skip quality check for now - just process
            # quality_result = ollama_service.check_image_quality(frame_bytes)
            
            # Notify processing started
            await self.send_json(client_id, {
                "type": "processing_started",
                "timestamp": current_time
            })
            print(f"🚀 Starting Ollama analysis...")
            
            # Stream detection using async generator - collects tokens into full JSON
            response_text = ""
            
            print(f"📡 Calling ollama_service.stream_detect_live...")
            async for token in ollama_service.stream_detect_live(frame_bytes):
                # Each yield is a string token
                response_text += token
                print(f"🔤 Token: {token[:20] if len(token) > 20 else token}")
                
                # Send partial token to client for streaming display
                await self.send_json(client_id, {
                    "type": "token",
                    "token": token,
                    "partial": response_text
                })
            
            print(f"📝 Full response: {response_text[:200]}")
            
            # Parse the complete response as JSON
            try:
                # Clean up response - find JSON
                json_start = response_text.find('{')
                json_end = response_text.rfind('}') + 1
                if json_start != -1 and json_end > json_start:
                    json_str = response_text[json_start:json_end]
                    full_result = json.loads(json_str)
                else:
                    full_result = {"error": "No JSON in response", "raw": response_text[:200]}
            except json.JSONDecodeError:
                full_result = {"error": "Invalid JSON", "raw": response_text[:200]}
            
            # Check for skipped frame
            if full_result.get("skipped"):
                await self.send_json(client_id, {
                    "type": "dropped",
                    "reason": full_result.get("reason", "Frame dropped")
                })
                return
            
            # Check for error
            if full_result.get("error"):
                await self.send_json(client_id, {
                    "type": "error",
                    "message": full_result.get("error")
                })
                return
            
            # Get confidence
            confidence = full_result.get("confidence", 0)
            if isinstance(confidence, str):
                try:
                    confidence = float(confidence)
                except:
                    confidence = 0
            
            confidence_pct = int(confidence * 100) if confidence <= 1 else int(confidence)
            
            if confidence_pct < 50:
                await self.send_json(client_id, {
                    "type": "low_confidence",
                    "confidence": confidence_pct,
                    "message": "Detection confidence too low, try better lighting/angle"
                })
            else:
                # Save to database if session provided
                if session_id:
                    try:
                        await db_service.save_detected_item(session_id, full_result)
                        print(f"✅ Saved detection result to session {session_id}")
                    except Exception as e:
                        print(f"Database save error: {e}")
                
                await self.send_json(client_id, {
                    "type": "complete",
                    "result": full_result,
                    "confidence": confidence_pct
                })
        
        except Exception as e:
            print(f"Frame processing error: {e}")
            await self.send_json(client_id, {
                "type": "error",
                "message": f"Processing error: {str(e)}"
            })


# Singleton instance
vision_stream = LiveVisionStream()


@router.websocket("/ws/vision")
async def websocket_vision_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint for live video stream analysis.
    
    Client sends:
    {
        "type": "frame",
        "data": "base64 encoded JPEG frame",
        "session_id": "optional session ID for saving results"
    }
    
    Server sends:
    {
        "type": "processing_started|token|complete|error|dropped|quality_warning",
        ...
    }
    """
    client_id = str(id(websocket))
    await vision_stream.connect(websocket, client_id)
    
    try:
        while True:
            # Receive message from client
            data = await websocket.receive_json()
            print(f"📨 Received message type: {data.get('type')}")
            
            if data.get("type") == "frame":
                # Process frame asynchronously (non-blocking)
                frame_data = data.get("data", "")
                session_id = data.get("session_id")
                print(f"📷 Received frame, size: {len(frame_data)} chars")
                
                # Fire and forget - don't await
                asyncio.create_task(
                    vision_stream.process_frame(client_id, frame_data, session_id)
                )
            
            elif data.get("type") == "ping":
                # Keep-alive ping
                await vision_stream.send_json(client_id, {"type": "pong"})
    
    except WebSocketDisconnect:
        vision_stream.disconnect(client_id)
    except Exception as e:
        print(f"WebSocket error: {e}")
        vision_stream.disconnect(client_id)
