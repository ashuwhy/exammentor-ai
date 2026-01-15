"""
Plan Agent - Generates a personalized study plan using Gemini 3 Structured Outputs.

Uses Pydantic models to guarantee valid JSON output from the LLM.
"""

import os
from google import genai
from pydantic import BaseModel, Field
from typing import List


# --- Strict Output Schemas (Gemini 3 Structured Outputs) ---

class Topic(BaseModel):
    name: str
    difficulty: str = Field(description="easy, medium, or hard")
    rationale: str = Field(description="Why this topic is important for this exam")


class DailyPlan(BaseModel):
    day: int
    theme: str
    topics: List[Topic]
    estimated_hours: float


class StudyPlan(BaseModel):
    exam_name: str
    total_days: int = Field(description="Total duration of the plan in days")
    overview: str = Field(description="Brief strategy summary for the student")
    schedule: List[DailyPlan]
    critical_topics: List[str] = Field(description="Top 3-5 most important topics to focus on")


# --- The Plan Agent ---

async def generate_study_plan(
    syllabus_text: str,
    exam_type: str,
    goal: str,
    days: int = 7
) -> StudyPlan:
    """
    Generate a structured study plan using Gemini 3 with guaranteed JSON output.
    
    Args:
        syllabus_text: The extracted text from the syllabus/textbook
        exam_type: Type of exam (NEET, JEE, UPSC, CAT, etc.)
        goal: Student's personal goal
        days: Number of days until the exam
        
    Returns:
        StudyPlan: A validated Pydantic model with the complete plan
    """
    client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
    
    prompt = f"""
You are an expert exam strategist specializing in {exam_type} preparation.
Create a {days}-day study plan optimized for this student's goal.

STUDENT GOAL:
{goal}

SYLLABUS/CONTENT:
{syllabus_text[:10000]}

INSTRUCTIONS:
1. Prioritize high-weight topics based on exam patterns
2. Group related concepts together for better retention
3. Start with foundational concepts, build to complex ones
4. Include revision days for spaced repetition
5. Be realistic with time estimates (max 6-8 hours/day)
6. Identify the 3-5 most critical topics that will have the highest impact
"""

    # Call Gemini 3 with Structured Output
    response = await client.aio.models.generate_content(
        model=os.getenv("GEMINI_MODEL", "gemini-2.5-pro-preview-05-06"),
        contents=prompt,
        config={
            "response_mime_type": "application/json",
            "response_schema": StudyPlan,  # Guarantees valid Pydantic object
        }
    )
    
    return response.parsed  # Returns validated Python object, not raw text!


# --- Sync version for simple use cases ---

def generate_study_plan_sync(
    syllabus_text: str,
    exam_type: str,
    goal: str,
    days: int = 7
) -> StudyPlan:
    """Synchronous wrapper for the plan generator."""
    import asyncio
    return asyncio.run(generate_study_plan(syllabus_text, exam_type, goal, days))


# --- Test the agent directly ---

if __name__ == "__main__":
    import asyncio
    from dotenv import load_dotenv
    
    load_dotenv()
    
    test_syllabus = """
    Biology - NEET Syllabus:
    1. Cell Biology - Cell structure, organelles, cell division
    2. Genetics - Mendelian genetics, molecular biology, DNA replication
    3. Human Physiology - Digestion, Circulation, Respiration, Excretion
    4. Plant Physiology - Photosynthesis, Respiration, Plant hormones
    5. Ecology - Ecosystems, Biodiversity, Environmental issues
    6. Evolution - Origin of life, Evolution theories, Human evolution
    """
    
    plan = asyncio.run(generate_study_plan(
        syllabus_text=test_syllabus,
        exam_type="NEET",
        goal="Score 650+ and master organic chemistry",
        days=7
    ))
    
    print("✅ Plan generated successfully!")
    print(f"Exam: {plan.exam_name}")
    print(f"Overview: {plan.overview}")
    print(f"Critical Topics: {plan.critical_topics}")
    print(f"Days: {len(plan.schedule)}")
    for day in plan.schedule:
        print(f"  Day {day.day}: {day.theme} ({day.estimated_hours}h)")
