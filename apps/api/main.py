from fastapi import FastAPI
from database import engine,Base
from models.user import User
from routes.health import router as health_router
from models.repository import Repository
from routes.repositories import router as repo_router
from fastapi.middleware.cors import CORSMiddleware
from models.event import Event
from routes.webhooks import router as webhook_router

Base.metadata.create_all(bind=engine)


app = FastAPI() #fun
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(repo_router)
app.include_router(webhook_router)

@app.get("/")
def root():
    return {"message": "RootPilot API Running"}