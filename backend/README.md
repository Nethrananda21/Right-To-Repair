# Right to Repair - Backend

AI-powered repair assistant backend using FastAPI, Ollama (Qwen3-VL), and deep search capabilities.

## Features

- **Vision Analysis**: Object detection and damage assessment using Qwen3-VL:4b model
- **Live Video Streaming**: Real-time WebSocket-based video analysis
- **Deep Search**: Multi-source repair resource search (Reddit, Forums, YouTube)
- **Conversation Memory**: Sliding window context + key facts extraction
- **Session Management**: SQLite-based chat history and detected items

## Tech Stack

- **FastAPI** - Async Python web framework
- **Ollama** - Local LLM inference (Qwen3-VL:4b for vision)
- **SQLite** - Lightweight database for sessions/messages
- **aiohttp** - Async HTTP client for search APIs
- **WebSockets** - Real-time video frame processing

## Setup

### Prerequisites

1. Install [Ollama](https://ollama.ai)
2. Pull the vision model:
   ```bash
   ollama pull qwen3-vl:4b
   ```

### Installation

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

Server runs at `http://localhost:8000`

## API Endpoints

### Sessions
- `GET /api/chat/sessions` - List all sessions
- `POST /api/chat/sessions` - Create new session
- `GET /api/chat/sessions/{id}` - Get session details with messages
- `DELETE /api/chat/sessions/{id}` - Delete session

### Chat
- `POST /api/chat/message` - Send message (text or image)
- `PUT /api/chat/sessions/{id}/detected-item` - Update detected item
- `POST /api/chat/sessions/{id}/messages` - Save message directly

### Vision
- `POST /api/detect/analyze` - Analyze image for damage
- `WS /ws/vision` - WebSocket for live video analysis

### Search
- `POST /api/repair/deep-search` - Search Reddit, Forums, YouTube

## Architecture

```
backend/
├── main.py                 # FastAPI app entry
├── api/
│   ├── chat.py            # Chat/session endpoints
│   ├── detect.py          # Image detection
│   ├── repair.py          # Search endpoints
│   └── vision_stream.py   # WebSocket live video
└── services/
    ├── ollama_service.py  # LLM/Vision inference
    ├── database.py        # SQLite operations
    ├── search_service.py  # Deep search orchestration
    ├── youtube_service.py # YouTube API
    └── guide_extractor.py # iFixit integration
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `OLLAMA_HOST` | Ollama server URL | `http://localhost:11434` |
| `YOUTUBE_API_KEY` | YouTube Data API key | Optional |

## Live Video Protocol

WebSocket at `/ws/vision` accepts:
```json
{
  "type": "frame",
  "data": "base64_jpeg_data",
  "session_id": "optional_session_id"
}
```

Returns:
```json
{
  "type": "complete",
  "result": { "object": "...", "issues": [...] },
  "confidence": 80
}
```

