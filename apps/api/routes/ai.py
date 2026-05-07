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
        Summarize this GitHub event in simple English:

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

        else:
            summary = (
                f"{event_type} event occurred "
                f"in {repository_name}"
            )

    return {
        "summary": summary
    }