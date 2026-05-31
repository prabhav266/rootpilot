from fastapi import APIRouter, Query
from sqlalchemy.orm import Session

from database import SessionLocal
from models.event import Event
from utils.serializers import serialize_event

router = APIRouter()


@router.get("/events")
def get_events(
    limit: int = Query(default=50, ge=1, le=500),
    event_type: str = Query(default=None),
    repository: str = Query(default=None),
):
    db: Session = SessionLocal()
    try:
        query = db.query(Event).order_by(Event.id.desc())

        if event_type:
            query = query.filter(Event.event_type == event_type)

        if repository:
            query = query.filter(Event.repository_name.ilike(f"%{repository}%"))

        events = query.limit(limit).all()
        return [serialize_event(e) for e in events]

    finally:
        db.close()


@router.delete("/events")
def clear_events():
    db: Session = SessionLocal()
    try:
        count = db.query(Event).count()
        db.query(Event).delete()
        db.commit()
        return {"message": f"Deleted {count} events"}
    except Exception as e:
        db.rollback()
        return {"error": str(e)}
    finally:
        db.close()
