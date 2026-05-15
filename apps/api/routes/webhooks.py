from fastapi import APIRouter, Request
from sqlalchemy.orm import Session
import json

from database import SessionLocal
from models.event import Event
from websocket_manager import manager

router = APIRouter()

@router.post("/webhooks/github")
async def github_webhook(request: Request):

    payload = await request.json()

    event_type = request.headers.get("X-GitHub-Event")

    repository_name = payload.get(
        "repository",
        {}
    ).get("full_name")

    db: Session = SessionLocal()
    
    jobs_url = (
    payload.get("workflow_run", {})
    .get("jobs_url")
    )

    new_event = Event(
        event_type=event_type,
        repository_name=repository_name,
        jobs_url=jobs_url,
        payload=json.dumps(payload)
    )   

    db.add(new_event)
    db.commit()
    
    await manager.broadcast(
        f"{event_type} event in {repository_name}"
    )

    print(f"Received GitHub Event: {event_type}")

    return {
        "message": "Webhook received"
    }


@router.get("/events")
def get_events():

    db: Session = SessionLocal()

    events = db.query(Event).all()

    return events  #uiuiui