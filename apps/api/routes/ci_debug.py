from fastapi import APIRouter
import requests
from google import genai
import os

router = APIRouter()

client = genai.Client(
    api_key=os.getenv("GEMINI_API_KEY")
)


@router.post("/ci/analyze")
def analyze_ci(data: dict):

    jobs_url = data.get("jobs_url")
    github_token = data.get("github_token")

    if not jobs_url:

        return {
            "summary": "No CI workflow job data available.",
            "likely_cause": (
                "This event does not contain GitHub Actions "
                "workflow job metadata."
            ),
            "actions": [
                "Run diagnosis only on failed workflow events"
            ],
            "prevention": [
                "Filter diagnose option to workflow failures only"
            ]
        }

    headers = {}

    if github_token:

        headers["Authorization"] = f"Bearer {github_token}"

    response = requests.get(
        jobs_url,
        headers=headers
    )

    jobs_data = response.json()

    jobs = jobs_data.get("jobs", [])

    if not jobs:

        return {
            "summary": "No CI jobs found.",
            "likely_cause": (
                "Workflow job list could not be retrieved."
            ),
            "actions": [
                "Verify GitHub workflow permissions",
                "Check workflow run availability"
            ],
            "prevention": [
                "Ensure workflow jobs are accessible"
            ]
        }

    failed_steps = []

    for job in jobs:

        for step in job.get("steps", []):

            if step.get("conclusion") == "failure":

                failed_steps.append({
                    "step_name": step.get("name"),
                    "status": step.get("conclusion")
                })

    if not failed_steps:

        return {
            "summary": "No failed CI steps detected.",
            "likely_cause": (
                "Workflow appears stable."
            ),
            "actions": [
                "Continue monitoring CI stability"
            ],
            "prevention": [
                "Maintain automated testing coverage"
            ]
        }

    prompt = f"""
    You are an AI DevOps assistant.

    Analyze these failed CI workflow steps.

    Explain:
    - what failed
    - likely root cause
    - recommended fixes
    - prevention strategies

    Failed Steps:

    {failed_steps}
    """

    try:

        ai_response = client.models.generate_content(
            model="gemini-2.5-flash-lite",
            contents=prompt
        )

        summary = ai_response.text

    except Exception as e:

        summary = (
            "CI workflow failure detected. "
            "Possible causes include failing tests, dependency issues, "
            "environment configuration problems, or build instability."
        )   

    return {
        "summary": summary,
        "likely_cause": (
             "Automated workflow execution encountered one or more failing steps. "
        ),
        "actions": [
            "Inspect failed GitHub Actions logs. ",
            "Review recent commits. ",
            "Verify dependency and environment configuration. "
        ],
        "prevention": [
            "Add automated testing. ",
            "Improve CI validation coverage. ",
            "Monitor workflow health continuously. "
        ],
        "failed_steps": failed_steps
    }