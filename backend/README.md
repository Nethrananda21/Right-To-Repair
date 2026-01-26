# Right to Repair - Backend

## Setup

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

## API Endpoints

- `POST /api/detect/full` - Combined detection (item + serial images)
