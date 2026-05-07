from fastapi import APIRouter
from openai import OpenAI

from config import OPENAI_API_KEY

router = APIRouter()

client = OpenAI(api_key=OPENAI_API_KEY)

@router.post("/ai/summarize")
def summarize_event(event: dict):

    prompt = f"""
    Summarize this GitHub event in simple English:

    {event}
    """

    response = client.chat.completions.create(
        model="gpt-4.1-mini",
        messages=[
            {
                "role": "user",
                "content": prompt
            }
        ]
    )

    return {
        "summary": response.choices[0].message.content
    }