import os
from google import genai
from dotenv import load_dotenv

load_dotenv()

# Initialize the Gemini client
# Using the standard client which exposes .aio for async operations
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
