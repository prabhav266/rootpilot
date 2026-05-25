from fastapi import APIRouter, Request
from sqlalchemy.orm import Session
import json

from database import SessionLocal
from models.event import Event
from websocket_manager import manager
from utils.serializers import serialize_event

import hmac
import hashlib
import os

WEBHOOK_SECRET = os.getenv("GITHUB_WEBHOOK_SECRET")

def verify_signature(payload_body, signature_header):

    if not signature_header:
        return False

    hash_object = hmac.new(
        WEBHOOK_SECRET.encode(),
        msg=payload_body,
        digestmod=hashlib.sha256
    )

    expected_signature = "sha256=" + hash_object.hexdigest()

    return hmac.compare_digest(
        expected_signature,
        signature_header
    )

router = APIRouter()

from fastapi import HTTPException

@router.post("/")
async def github_webhook(request: Request):

    payload_body = await request.body()

    signature_header = request.headers.get(
        "X-Hub-Signature-256"
    )

    if not verify_signature(
        payload_body,
        signature_header
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid signature"
        )

    payload = await request.json()

    return {
        "message": "Webhook verified"
    }

@router.get("/events")
def get_events():

    db: Session = SessionLocal()

    events = db.query(Event).all()

    return [serialize_event(e) for e in events]