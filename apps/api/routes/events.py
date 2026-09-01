from fastapi import APIRouter, Query
from sqlalchemy.orm import Session

from database import SessionLocal
from models.event import Event
from utils.serializers import serialize_event
from routes.ai import generate_event_summary

router = APIRouter()


@router.get("/events")
def get_events(
    limit: int = Query(default=50, ge=1, le=500),
    event_type: str = Query(default=None),
    repository: str = Query(default=None),
    owner_github_id: str = Query(default=None),
):
    db: Session = SessionLocal()
    try:
        query = db.query(Event).order_by(Event.id.desc())

        if event_type:
            query = query.filter(Event.event_type == event_type)

        if repository:
            query = query.filter(Event.repository_name.ilike(f"%{repository}%"))

        if owner_github_id:
            query = query.filter(Event.owner_github_id == owner_github_id)

        events = query.limit(limit).all()
        result = []
        for e in events:
            if not getattr(e, "summary", None):
                e.summary = generate_event_summary(
                    e.event_type, e.repository_name, e.payload
                )
            result.append(serialize_event(e))
        return result

    finally:
        db.close()


@router.delete("/events")
def clear_events(owner_github_id: str = Query(default=None)):
    db: Session = SessionLocal()
    try:
        query = db.query(Event)
        if owner_github_id:
            query = query.filter(Event.owner_github_id == owner_github_id)

        count = query.count()
        query.delete()
        db.commit()
        return {"message": f"Deleted {count} events"}
    except Exception as e:
        db.rollback()
        return {"error": str(e)}
    finally:
        db.close()
