from fastapi import APIRouter
from sqlalchemy.orm import Session

from database import SessionLocal
from models.event import Event

router = APIRouter()

@router.get("/events")
def get_events(limit: int = 50):

    db: Session = SessionLocal()

    try:
        events = (
            db.query(Event)
            .order_by(Event.id.desc())
            .limit(limit)
            .all()
        )

        return events

    finally:
        db.close()