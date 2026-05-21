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
from routes.websocket_route import (
    router as websocket_router
)
from routes.events import router as events_router

# Create DB tables
Base.metadata.create_all(bind=engine)

# FastAPI app
app = FastAPI()

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(health_router)

app.include_router(repo_router)

app.include_router(
    webhook_router,
    prefix="/webhooks/github"
)

app.include_router(events_router)

app.include_router(ai_router)

app.include_router(ci_debug_router)

# Optional websocket router
# app.include_router(websocket_router)

# Root endpoint
@app.get("/")
def root():
    return {"message": "RootPilot API Running"}