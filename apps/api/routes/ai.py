from fastapi import APIRouter
from google import genai
import os
import json

router = APIRouter()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

client = None
if GEMINI_API_KEY:
    try:
        client = genai.Client(api_key=GEMINI_API_KEY)
    except Exception:
        client = None


def generate_event_summary(
    event_type: str, repository_name: str, payload_data: dict | str
) -> str:
    """Generate a clean summary for a GitHub webhook event.

    Uses deterministic parsing for known event types and falls back to Gemini or smart template.
    """
    if isinstance(payload_data, str):
        try:
            payload = json.loads(payload_data)
        except (json.JSONDecodeError, TypeError):
            payload = {}
    elif isinstance(payload_data, dict):
        payload = payload_data
    else:
        payload = {}

    repo = repository_name or "unknown repository"

    try:
        if event_type == "workflow_run":
            workflow_run = payload.get("workflow_run", {})
            workflow_name = workflow_run.get("name", "CI Workflow")
            conclusion = workflow_run.get("conclusion")
            status = workflow_run.get("status", "completed")

            if conclusion == "success":
                return f"CI workflow '{workflow_name}' completed successfully in {repo}."
            elif conclusion == "failure":
                return f"CI workflow '{workflow_name}' failed in {repo}. Review logs for details."
            elif conclusion:
                return f"CI workflow '{workflow_name}' finished with status '{conclusion}' in {repo}."
            else:
                return f"CI workflow '{workflow_name}' is currently {status} in {repo}."

        elif event_type == "push":
            commits = payload.get("commits", [])
            branch = payload.get("ref", "").replace("refs/heads/", "")
            pusher = (
                payload.get("pusher", {}).get("name")
                or payload.get("sender", {}).get("login")
                or "developer"
            )
            count = len(commits)
            branch_str = f" to {branch}" if branch else ""
            if count == 1:
                commit_msg = commits[0].get("message", "").split("\n")[0][:60]
                return f"{pusher} pushed 1 commit{branch_str} in {repo}: \"{commit_msg}\""
            elif count > 1:
                return f"{pusher} pushed {count} commits{branch_str} in {repo}."
            return f"Push event received{branch_str} in {repo}."

        elif event_type == "ping":
            return f"Webhook connected successfully to {repo}."

        elif event_type == "pull_request":
            pr = payload.get("pull_request", {})
            action = payload.get("action", "updated")
            pr_title = pr.get("title", "")
            pr_num = pr.get("number", "")
            pr_info = f"#{pr_num} '{pr_title}'" if pr_num else pr_title
            return f"Pull Request {pr_info} was {action} in {repo}."

        elif event_type == "workflow_job":
            job = payload.get("workflow_job", {})
            job_name = job.get("name", "Unknown Job")
            status = (
                job.get("conclusion")
                or job.get("status", "updated")
            )
            return f"CI/CD job '{job_name}' {status} in {repo}."

        elif event_type == "check_run":
            check = payload.get("check_run", {})
            check_name = check.get("name", "Unknown Check")
            status = check.get("conclusion") or "in progress"
            return f"Check '{check_name}' {status} in {repo}."

        elif event_type == "check_suite":
            suite = payload.get("check_suite", {})
            status = suite.get("conclusion") or "in progress"
            return f"CI validation suite {status} in {repo}."

        elif event_type == "issues":
            action = payload.get("action", "updated")
            issue = payload.get("issue", {})
            title = issue.get("title", "")
            return f"Issue '{title}' was {action} in {repo}."

        elif event_type == "release":
            action = payload.get("action", "published")
            release = payload.get("release", {})
            tag = release.get("tag_name", "new release")
            return f"Release {tag} was {action} in {repo}."

        # Fallback to Gemini if configured, otherwise fallback to template
        if client:
            prompt = f"""You are an AI DevOps assistant.
Analyze this GitHub event and explain in 1-2 concise sentences:
GitHub Event Type: {event_type}
Repository: {repo}
Payload: {json.dumps(payload, indent=2)[:1500]}
"""
            response = client.models.generate_content(
                model="gemini-2.5-flash-lite",
                contents=prompt,
            )
            if response.text:
                return response.text.strip()

    except Exception:
        pass

    formatted_type = (event_type or "GitHub").replace("_", " ").title()
    return f"{formatted_type} event recorded in {repo}."


@router.post("/ai/summarize")
async def summarize_event(event: dict):
    event_type = event.get("event_type", "unknown")
    repository_name = event.get("repository_name", "unknown")
    payload = event.get("payload", {})
    summary = generate_event_summary(event_type, repository_name, payload)
    return {"summary": summary}


@router.post("/ai/insights")
async def generate_insights(events: list[dict]):
    total_events = len(events)
    push_events = sum(1 for e in events if e.get("event_type") == "push")
    workflow_events = sum(
        1 for e in events if e.get("event_type") == "workflow_run"
    )

    failed_workflows = 0
    for e in events:
        if e.get("event_type") == "workflow_run":
            p = e.get("payload")
            if isinstance(p, str) and '"conclusion": "failure"' in p:
                failed_workflows += 1
            elif isinstance(p, dict) and p.get("workflow_run", {}).get("conclusion") == "failure":
                failed_workflows += 1

    repo_names = [e.get("repository_name") for e in events if e.get("repository_name")]
    unique_repos = len(set(repo_names))

    risk = "Low"
    if workflow_events > 15 or failed_workflows > 3:
        risk = "Medium"
    if workflow_events > 25 or failed_workflows > 8:
        risk = "High"

    health = "Healthy"
    if total_events < 3:
        health = "Inactive"
    elif failed_workflows > 0:
        health = "Degraded"
    elif workflow_events > push_events:
        health = "CI Heavy"

    anomalies = []
    if push_events > 15:
        anomalies.append("Unusual push activity spike detected")
    if workflow_events > 20:
        anomalies.append("High workflow execution volume detected")
    if failed_workflows > 0:
        anomalies.append(f"Elevated CI failure rate ({failed_workflows} failed run{'s' if failed_workflows > 1 else ''})")

    insight = ""
    if client and total_events > 0:
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
- Keep response under 60 words
- Professional and operational DevOps tone
- Highlight CI/CD stability or failures if present
"""
        try:
            response = client.models.generate_content(
                model="gemini-2.5-flash-lite",
                contents=prompt,
            )
            if response.text:
                insight = response.text.strip()
        except Exception:
            insight = ""

    # Smart deterministic fallback if Gemini key is absent, rate-limited, or failed
    if not insight:
        if total_events == 0:
            insight = "No repository activity recorded yet. Connect a repository to monitor commits and automated CI/CD workflows."
        elif failed_workflows > 0:
            insight = f"Operational Alert: {failed_workflows} CI workflow failure(s) detected across {unique_repos} monitored repository. Immediate log inspection is recommended to resolve pipeline blockers."
        elif health == "Healthy":
            insight = f"All systems optimal. {total_events} events processed ({push_events} pushes, {workflow_events} workflow runs) across {unique_repos} active repository. Pipelines are running cleanly."
        else:
            insight = f"Repository ecosystem currently in {health} status with {total_events} recorded events across {unique_repos} repository. Risk level evaluated as {risk}."

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

