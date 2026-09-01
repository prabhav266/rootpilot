from fastapi import APIRouter
import requests
from google import genai
import os
import json
import re

router = APIRouter()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

client = None
if GEMINI_API_KEY:
    try:
        client = genai.Client(api_key=GEMINI_API_KEY)
    except Exception:
        client = None


def generate_fallback_diagnosis(failed_steps: list[dict]):
    step_names = [s.get("step_name", "") for s in failed_steps]
    step_str = ", ".join([f"'{name}'" for name in step_names if name]) or "Pipeline step"

    actions = []
    has_test = any("test" in s.lower() for s in step_names)
    has_lint = any("lint" in s.lower() or "type" in s.lower() for s in step_names)
    has_build = any("build" in s.lower() or "compile" in s.lower() for s in step_names)
    has_deps = any("install" in s.lower() or "setup" in s.lower() or "deps" in s.lower() for s in step_names)

    step_counter = 1
    if has_test:
        actions.append({
            "step": str(step_counter),
            "title": "Run Local Test Suite",
            "detail": "Execute failing automated tests locally with verbose logging to isolate regression.",
            "command": "npm test || pytest -v",
        })
        step_counter += 1

    if has_lint:
        actions.append({
            "step": str(step_counter),
            "title": "Fix Linting / Type Checking",
            "detail": "Run linter and TypeScript / typing checks to locate syntax and type discrepancies.",
            "command": "npm run lint || tsc --noEmit",
        })
        step_counter += 1

    if has_deps or has_build:
        actions.append({
            "step": str(step_counter),
            "title": "Clean Install Dependencies & Rebuild",
            "detail": "Ensure environment dependencies and lockfiles are synchronized before build.",
            "command": "npm ci || pip install -r requirements.txt",
        })
        step_counter += 1

    actions.append({
        "step": str(step_counter),
        "title": "Inspect GitHub Actions Run Logs",
        "detail": "Fetch comprehensive run logs and stack trace directly via GitHub CLI.",
        "command": "gh run view --log-failed",
    })
    step_counter += 1

    actions.append({
        "step": str(step_counter),
        "title": "Review Recent Commit Diffs",
        "detail": "Examine recent code modifications on the active branch.",
        "command": "git log -p -n 3",
    })

    return {
        "summary": f"CI workflow failed at step(s): {step_str}.",
        "likely_cause": f"One or more execution steps ({step_str}) encountered a runtime error, failed assertion, or exit code != 0.",
        "actions": actions,
        "prevention": "Incorporate pre-commit git hooks and run automated test suites locally before pushing commits.",
        "failed_steps": failed_steps,
    }


@router.post("/ci/analyze")
def analyze_ci(data: dict):
    jobs_url = data.get("jobs_url")
    github_token = data.get("github_token")

    if not jobs_url:
        return {
            "summary": "No CI workflow job data available.",
            "likely_cause": "This event does not contain GitHub Actions workflow job metadata.",
            "actions": [
                {
                    "step": "1",
                    "title": "Monitor Workflow Runs",
                    "detail": "Diagnosis is available for workflow_run events containing jobs_url.",
                    "command": "gh run list",
                }
            ],
            "prevention": "Ensure GitHub webhook sends 'workflow_run' events.",
            "failed_steps": [],
        }

    headers = {}
    if github_token:
        headers["Authorization"] = f"Bearer {github_token}"

    jobs = []
    try:
        response = requests.get(jobs_url, headers=headers, timeout=10)
        if response.status_code == 200:
            jobs_data = response.json()
            jobs = jobs_data.get("jobs", [])
    except Exception:
        jobs = []

    if not jobs:
        return {
            "summary": "Workflow job list could not be retrieved from GitHub.",
            "likely_cause": "The GitHub Actions API did not return job records, possibly due to private repository access or expired token.",
            "actions": [
                {
                    "step": "1",
                    "title": "Inspect Actions on GitHub",
                    "detail": "Check workflow permissions and token scopes (ensure 'repo' scope is enabled).",
                    "command": "gh auth refresh -s repo",
                }
            ],
            "prevention": "Verify repository OAuth access permissions and ensure workflow runs are public or authorized.",
            "failed_steps": [],
        }

    failed_steps = []
    for job in jobs:
        for step in job.get("steps", []):
            if step.get("conclusion") == "failure":
                failed_steps.append({
                    "step_name": step.get("name", "Unknown Step"),
                    "status": step.get("conclusion", "failure"),
                    "number": step.get("number"),
                })

    if not failed_steps:
        return {
            "summary": "No failed CI steps detected.",
            "likely_cause": "All executed workflow steps finished successfully or are currently queued.",
            "actions": [
                {
                    "step": "1",
                    "title": "Monitor Continuous Integration",
                    "detail": "Pipeline is stable and passing validation checks.",
                    "command": "git status",
                }
            ],
            "prevention": "Maintain comprehensive unit and integration test coverage.",
            "failed_steps": [],
        }

    # If Gemini is available, generate rich structured analysis
    if client:
        prompt = f"""You are an expert DevOps engineer and CI/CD troubleshooter.
Analyze these failing GitHub Actions workflow steps and return a structured JSON object.

Failing Steps:
{json.dumps(failed_steps, indent=2)}

You MUST output ONLY valid JSON matching this exact structure:
{{
  "summary": "Concise summary of the CI failure (1-2 sentences)",
  "likely_cause": "Specific technical root cause explaining why this step failed",
  "actions": [
    {{
      "step": "1",
      "title": "Action title (e.g. Fix Missing Dependencies)",
      "detail": "Actionable explanation of the fix",
      "command": "exact shell / git / npm / pip command to fix or debug"
    }},
    {{
      "step": "2",
      "title": "Action title",
      "detail": "Actionable explanation",
      "command": "command"
    }}
  ],
  "prevention": "Best practices to prevent this CI failure from recurring"
}}
"""
        try:
            ai_response = client.models.generate_content(
                model="gemini-2.5-flash-lite",
                contents=prompt,
            )
            raw_text = ai_response.text or ""
            # Strip markdown code fencing if present
            cleaned_text = re.sub(r"^```json\s*", "", raw_text.strip(), flags=re.IGNORECASE)
            cleaned_text = re.sub(r"\s*```$", "", cleaned_text.strip())

            parsed = json.loads(cleaned_text)
            if "summary" in parsed and "actions" in parsed:
                parsed["failed_steps"] = failed_steps
                return parsed
        except Exception:
            pass

    # Heuristic fallback
    return generate_fallback_diagnosis(failed_steps)