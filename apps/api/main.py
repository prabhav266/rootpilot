from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import engine, Base

from models.user import User
from models.repository import Repository
from models.event import Event

from routes.health import router as health_router
from routes.repositories import router as repo_router
from routes.webhooks import router as webhook_router
from routes.ai import router as ai_router
from routes.ci_debug import router as ci_debug_router
from routes.websocket_route import router as websocket_router
from routes.events import router as events_router

import logging

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # STARTUP
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Database initialized successfully")
    except Exception as e:
        logger.error(f"Database startup failed: {e}")

    yield

    # SHUTDOWN
    logger.info("Application shutting down")


app = FastAPI(lifespan=lifespan)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://rootpilot.vercel.app",
    ],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(health_router)
app.include_router(repo_router)
app.include_router(webhook_router, prefix="/webhooks/github")
app.include_router(events_router)
app.include_router(ai_router)
app.include_router(ci_debug_router)
# app.include_router(websocket_router)  # Enable when needed


@app.get("/")
def root():
    return {"message": "RootPilot API Running"}
