from fastapi import APIRouter
import requests
import google.generativeai as genai
import os

from config import GEMINI_API_KEY

router = APIRouter()

genai.configure(
    api_key=os.getenv("GEMINI_API_KEY")
)

model = genai.GenerativeModel(
    "gemini-1.5-flash"
)



@router.post("/ci/analyze")
def analyze_ci(data: dict):
    
    jobs_url = data.get("jobs_url")
    github_token = data.get("github_token")
    
    headers = {
        "Authorization": f"Bearer{github_token}"
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

    ai_response = model.generate_content(
        prompt
    )

    return {
        "analysis": ai_response.text,
        "failed_steps": failed_steps
    }