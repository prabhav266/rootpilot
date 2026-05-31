from fastapi import APIRouter, Request, HTTPException
from sqlalchemy.orm import Session
import json
import hmac
import hashlib
import os

from database import SessionLocal
from models.event import Event
from websocket_manager import manager
from utils.serializers import serialize_event

WEBHOOK_SECRET = os.getenv("GITHUB_WEBHOOK_SECRET")

router = APIRouter()


def verify_signature(payload_body: bytes, signature_header: str) -> bool:
    """Verify GitHub webhook HMAC-SHA256 signature."""
    if not WEBHOOK_SECRET:
        # If no secret is configured, skip verification (development mode)
        return True

    if not signature_header:
        return False

    hash_object = hmac.new(
        WEBHOOK_SECRET.encode("utf-8"),
        msg=payload_body,
        digestmod=hashlib.sha256,
    )
    expected_signature = "sha256=" + hash_object.hexdigest()

    return hmac.compare_digest(expected_signature, signature_header)


@router.post("/")
async def github_webhook(request: Request):
    payload_body = await request.body()

    signature_header = request.headers.get("X-Hub-Signature-256")

    if not verify_signature(payload_body, signature_header):
        raise HTTPException(status_code=401, detail="Invalid webhook signature")

    payload = await request.json()

    event_type = request.headers.get("X-GitHub-Event", "unknown")
    repository_name = payload.get("repository", {}).get("full_name", "unknown")

    # Extract jobs_url for workflow_run events
    jobs_url = None
    if event_type == "workflow_run":
        jobs_url = payload.get("workflow_run", {}).get("jobs_url")

    # Persist event to database
    db: Session = SessionLocal()
    try:
        event = Event(
            event_type=event_type,
            repository_name=repository_name,
            jobs_url=jobs_url,
            payload=json.dumps(payload),
        )
        db.add(event)
        db.commit()
        db.refresh(event)

        # Broadcast to WebSocket clients
        try:
            await manager.broadcast(json.dumps(serialize_event(event)))
        except Exception:
            pass  # WebSocket broadcast failure should not fail the webhook

        return {"message": "Webhook received", "event_id": event.id}

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to save event: {str(e)}")

    finally:
        db.close()
