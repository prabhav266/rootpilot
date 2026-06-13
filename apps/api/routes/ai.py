from fastapi import APIRouter, HTTPException
from google import genai
import os
import json

router = APIRouter()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

client = None
if GEMINI_API_KEY:
    client = genai.Client(api_key=GEMINI_API_KEY)


def _require_client():
    if client is None:
        raise HTTPException(
            status_code=503,
            detail="AI service unavailable: GEMINI_API_KEY not configured",
        )


@router.post("/ai/summarize")
async def summarize_event(event: dict):
    event_type = event.get("event_type")
    repository_name = event.get("repository_name", "unknown")

    try:
        payload = json.loads(event.get("payload", "{}"))
    except (json.JSONDecodeError, TypeError):
        payload = {}

    try:
        if event_type == "workflow_run":
            workflow_run = payload.get("workflow_run", {})
            workflow_name = workflow_run.get("name", "Unknown Workflow")
            conclusion = workflow_run.get("conclusion")

            if conclusion == "success":
                summary = (
                    f"CI workflow '{workflow_name}' completed successfully "
                    f"in {repository_name}."
                )
            elif conclusion == "failure":
                summary = (
                    f"CI workflow '{workflow_name}' failed in {repository_name}. "
                    f"Possible issue detected in pipeline execution."
                )
            else:
                summary = (
                    f"CI workflow '{workflow_name}' ran in {repository_name} "
                    f"(status: {conclusion or 'pending'})."
                )

        elif event_type == "push":
            commits = payload.get("commits", [])
            branch = payload.get("ref", "").replace("refs/heads/", "")
            count = len(commits)
            summary = (
                f"{count} commit(s) pushed to {branch} in {repository_name}."
            )

        elif event_type == "ping":
            summary = f"Webhook connected successfully to {repository_name}."

        elif event_type == "workflow_job":
            job = payload.get("workflow_job", {})
            job_name = job.get("name", "Unknown Job")
            status = job.get("conclusion") or job.get("status", "unknown")
            summary = (
                f"CI/CD job '{job_name}' {status} in {repository_name}."
            )

        elif event_type == "check_run":
            check = payload.get("check_run", {})
            check_name = check.get("name", "Unknown Check")
            status = check.get("conclusion") or "in progress"
            summary = (
                f"Check '{check_name}' {status} in {repository_name}."
            )

        elif event_type == "check_suite":
            suite = payload.get("check_suite", {})
            status = suite.get("conclusion") or "in progress"
            summary = (
                f"CI validation suite {status} in {repository_name}."
            )

        else:
            # Use Gemini for unknown event types
            _require_client()
            prompt = f"""You are an AI DevOps assistant.
Analyze this GitHub event and explain in 2-3 sentences:
- what happened
- whether the workflow succeeded or failed (if applicable)
- possible reason for failure (if applicable)

GitHub Event Type: {event_type}
Repository: {repository_name}
Payload: {json.dumps(payload, indent=2)[:2000]}
"""
            response = client.models.generate_content(
                model="gemini-2.5-flash-lite",
                contents=prompt,
            )
            summary = response.text.strip()

    except HTTPException:
        raise
    except Exception as e:
        summary = f"AI analysis failed: {str(e)}"

    return {"summary": summary}


@router.post("/ai/insights")
async def generate_insights(events: list[dict]):
    _require_client()

    total_events = len(events)
    push_events = sum(1 for e in events if e.get("event_type") == "push")
    workflow_events = sum(
        1 for e in events if e.get("event_type") == "workflow_run"
    )
    failed_workflows = sum(
        1
        for e in events
        if e.get("event_type") == "workflow_run"
        and isinstance(e.get("payload"), str)
        and '"conclusion": "failure"' in e.get("payload", "")
    )
    repo_names = [e.get("repository_name") for e in events]
    unique_repos = len(set(repo_names))

    risk = "Low"
    if workflow_events > 15 or failed_workflows > 3:
        risk = "Medium"
    if workflow_events > 25 or failed_workflows > 8:
        risk = "High"

    health = "Healthy"
    if total_events < 3:
        health = "Inactive"
    elif workflow_events > push_events:
        health = "CI Heavy"
    elif failed_workflows > 0:
        health = "Degraded"

    anomalies = []
    if push_events > 15:
        anomalies.append("Unusual push activity spike detected")
    if workflow_events > 20:
        anomalies.append("High workflow execution volume detected")
    if failed_workflows > 5:
        anomalies.append("Elevated CI failure rate detected")

    prompt = f"""You are an AI DevOps observability assistant.

Analyze this GitHub repository activity data and generate a concise operational intelligence summary.

Metrics:
- Total Events: {total_events}
- Push Events: {push_events}
- Workflow Events: {workflow_events}
- Failed Workflows: {failed_workflows}
- Repository Count: {unique_repos}
- Risk Level: {risk}
- Health Status: {health}

Detected anomalies:
{anomalies if anomalies else "None"}

Requirements:
- Keep response under 80 words
- Sound professional and operational
- Mention engineering activity patterns
- Mention CI/CD behavior if relevant
- Mention anomalies if present
"""

    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash-lite",
            contents=prompt,
        )
        insight = response.text.strip()
    except Exception as e:
        insight = f"Insight generation failed: {str(e)}"

    return {
        "health": health,
        "risk": risk,
        "total_events": total_events,
        "push_events": push_events,
        "workflow_events": workflow_events,
        "failed_workflows": failed_workflows,
        "repositories": unique_repos,
        "anomalies": anomalies,
        "insight": insight,
    }
