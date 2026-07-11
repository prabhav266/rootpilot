def serialize_event(event):
    return {
        "id": event.id,
        "owner_github_id": event.owner_github_id,
        "event_type": event.event_type,
        "repository_github_id": event.repository_github_id,
        "repository_name": event.repository_name,
        "jobs_url": event.jobs_url,
        "payload": event.payload,
        "created_at": event.created_at.isoformat() if event.created_at else None,
    }
