"""
Agent I/O Schemas for ExamMentor AI.

These Pydantic models define the structured output format for each agent.
Pass these to Gemini 3's response_schema parameter for guaranteed JSON output.
"""

from typing import List, Optional
from pydantic import BaseModel, Field


# ============================================================================
# Agent 1: The Planner (Syllabus → JSON Plan)
# ============================================================================

class StudyDay(BaseModel):
    """A single day in the study plan."""
    day_number: int = Field(..., ge=1, le=30)
    focus_topics: List[str] = Field(..., min_length=1)
    estimated_hours: float = Field(..., ge=0.5, le=12)
    rationale: str = Field(..., description="Why these topics on this day")


class PlanOutput(BaseModel):
    """Output from the Planner agent."""
    exam_name: str
    total_days: int = Field(..., ge=1, le=30)
    schedule: List[StudyDay]
    critical_topics: List[str] = Field(..., description="Topics that need extra focus")


# ============================================================================
# Agent 2: The Tutor (Deep Think Output)
# ============================================================================

class ExplanationStep(BaseModel):
    """A step in the explanation process."""
    step_title: str
    content: str
    analogy: Optional[str] = Field(None, description="Real-world analogy if helpful")


class TutorOutput(BaseModel):
    """Output from the Tutor agent."""
    topic: str
    intuition: str = Field(..., description="High-level intuitive understanding")
    steps: List[ExplanationStep] = Field(..., min_length=1)
    real_world_example: str
    common_pitfall: str = Field(..., description="Common mistake students make")


# ============================================================================
# Agent 3: The Quiz Master (Adaptive)
# ============================================================================

class Question(BaseModel):
    """A single quiz question."""
    id: str
    text: str
    options: List[str] = Field(..., min_length=4, max_length=4)
    correct_option_index: int = Field(..., ge=0, le=3)
    explanation: str
    difficulty: str = Field(..., pattern="^(easy|medium|hard)$")


class QuizOutput(BaseModel):
    """Output from the Quiz Master agent."""
    topic: str
    questions: List[Question] = Field(..., min_length=1)


# ============================================================================
# Agent 4: The Evaluator (Misconception Detector)
# ============================================================================

class Evaluation(BaseModel):
    """Output from the Evaluator agent after quiz submission."""
    is_correct: bool
    score: int = Field(..., ge=0, le=100)
    detected_misconception: Optional[str] = Field(
        None, description="Specific conceptual error identified"
    )
    remediation_advice: str = Field(..., description="What to review/practice")


# ============================================================================
# Helper: Gemini Integration Example
# ============================================================================

def get_gemini_config(schema: type[BaseModel]) -> dict:
    """
    Generate Gemini config for structured output.
    
    Usage:
        response = client.models.generate_content(
            model="gemini-3-pro-preview",
            contents="Generate a quiz for Photosynthesis...",
            config=get_gemini_config(QuizOutput)
        )
        quiz = response.parsed  # Validated QuizOutput object
    """
    return {
        "response_mime_type": "application/json",
        "response_schema": schema
    }
