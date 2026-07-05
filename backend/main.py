import os
import multiprocessing
import warnings
warnings.filterwarnings("ignore", category=FutureWarning)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
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
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Uploads
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# API routes
app.include_router(api_router)


@app.on_event("startup")
def on_startup():
    create_tables()
    print("✅ Database tables created")


@app.get("/health", tags=["Health"])
def health():
    return {"status": "healthy"}


# Serve React frontend — must be AFTER API routes
FRONTEND_DIST = os.path.join(os.path.dirname(__file__), "static")

if os.path.exists(FRONTEND_DIST):
    app.mount("/assets", StaticFiles(directory=os.path.join(FRONTEND_DIST, "assets")), name="assets")

    @app.get("/", include_in_schema=False)
    @app.get("/{full_path:path}", include_in_schema=False)
    def serve_frontend(full_path: str = ""):
        # Don't intercept API or docs routes
        if full_path.startswith("api/") or full_path.startswith("docs") or full_path.startswith("redoc"):
            from fastapi import HTTPException
            raise HTTPException(404)
        index = os.path.join(FRONTEND_DIST, "index.html")
        if os.path.exists(index):
            return FileResponse(index)
        return {"status": "ok", "app": settings.APP_NAME}
else:
    @app.get("/", tags=["Health"])
    def root():
        return {"status": "ok", "app": settings.APP_NAME, "docs": "/docs"}


if __name__ == "__main__":
    multiprocessing.freeze_support()
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
