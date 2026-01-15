"""
Evaluator Agent - Analyzes quiz results and diagnoses knowledge gaps.

Provides personalized recommendations and tracks mastery progression.
"""

import os
from google import genai
from pydantic import BaseModel, Field
from typing import List, Optional


# --- Schemas ---

class TopicMastery(BaseModel):
    topic: str
    score: int = Field(description="Mastery score 0-100")
    status: str = Field(description="mastered, learning, weak, or pending")
    strength: str = Field(description="What the student does well")
    weakness: str = Field(description="Where the student struggles")


class Misconception(BaseModel):
    concept: str
    description: str = Field(description="What the student misunderstands")
    correction: str = Field(description="The correct understanding")
    suggested_review: str = Field(description="What to review to fix this")


class StudyRecommendation(BaseModel):
    priority: int = Field(description="1 = highest priority")
    topic: str
    action: str = Field(description="Specific action to take")
    time_estimate: str = Field(description="How long this will take")


class PerformanceAnalysis(BaseModel):
    overall_score: int = Field(description="Overall performance 0-100")
    summary: str = Field(description="Brief performance summary")
    topic_mastery: List[TopicMastery]
    misconceptions: List[Misconception]
    recommendations: List[StudyRecommendation]
    encouragement: str = Field(description="Motivational message for the student")


# --- Quiz Result Input ---

class QuizAnswer(BaseModel):
    question_id: str
    question_text: str
    concept_tested: str
    student_answer: str
    correct_answer: str
    is_correct: bool


# --- Evaluator Agent ---

async def analyze_performance(
    quiz_answers: List[QuizAnswer],
    topic: str,
    context: str
) -> PerformanceAnalysis:
    """
    Analyze quiz performance and generate personalized insights.
    
    Args:
        quiz_answers: List of student's answers with correctness
        topic: The topic that was quizzed
        context: Study material context
        
    Returns:
        PerformanceAnalysis: Comprehensive analysis with recommendations
    """
    client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
    
    # Format quiz results
    results_text = "\n".join([
        f"Q: {a.question_text}\n"
        f"   Concept: {a.concept_tested}\n"
        f"   Student: {a.student_answer} | Correct: {a.correct_answer} | {'✓' if a.is_correct else '✗'}"
        for a in quiz_answers
    ])
    
    correct_count = sum(1 for a in quiz_answers if a.is_correct)
    total = len(quiz_answers)
    
    prompt = f"""
You are an expert learning analyst and educational psychologist.
Analyze this student's quiz performance on "{topic}".

QUIZ RESULTS ({correct_count}/{total} correct):
{results_text}

STUDY CONTEXT:
{context[:3000]}

ANALYSIS REQUIREMENTS:
1. Calculate overall mastery and break down by sub-topic
2. Identify specific misconceptions from wrong answers
3. Prioritize what to study next (most impactful first)
4. Provide actionable, specific recommendations
5. Be encouraging - focus on growth mindset
"""

    response = await client.aio.models.generate_content(
        model=os.getenv("GEMINI_MODEL", "gemini-2.5-pro-preview-05-06"),
        contents=prompt,
        config={
            "response_mime_type": "application/json",
            "response_schema": PerformanceAnalysis,
        }
    )
    
    return response.parsed


# --- Progress Tracker ---

async def generate_progress_report(
    session_history: List[dict],
    exam_type: str,
    days_remaining: int
) -> dict:
    """
    Generate a comprehensive progress report across all sessions.
    """
    client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
    
    # This would aggregate data from multiple sessions
    # For MVP, we'll return a simplified analysis
    
    prompt = f"""
Generate a progress report for a {exam_type} student with {days_remaining} days remaining.

SESSION HISTORY:
{str(session_history)[:5000]}

Include:
1. Overall readiness assessment
2. Topics mastered vs needing work
3. Predicted score range
4. Suggested focus for remaining days
"""

    response = await client.aio.models.generate_content(
        model=os.getenv("GEMINI_MODEL", "gemini-2.5-pro-preview-05-06"),
        contents=prompt
    )
    
    return {"report": response.text}


# --- Test ---

if __name__ == "__main__":
    import asyncio
    from dotenv import load_dotenv
    
    load_dotenv()
    
    async def test_evaluator():
        print("📊 Testing Evaluator Agent...\n")
        
        test_answers = [
            QuizAnswer(
                question_id="q1",
                question_text="Where does the Calvin Cycle occur?",
                concept_tested="Calvin Cycle location",
                student_answer="Thylakoid",
                correct_answer="Stroma",
                is_correct=False
            ),
            QuizAnswer(
                question_id="q2",
                question_text="What is the key enzyme in carbon fixation?",
                concept_tested="RuBisCO function",
                student_answer="RuBisCO",
                correct_answer="RuBisCO",
                is_correct=True
            ),
        ]
        
        analysis = await analyze_performance(
            quiz_answers=test_answers,
            topic="Photosynthesis",
            context="The Calvin Cycle occurs in the stroma of chloroplasts..."
        )
        
        print(f"✅ Analysis complete!")
        print(f"   Overall Score: {analysis.overall_score}%")
        print(f"   Summary: {analysis.summary}")
        print(f"   Misconceptions: {len(analysis.misconceptions)}")
        print(f"   Recommendations: {len(analysis.recommendations)}")
        print(f"   Encouragement: {analysis.encouragement}")
    
    asyncio.run(test_evaluator())
