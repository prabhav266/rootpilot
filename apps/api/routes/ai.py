from fastapi import APIRouter
import google.generativeai as genai

from config import GEMINI_API_KEY

router = APIRouter()

genai.configure(api_key=GEMINI_API_KEY)

model = genai.GenerativeModel("gemini-1.5-flash")

@router.post("/ai/summarize")
def summarize_event(event: dict):

    try:

        prompt = f"""
                    You are an AI DevOps assistant.

                    Analyze this GitHub event and explain:
                    - what happened
                    - whether the workflow succeeded or failed
                    - possible reason for failure

                    GitHub Event:

                    {event}
                    """

        response = model.generate_content(prompt)

        summary = response.text

    except Exception:

        event_type = event.get("event_type")
        repository_name = event.get("repository_name")

        if event_type == "push":
            summary = (
                f"Code was pushed to "
                f"{repository_name}"
            )

        elif event_type == "ping":
            summary = (
                f"Webhook connected successfully "
                f"to {repository_name}"
            )

        elif event_type == "workflow_run":

            workflow = event.get("workflow", {})
            conclusion = event.get("conclusion")

            workflow_name = workflow.get(
                "name",
                "Unknown Workflow"
            )

            if conclusion == "success":

                summary = (
                    f"CI workflow '{workflow_name}' "
                    f"completed successfully "
                    f"in {repository_name}"
                )

            elif conclusion == "failure":

                summary = (
                    f"CI workflow '{workflow_name}' "
                    f"failed in {repository_name}. "
                    f"Possible issue detected in pipeline execution."
                )

            else:

                summary = (
                    f"CI workflow '{workflow_name}' "
                    f"ran in {repository_name}"
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
            summary = (
                f"{event_type} event occurred "
                f"in {repository_name}"
            )

    return {
        "summary": summary
    }