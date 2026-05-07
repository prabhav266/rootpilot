from fastapi import APIRouter, Request
from sqlalchemy.orm import Session
import json

from database import SessionLocal
from models.event import Event

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

    new_event = Event(
        event_type=event_type,
        repository_name=repository_name,
        payload=json.dumps(payload)
    )

    db.add(new_event)
    db.commit()

    print(f"Received GitHub Event: {event_type}")

    return {
        "message": "Webhook received"
    }


@router.get("/events")
def get_events():

    db: Session = SessionLocal()

    events = db.query(Event).all()

    return events  #uiuiui