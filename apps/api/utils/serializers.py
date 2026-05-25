def serialize_event(event):
    return {
        "id": event.id,
        "event_type": event.event_type,
        "repository_name": event.repository_name,
        "jobs_url": event.jobs_url,
        "payload": event.payload
    }