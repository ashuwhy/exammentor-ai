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


class PlanVerification(BaseModel):
    """Schema for the Plan Verifier's critique."""
    is_valid: bool = Field(description="True if the plan fulfills all syllabus requirements and constraints")
    missing_topics: List[str] = Field(description="Topics from the syllabus that were missed")
    overloaded_days: List[int] = Field(description="Day numbers where the workload exceeds 8 hours")
    prerequisite_issues: List[str] = Field(description="Topics scheduled before their prerequisites")
    critique: str = Field(description="Detailed feedback on what needs to be fixed")


# --- The Plan Agent ---

async def generate_study_plan(
    syllabus_text: str,
    exam_type: str,
    goal: str,
    days: int = 7
) -> StudyPlan:
    """Generate a structured study plan (Legacy/Draft version)."""
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

    response = await client.aio.models.generate_content(
        model=os.getenv("GEMINI_MODEL", "gemini-2.0-flash-exp"),
        contents=prompt,
        config={
            "response_mime_type": "application/json",
            "response_schema": StudyPlan,
        }
    )
    
    return response.parsed


async def verify_study_plan(
    plan: StudyPlan,
    syllabus_text: str,
    exam_type: str
) -> PlanVerification:
    """Verify the study plan against the syllabus and pedagogical best practices."""
    client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

    prompt = f"""
You are an expert Educational Auditor. 
Verify the following study plan for a {exam_type} exam against the provided syllabus.

STUDY PLAN:
{plan.model_dump_json()}

SYLLABUS:
{syllabus_text[:5000]}

CHECKLIST:
1. COVERAGE: Are all major topics from the syllabus included?
2. FEASIBILITY: Are any days overloaded (>8 hours)?
3. SEQUENCING: Are prerequisites scheduled before advanced topics?
4. STRATEGY: Is there enough time for revision?

Be critical. If anything is wrong, set is_valid to false and provide a detailed critique.
"""

    response = await client.aio.models.generate_content(
        model=os.getenv("GEMINI_MODEL", "gemini-2.0-flash-exp"),
        contents=prompt,
        config={
            "response_mime_type": "application/json",
            "response_schema": PlanVerification,
        }
    )

    return response.parsed


async def generate_verified_plan(
    syllabus_text: str,
    exam_type: str,
    goal: str,
    days: int = 7,
    max_iterations: int = 2
) -> StudyPlan:
    """Generate a study plan with self-correction verification loop."""
    client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
    
    # iteration 1: Draft
    print(f"🔄 Generating draft plan for {exam_type}...")
    current_plan = await generate_study_plan(syllabus_text, exam_type, goal, days)
    
    for i in range(max_iterations):
        print(f"🧐 Verifying plan (Iteration {i+1})...")
        verification = await verify_study_plan(current_plan, syllabus_text, exam_type)
        
        if verification.is_valid:
            print("✅ Plan verified successfully!")
            return current_plan
            
        print(f"❌ Verification failed: {verification.critique}")
        
        # fix the plan
        fix_prompt = f"""
You are an expert exam strategist. Fix the draft study plan based on the auditor's critique.

FIX CRITIQUE:
{verification.critique}

ORIGINAL GOAL: {goal}
SYLLABUS: {syllabus_text[:5000]}
CURRENT DRAFT: {current_plan.model_dump_json()}

REGENERATE THE FULL STUDY PLAN INCORPORATING ALL FIXES.
"""
        response = await client.aio.models.generate_content(
            model=os.getenv("GEMINI_MODEL", "gemini-2.0-flash-exp"),
            contents=fix_prompt,
            config={
                "response_mime_type": "application/json",
                "response_schema": StudyPlan,
            }
        )
        current_plan = response.parsed
        
    print("⚠️ Max iterations reached. Returning latest version.")
    return current_plan


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
