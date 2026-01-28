# Right to Repair - Frontend

AI-powered repair assistant with live video analysis and intelligent repair resource discovery.

## Features

- **Image Upload Analysis**: Upload photos of damaged items for AI detection
- **Live Video Detection**: Real-time camera-based damage assessment
- **Smart Chat Interface**: Conversational AI with repair context memory
- **Repair Resource Search**: Deep search across Reddit, Forums, and YouTube
- **Detection Confirmation**: Edit/correct AI detections before searching
- **Session History**: Persistent chat history across page reloads
- **Dark Mode Support**: System-aware theme switching

## Tech Stack

- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **WebSocket** - Real-time video streaming

## Getting Started

### Prerequisites

- Node.js 18+
- Backend server running at `http://localhost:8000`

### Installation

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
frontend/
├── app/
│   ├── page.tsx           # Main chat interface
│   ├── layout.tsx         # Root layout
│   └── globals.css        # Global styles & CSS variables
├── components/
│   ├── Sidebar.tsx        # Session list & navigation
│   ├── Header.tsx         # App header
│   ├── ChatInput.tsx      # Message input with image upload
│   ├── UserMessage.tsx    # User message display
│   ├── AIMessage.tsx      # AI response with repair results
│   ├── LiveVideoAnalysis.tsx  # Live camera detection
│   ├── DetectionConfirm.tsx   # Edit detection dialog
│   ├── DetectionResults.tsx   # Detection display card
│   └── RepairResults.tsx      # Search results display
├── lib/
│   ├── chatApi.ts         # Backend API client
│   ├── useVideoHooks.ts   # Camera & WebSocket hooks
│   └── frameQuality.ts    # Video frame quality assessment
└── public/
    └── ...                # Static assets
```

## Key Components

### Live Video Analysis
- WebSocket connection to `/ws/vision`
- Automatic frame quality filtering
- Real-time processing indicators
- Auto-stops camera on detection

### Chat Interface
- Markdown rendering for AI responses
- Image preview in messages
- Repair results with source links
- Conversation memory context

### Detection Confirmation
- Edit brand, model, serial number
- Modify detected issues
- Triggers optimized search after confirmation

## Configuration

API endpoint configured in `lib/chatApi.ts`:
```typescript
const API_BASE = 'http://localhost:8000/api';
```

## Scripts

```bash
npm run dev      # Development server
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
```

