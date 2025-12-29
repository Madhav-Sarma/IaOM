from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from app.core.config import settings
from app.api import api_router
from app.core.database import engine

app = FastAPI(
    title="Inventory & Order Management API",
    description="API for managing inventory and orders",
    version="1.0.0",
    debug=settings.DEBUG
)

# CORS middleware for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "https://iaom.vercel.app",
    ],  # React dev servers (localhost & 127.0.0.1)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(api_router, prefix=settings.API_V1_PREFIX)

@app.get("/")
def root():
    return {"message": "Inventory & Order Management API", "version": "1.0.0"}

@app.get("/health")
def health_check():
    return {"status": "ok"}

# To run: uvicorn app.main:app --reload

# Simple DB connectivity check on startup
@app.on_event("startup")
def _db_ping():
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception as exc:
        # Log or raise here; for now, we let FastAPI start and you can check logs
        print(f"[startup] DB ping failed: {exc}")