# Right to Repair

**Right to Repair** is an AI-powered platform designed to help users identify objects and find repair solutions. It combines object detection with a repair database and an AI chat assistant to streamline the repair process.

## 🚀 Features

- **Object Detection**: AI-based detection of items and serial numbers from images.
- **Repair Solutions**: Find repair guides and solutions for identified items.
- **AI Assistant**: Interactive chat interface to ask questions about repairs.
- **Modern UI**: Built with Next.js and Tailwind CSS for a responsive experience.

## 🛠️ Tech Stack

### Backend

- **Framework**: [FastAPI](https://fastapi.tiangolo.com/)
- **Language**: Python 3.9+
- **Database**: SQLite
- **Key Libraries**: `uvicorn`, `pillow` (Image Processing), `pydantic`

### Frontend

- **Framework**: [Next.js](https://nextjs.org/) (React)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: React Hooks

## 📂 Project Structure

```
Right-To-Repair/
├── backend/            # FastAPI Backend
│   ├── api/            # API Routes (detect, repair, chat)
│   ├── services/       # Business logic and DB services
│   ├── main.py         # Application entry point
│   └── requirements.txt
├── frontend/           # Next.js Frontend
│   ├── app/            # App router pages
│   ├── components/     # Reusable UI components
│   └── public/         # Static assets
└── README.md           # This file
```

## 🏁 Getting Started

Follow these steps to set up the project locally.

### 1. Prerequisites

- Python 3.9 or higher
- Node.js 18 or higher
- npm or yarn

### 2. Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create virtual environment (optional but recommended):
   ```bash
   python -m venv venv
   # Windows
   .\venv\Scripts\activate
   # macOS/Linux
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Start the server:
   ```bash
   uvicorn main:app --reload
   ```
   The API will be available at `http://localhost:8000`. API Docs at `http://localhost:8000/docs`.

### 3. Frontend Setup

1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
   The application will be running at `http://localhost:3000`.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
