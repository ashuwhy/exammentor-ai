import os
import asyncio
import traceback
from dotenv import load_dotenv

# Force load .env
load_dotenv()

print("--- Environment Check ---")
key = os.getenv("GEMINI_API_KEY")
model = os.getenv("GEMINI_MODEL")
print(f"API Key present: {bool(key)}")
if key:
    print(f"API Key starts with: {key[:5]}...")
print(f"Model: {model}")

print("\n--- Dependency Check ---")
try:
    from google import genai
    print("✅ google.genai imported successfully")
except ImportError as e:
    print(f"❌ Failed to import google.genai: {e}")
    exit(1)

print("\n--- Client Check ---")
try:
    client = genai.Client(api_key=key)
    print("✅ Client created successfully")
except Exception as e:
    print(f"❌ Failed to create client: {e}")
    exit(1)

print("\n--- Agent Check ---")
try:
    from agents.plan_agent import generate_study_plan
    print("✅ Plan agent imported")
except Exception as e:
    print(f"❌ Failed to import plan agent: {e}")
    traceback.print_exc()
    exit(1)

async def test_generation():
    print("\n--- Generation Check ---")
    try:
        print("Calling generate_study_plan...")
        plan = await generate_study_plan(
            syllabus_text="Basic biology syllabus",
            exam_type="TEST_EXAM",
            goal="Test Goal",
            days=3
        )
        print("✅ Plan generation successful!")
        print(f"Plan Name: {plan.exam_name}")
    except Exception as e:
        print(f"❌ Plan generation failed: {e}")
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_generation())
