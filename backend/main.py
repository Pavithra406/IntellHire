import os
import multiprocessing
import warnings
warnings.filterwarnings("ignore", category=FutureWarning)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.core.config import settings
from app.core.database import create_tables
from app.api import api_router

app = FastAPI(
    title=settings.APP_NAME,
    description="AI-powered end-to-end recruitment platform",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files for uploads
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Routes
app.include_router(api_router)


@app.on_event("startup")
def on_startup():
    create_tables()
    print("✅ Database tables created")


@app.get("/", tags=["Health"])
def root():
    return {"status": "ok", "app": settings.APP_NAME, "docs": "/docs"}


@app.get("/health", tags=["Health"])
def health():
    return {"status": "healthy"}


if __name__ == "__main__":
    # Required for Windows --reload support
    multiprocessing.freeze_support()
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
