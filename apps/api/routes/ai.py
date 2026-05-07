from fastapi import APIRouter
import google.generativeai as genai
import json

from config import GEMINI_API_KEY

router = APIRouter()

genai.configure(api_key=GEMINI_API_KEY)

model = genai.GenerativeModel("gemini-1.5-flash")


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

            response = model.generate_content(
                prompt
            )

            summary = response.text

    except Exception as e:

        summary = (
            f"AI analysis failed: {str(e)}"
        )

    return {
        "summary": summary
    }