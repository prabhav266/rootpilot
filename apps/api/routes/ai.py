from fastapi import APIRouter
from google import genai
import os
import json


router = APIRouter()

client = genai.Client(
    api_key=os.getenv("GEMINI_API_KEY")
)


@router.post("/ai/summarize")
def summarize_event(event: dict):

    try:

        event_type = event.get("event_type")
        repository_name = event.get("repository_name")

        payload = json.loads(
            event.get("payload", "{}")
        )

        if event_type == "workflow_run":

            workflow_run = payload.get(
                "workflow_run",
                {}
            )

            workflow_name = workflow_run.get(
                "name",
                "Unknown Workflow"
            )

            conclusion = workflow_run.get(
                "conclusion"
            )

            if conclusion == "success":

                summary = (
                    f"CI workflow '{workflow_name}' "
                    f"completed successfully in "
                    f"{repository_name}"
                )

            elif conclusion == "failure":

                summary = (
                    f"CI workflow '{workflow_name}' "
                    f"failed in {repository_name}. "
                    f"Possible issue detected in "
                    f"pipeline execution."
                )

            else:

                summary = (
                    f"CI workflow '{workflow_name}' "
                    f"ran in {repository_name}"
                )

        elif event_type == "push":

            summary = (
                f"Code was pushed to "
                f"{repository_name}"
            )

        elif event_type == "ping":

            summary = (
                f"Webhook connected successfully "
                f"to {repository_name}"
            )

        elif event_type == "workflow_job":

            summary = (
                f"A CI/CD job ran inside "
                f"{repository_name}"
            )

        elif event_type == "check_run":

            summary = (
                f"A validation check was "
                f"performed in {repository_name}"
            )

        elif event_type == "check_suite":

            summary = (
                f"A CI validation suite "
                f"executed in {repository_name}"
            )

        else:

            prompt = f"""
            You are an AI DevOps assistant.

            Analyze this GitHub event and explain:
            - what happened
            - whether the workflow succeeded or failed
            - possible reason for failure

            GitHub Event:

            {payload}
            """

            response = client.models.generate_content(
            model="gemini-2.5-flash-lite",
            contents=prompt,
            )

            summary = response.text

    except Exception as e:

        summary = (
            f"AI analysis failed: {str(e)}"
        )

    return {
        "summary": summary
    }

@router.post("/ai/insights")
async def generate_insights(events: list[dict]):
    print(events)

    total_events = len(events)

    push_events = len([
        e for e in events
        if e.get("event_type") == "push"
    ])

    workflow_events = len([
        e for e in events
        if e.get("event_type") == "workflow_run"
    ])

    repo_names = [
        e.get("repository_name")
        for e in events
    ]

    unique_repos = len(set(repo_names))

    risk = "Low"

    if workflow_events > 15:
        risk = "Medium"

    if workflow_events > 25:
        risk = "High"

    health = "Healthy"

    if total_events < 3:
        health = "Inactive"

    if workflow_events > push_events:
        health = "CI Heavy"

    anomalies = []

    if push_events > 15:
        anomalies.append(
            "Unusual push activity spike detected"
        )

    if workflow_events > 20:
        anomalies.append(
            "High workflow execution volume detected"
        )

    prompt = f"""
You are an AI DevOps observability assistant.

Analyze this GitHub repository activity data and generate
a concise operational intelligence summary.

Metrics:
- Total Events: {total_events}
- Push Events: {push_events}
- Workflow Events: {workflow_events}
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
- Mention anomalies if important
"""

    try:

        response = client.models.generate_content(
            model="gemini-2.5-flash-lite",
            contents=prompt,
        )

        insight = response.text.strip()


    except Exception as e:

        insight = f"REAL ERROR: {str(e)}"

    return {
        "health": health,
        "risk": risk,
        "total_events": total_events,
        "push_events": push_events,
        "workflow_events": workflow_events,
        "repositories": unique_repos,
        "anomalies": anomalies,
        "insight": insight.strip(),
    }   
    