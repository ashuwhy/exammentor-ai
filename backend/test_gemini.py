import os
from dotenv import load_dotenv
from google import genai

load_dotenv()

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
model = os.getenv("GEMINI_MODEL", "gemini-3-pro-preview")

try:
    resp = client.models.generate_content(
        model=model,
        contents="Say hello in one short sentence to an exam student."
    )
    print(resp.text)
except Exception as e:
    print(f"Error: {e}")
