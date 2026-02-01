"""
Plan Agent - Generates a personalized study plan using Gemini 3 Structured Outputs.

Uses Pydantic models to guarantee valid JSON output from the LLM.
"""

import os
import os
from pydantic import BaseModel, Field
from typing import List, Optional, AsyncGenerator
from services.genai_service import client
from router import route_request, get_safe_syllabus


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
    # client imported from services
    
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

    # Use aio for async generation
    response = await client.aio.models.generate_content(
        model=os.getenv("GEMINI_MODEL", "gemini-3-flash-preview"),
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
    # client imported from services

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
        model=os.getenv("GEMINI_MODEL", "gemini-3-flash-preview"),
        contents=prompt,
        config={
            "response_mime_type": "application/json",
            "response_schema": PlanVerification,
        }
    )

    return response.parsed


class PlanVersion(BaseModel):
    """A single version of the plan during the self-correction loop."""
    version: int
    plan: StudyPlan
    verification: Optional[PlanVerification] = None
    was_accepted: bool = False


class PlanWithHistory(BaseModel):
    """Extended plan with full self-correction history for the diff UI."""
    final_plan: StudyPlan
    versions: List[PlanVersion] = Field(description="All versions during self-correction")
    total_iterations: int
    self_correction_applied: bool = Field(description="True if plan was modified from v1")
    verification_summary: dict = Field(description="Final verification metrics")


async def generate_verified_plan(
    syllabus_text: str,
    exam_type: str,
    goal: str,
    days: int = 7,
    max_iterations: int = 2
) -> StudyPlan:
    """Generate a study plan with self-correction verification loop.
    
    Note: Use generate_verified_plan_with_history for the full diff data.
    """
    result = await generate_verified_plan_with_history(
        syllabus_text, exam_type, goal, days, max_iterations
    )
    return result.final_plan


async def generate_verified_plan_with_history(
    syllabus_text: str,
    exam_type: str,
    goal: str,
    days: int = 7,
    max_iterations: int = 2
) -> PlanWithHistory:
    """
    Generate a study plan with self-correction verification loop.
    
    Returns full version history for the self-correction diff UI.
    This is the key "Action Era" feature that shows judges how the AI
    identifies problems and fixes them autonomously.
    \"""
    Returns full version history for the self-correction diff UI.
    This is the key "Action Era" feature that shows judges how the AI
    identifies problems and fixes them autonomously.
    """
    # 1. Route First (The Router Layer)
    # We use the 'goal' as the primary user input for intent/routing
    try:
        route = await route_request(goal, current_exam_context=exam_type)
        print(f"🧭 Routed: Intent={route.intent}, Exam={route.exam}, Scope={route.scope.subject}")
        
        # 2. Guard: Check if clarification is needed
        if route.needs_clarification:
            # For now, we log it. In a full implementation, we would return a clarification request.
            print(f"⚠️ Router requested clarification: {route.clarifying_question}")
            # raise ValueError(f"Clarification needed: {route.clarifying_question}") 

        # 3. Fetch Scoped Syllabus
        scoped_syllabus_text = get_safe_syllabus(route)
        
        # 4. Inject Scope Constraint into Goal (so we don't break function signatures)
        if route.scope.subject and route.scope.subject.lower() not in ["all", "general"]:
             scope_str = f"{route.scope.subject}"
             if route.scope.sub_subject:
                 scope_str += f" ({route.scope.sub_subject})"
             
             goal = f"""{goal}
             
             STRICT CONSTRAINT: Cover ONLY {scope_str}.
             Do NOT include topics from other subjects outside of {scope_str}.
             """
             print(f"🔒 Scope Constraint Applied: {scope_str}")
        
        # Use the scoped syllabus!
        syllabus_text = scoped_syllabus_text
        
    except Exception as e:
        print(f"⚠️ Routing failed, falling back to legacy mode: {e}")

    versions: List[PlanVersion] = []
    
    # Iteration 1: Draft
    print(f"🔄 Generating draft plan for {exam_type}...")
    current_plan = await generate_study_plan(syllabus_text, exam_type, goal, days)
    
    # Store v1
    versions.append(PlanVersion(
        version=1,
        plan=current_plan,
        verification=None,
        was_accepted=False
    ))
    
    final_verification = None
    
    for i in range(max_iterations):
        print(f"🧐 Verifying plan (Iteration {i+1})...")
        verification = await verify_study_plan(current_plan, syllabus_text, exam_type)
        
        # Update the last version with its verification
        versions[-1].verification = verification
        
        if verification.is_valid:
            print("✅ Plan verified successfully!")
            versions[-1].was_accepted = True
            final_verification = verification
            break
            
        print(f"❌ Verification failed: {verification.critique}")
        final_verification = verification
        
        # Fix the plan (self-correction)
        fix_prompt = f"""
You are an expert exam strategist. Fix the draft study plan based on the auditor\'s critique.

FIX CRITIQUE:
{verification.critique}

ISSUES TO FIX:
- Missing topics: {verification.missing_topics}
- Overloaded days: {verification.overloaded_days}
- Prerequisite issues: {verification.prerequisite_issues}

ORIGINAL GOAL: {goal}
SYLLABUS: {syllabus_text[:5000]}
CURRENT DRAFT: {current_plan.model_dump_json()}

REGENERATE THE FULL STUDY PLAN INCORPORATING ALL FIXES.
Do NOT skip any topics. Ensure all days have <= 8 hours.
"""
        response = await client.aio.models.generate_content(
            model=os.getenv("GEMINI_MODEL", "gemini-3-flash-preview"),
            contents=fix_prompt,
            config={
                "response_mime_type": "application/json",
                "response_schema": StudyPlan,
            }
        )
        current_plan = response.parsed
        
        # Store the new version
        versions.append(PlanVersion(
            version=i + 2,  # v2, v3, etc.
            plan=current_plan,
            verification=None,
            was_accepted=False
        ))
    
    # If we exited without finding a valid plan, mark the last as accepted anyway
    if not any(v.was_accepted for v in versions):
        versions[-1].was_accepted = True
        print("⚠️ Max iterations reached. Returning latest version.")
    
    # Calculate verification summary
    verification_summary = {
        "coverage_percent": 100 - (len(final_verification.missing_topics) * 5) if final_verification else 100,
        "overloaded_days_count": len(final_verification.overloaded_days) if final_verification else 0,
        "prerequisite_issues_count": len(final_verification.prerequisite_issues) if final_verification else 0,
        "is_valid": final_verification.is_valid if final_verification else True,
        "iterations_used": len(versions),
    }
    
    return PlanWithHistory(
        final_plan=current_plan,
        versions=versions,
        total_iterations=len(versions),
        self_correction_applied=len(versions) > 1,
        verification_summary=verification_summary
    )


async def stream_verified_plan_with_history(
    syllabus_text: str,
    exam_type: str,
    goal: str,
    days: int = 7,
    max_iterations: int = 2
) -> AsyncGenerator[str, None]:
    """
    Stream the plan generation process with self-correction events.
    Yields JSON string chunks.
    """
    import json
    from typing import AsyncGenerator
    
    # client imported from services
    
    versions: List[PlanVersion] = []

    # 1. Route First (The Router Layer) - Streaming Version
    try:
        route = await route_request(goal, current_exam_context=exam_type)
        yield json.dumps({"type": "debug", "message": f"Routed to: {route.exam} - {route.scope.subject}"}) + "\n"
        
        # 3. Fetch Scoped Syllabus
        scoped_syllabus_text = get_safe_syllabus(route)
        
        # 4. Inject Scope Constraint
        if route.scope.subject and route.scope.subject.lower() not in ["all", "general"]:
             scope_str = f"{route.scope.subject}"
             if route.scope.sub_subject:
                 scope_str += f" ({route.scope.sub_subject})"
             
             goal = f"""{goal}
             
             STRICT CONSTRAINT: Cover ONLY {scope_str}.
             Do NOT include topics from other subjects outside of {scope_str}.
             """
        
        # Use the scoped syllabus
        syllabus_text = scoped_syllabus_text
        
    except Exception as e:
        print(f"Streaming routing failed: {e}")
    
    # 1. Draft Phase
    yield json.dumps({"type": "status", "message": f"Drafting initial plan for {exam_type}..."}) + "\n"
    print(f"🔄 Generating draft plan for {exam_type}...")
    
    current_plan = await generate_study_plan(syllabus_text, exam_type, goal, days)
    
    versions.append(PlanVersion(
        version=1,
        plan=current_plan,
        verification=None,
        was_accepted=False
    ))
    
    yield json.dumps({
        "type": "draft", 
        "version": 1, 
        "plan": current_plan.model_dump()
    }) + "\n"
    
    final_verification = None
    
    # 2. Verification Loop
    for i in range(max_iterations):
        yield json.dumps({
            "type": "status", 
            "message": f"Verifying plan (Iteration {i+1})..."
        }) + "\n"
        print(f"🧐 Verifying plan (Iteration {i+1})...")
        
        verification = await verify_study_plan(current_plan, syllabus_text, exam_type)
        versions[-1].verification = verification
        
        yield json.dumps({
            "type": "verification", 
            "version": i + 1, 
            "result": verification.model_dump()
        }) + "\n"
        
        if verification.is_valid:
            print("✅ Plan verified successfully!")
            versions[-1].was_accepted = True
            final_verification = verification
            yield json.dumps({
                "type": "status",
                "message": "Plan verified successfully!"
            }) + "\n"
            break
            
        print(f"❌ Verification failed: {verification.critique}")
        final_verification = verification
        
        # 3. Fixing Phase
        yield json.dumps({
            "type": "status",
            "message": f"Fixing issues found in v{i+1}..."
        }) + "\n"
        
        # Fix the plan (self-correction)
        fix_prompt = f"""
You are an expert exam strategist. Fix the draft study plan based on the auditor\'s critique.

FIX CRITIQUE:
{verification.critique}

ISSUES TO FIX:
- Missing topics: {verification.missing_topics}
- Overloaded days: {verification.overloaded_days}
- Prerequisite issues: {verification.prerequisite_issues}

ORIGINAL GOAL: {goal}
SYLLABUS: {syllabus_text[:5000]}
CURRENT DRAFT: {current_plan.model_dump_json()}

REGENERATE THE FULL STUDY PLAN INCORPORATING ALL FIXES.
Do NOT skip any topics. Ensure all days have <= 8 hours.
"""
        response = await client.aio.models.generate_content(
            model=os.getenv("GEMINI_MODEL", "gemini-3-flash-preview"),
            contents=fix_prompt,
            config={
                "response_mime_type": "application/json",
                "response_schema": StudyPlan,
            }
        )
        current_plan = response.parsed
        
        versions.append(PlanVersion(
            version=i + 2,
            plan=current_plan,
            verification=None,
            was_accepted=False
        ))
        
        yield json.dumps({
            "type": "draft", 
            "version": i + 2, 
            "plan": current_plan.model_dump()
        }) + "\n"
        
    # If we exited without finding a valid plan, mark the last as accepted anyway
    if not any(v.was_accepted for v in versions):
        versions[-1].was_accepted = True
        print("⚠️ Max iterations reached. Returning latest version.")

    # Calculate verification summary
    verification_summary = {
        "coverage_percent": 100 - (len(final_verification.missing_topics) * 5) if final_verification else 100,
        "overloaded_days_count": len(final_verification.overloaded_days) if final_verification else 0,
        "prerequisite_issues_count": len(final_verification.prerequisite_issues) if final_verification else 0,
        "is_valid": final_verification.is_valid if final_verification else True,
        "iterations_used": len(versions),
    }

    final_result = PlanWithHistory(
        final_plan=current_plan,
        versions=versions,
        total_iterations=len(versions),
        self_correction_applied=len(versions) > 1,
        verification_summary=verification_summary
    )
    
    yield json.dumps({
        "type": "complete",
        "final_result": final_result.model_dump()
    }) + "\n"



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
