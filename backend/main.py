"""
ExamMentor AI - FastAPI Backend

Main API server with endpoints for all agents.
Supports streaming responses for real-time UI feedback.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(
    title="ExamMentor AI",
    description="Multi-Agent Study Coach powered by Gemini 3",
    version="0.1.0"
)

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Request/Response Models ---

class PlanRequest(BaseModel):
    syllabus_text: str
    exam_type: str
    goal: str
    days: int = 7


class TutorRequest(BaseModel):
    topic: str
    context: str
    difficulty: str = "medium"


class QuizRequest(BaseModel):
    topic: str
    context: str
    num_questions: int = 5
    difficulty: str = "medium"
    previous_mistakes: Optional[List[str]] = None


class AnswerRequest(BaseModel):
    question_id: str
    question_text: str
    options: List[str]
    correct_option_index: int
    student_answer_index: int
    concept_tested: str
    topic_context: str


class AnalysisRequest(BaseModel):
    quiz_answers: List[dict]
    topic: str
    context: str


# --- Health Check ---

@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"ok": True, "service": "exammentor-ai", "version": "0.1.0"}


# --- Plan Agent Routes ---

@app.post("/api/plan/generate")
async def generate_plan(request: PlanRequest):
    """Generate a study plan using the Plan Agent."""
    from agents.plan_agent import generate_study_plan
    
    try:
        plan = await generate_study_plan(
            syllabus_text=request.syllabus_text,
            exam_type=request.exam_type,
            goal=request.goal,
            days=request.days
        )
        return plan.model_dump()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# --- Tutor Agent Routes ---

@app.post("/api/tutor/explain")
async def explain_topic(request: TutorRequest):
    """Get a structured explanation for a topic."""
    from agents.tutor_agent import generate_explanation
    
    try:
        explanation = await generate_explanation(
            topic=request.topic,
            context=request.context,
            difficulty=request.difficulty
        )
        return explanation.model_dump()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/tutor/stream")
async def stream_topic_explanation(request: TutorRequest):
    """Stream an explanation for real-time UI."""
    from agents.tutor_agent import stream_explanation
    
    async def generate():
        async for chunk in stream_explanation(
            topic=request.topic,
            context=request.context,
            difficulty=request.difficulty
        ):
            yield chunk
    
    return StreamingResponse(generate(), media_type="text/plain")


# --- Quiz Agent Routes ---

@app.post("/api/quiz/generate")
async def generate_quiz_endpoint(request: QuizRequest):
    """Generate a quiz for a topic."""
    from agents.quiz_agent import generate_quiz, DifficultyLevel
    
    try:
        difficulty = DifficultyLevel(request.difficulty)
        quiz = await generate_quiz(
            topic=request.topic,
            context=request.context,
            num_questions=request.num_questions,
            difficulty=difficulty,
            previous_mistakes=request.previous_mistakes
        )
        return quiz.model_dump()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/quiz/evaluate")
async def evaluate_answer_endpoint(request: AnswerRequest):
    """Evaluate a student's answer."""
    from agents.quiz_agent import evaluate_answer, Question, DifficultyLevel, QuestionType
    
    try:
        # Reconstruct question object
        question = Question(
            id=request.question_id,
            text=request.question_text,
            question_type=QuestionType.MULTIPLE_CHOICE,
            options=request.options,
            correct_option_index=request.correct_option_index,
            explanation="",
            difficulty=DifficultyLevel.MEDIUM,
            concept_tested=request.concept_tested
        )
        
        evaluation = await evaluate_answer(
            question=question,
            student_answer_index=request.student_answer_index,
            topic_context=request.topic_context
        )
        return evaluation.model_dump()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# --- Evaluator Agent Routes ---

@app.post("/api/analyze/performance")
async def analyze_performance_endpoint(request: AnalysisRequest):
    """Analyze quiz performance and generate insights."""
    from agents.evaluator_agent import analyze_performance, QuizAnswer
    
    try:
        # Convert dict to QuizAnswer objects
        quiz_answers = [QuizAnswer(**a) for a in request.quiz_answers]
        
        analysis = await analyze_performance(
            quiz_answers=quiz_answers,
            topic=request.topic,
            context=request.context
        )
        return analysis.model_dump()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# --- Run with: uvicorn main:app --reload --port 8000 ---

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
