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

    headers = {
        "Authorization": f"Bearer {github_token}"
    }

    if not jobs_url:

        return {
            "summary": "No CI workflow job data available.",
            "likely_cause": "This event is not a GitHub Actions workflow failure.",
            "actions": [
                "Run Diagnose on failed CI/CD workflow events only"
            ],
            "prevention": [
                "Filter diagnose option to workflow failures"
            ]
        }

    response = requests.get(
        jobs_url,
        headers=headers
    )

    jobs_data = response.json()

    jobs = jobs_data.get("jobs", [])

    if not jobs:

        return {
            "analysis": "No CI jobs found."
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
            "analysis": "No failed CI steps detected."
        }

    prompt = f"""
    You are an AI DevOps assistant.

    Analyze these failed CI steps and explain:
    - what failed
    - likely cause
    - possible fix

    Failed Steps:

    {failed_steps}
    """

    response = client.models.generate_content(
       model="gemini-2.5-flash-lite",
        contents=prompt,
    )

    return {
    "summary": response.text,
    "likely_cause": "GitHub Actions workflow failure detected.",
    "actions": [
        "Review failed workflow logs",
        "Inspect failing CI step",
        "Re-run workflow after fixes"
    ],
    "prevention": [
        "Add automated testing",
        "Improve CI validation",
        "Monitor workflow stability"
    ],
    "failed_steps": failed_steps
}