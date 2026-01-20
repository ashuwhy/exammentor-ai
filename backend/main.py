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
from supabase import create_client, Client

load_dotenv()

url: str = os.getenv("SUPABASE_URL")
key: str = os.getenv("SUPABASE_KEY")
supabase: Client = create_client(url, key)


app = FastAPI(
    title="ExamMentor AI",
    description="Multi-Agent Study Coach powered by Gemini 3",
    version="0.1.0"
)

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all for hackathon/production ease
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
    history: Optional[List[dict]] = None


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


class ImageTutorRequest(BaseModel):
    topic: str
    image_base64: str
    mime_type: str = "image/jpeg"


class MisconceptionRequest(BaseModel):
    question_id: str
    question_text: str
    options: List[str]
    correct_option_index: int
    student_answer_index: int
    concept_tested: str
    topic_context: str
    session_id: str
    session_id: str


class UserLoginRequest(BaseModel):
    name: str


class ChatHistoryRequest(BaseModel):
    user_id: str
    topic_id: str
    messages: List[dict]
    explanation: Optional[str] = None


class QuizPersistenceRequest(BaseModel):
    user_id: str
    topic_id: str
    questions: List[dict]


# --- Health Check ---

@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"ok": True, "service": "exammentor-ai", "version": "0.1.0"}


# --- Plan Agent Routes ---

@app.post("/api/plan/generate")
async def generate_plan(request: PlanRequest):
    """Generate a study plan (Legacy fallback)."""
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


@app.post("/api/plan/generate-verified")
async def generate_verified_plan_endpoint(request: PlanRequest):
    """Generate a verified study plan using iterative loops."""
    from agents.plan_agent import generate_verified_plan
    
    try:
        plan = await generate_verified_plan(
            syllabus_text=request.syllabus_text,
            exam_type=request.exam_type,
            goal=request.goal,
            days=request.days
        )
        return plan.model_dump()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/plan/generate-verified-with-history")
async def generate_verified_plan_with_history_endpoint(request: PlanRequest):
    """
    Generate a verified study plan with full self-correction history.
    
    This endpoint returns:
    - The final plan
    - All versions (v1, v2, v3...) during self-correction
    - Verification details for each version
    - Summary metrics (coverage %, overloaded days, etc.)
    
    This is the key "Action Era" feature showing AI self-correction.
    """
    from agents.plan_agent import generate_verified_plan_with_history
    
    try:
        result = await generate_verified_plan_with_history(
            syllabus_text=request.syllabus_text,
            exam_type=request.exam_type,
            goal=request.goal,
            days=request.days
        )
        
        # Serialize the full history
        return {
            "final_plan": result.final_plan.model_dump(),
            "versions": [
                {
                    "version": v.version,
                    "plan": v.plan.model_dump(),
                    "verification": v.verification.model_dump() if v.verification else None,
                    "was_accepted": v.was_accepted
                }
                for v in result.versions
            ],
            "total_iterations": result.total_iterations,
            "self_correction_applied": result.self_correction_applied,
            "verification_summary": result.verification_summary
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/plan/stream-verified")
async def stream_verified_plan_endpoint(request: PlanRequest):
    """
    Stream the plan generation process with self-correction events.
    Returns a stream of newline-delimited JSON chunks.
    """
    from agents.plan_agent import stream_verified_plan_with_history
    
    async def generate():
        async for chunk in stream_verified_plan_with_history(
            syllabus_text=request.syllabus_text,
            exam_type=request.exam_type,
            goal=request.goal,
            days=request.days
        ):
            yield chunk
            
    return StreamingResponse(generate(), media_type="application/x-ndjson")


# --- Tutor Agent Routes ---

@app.post("/api/tutor/explain")
async def explain_topic(request: TutorRequest):
    """Get a structured explanation for a topic."""
    from agents.tutor_agent import generate_explanation
    
    try:
        explanation = await generate_explanation(
            topic=request.topic,
            context=request.context,
            difficulty=request.difficulty,
            history=request.history
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
            difficulty=request.difficulty,
            history=request.history
        ):
            yield chunk
    
    return StreamingResponse(generate(), media_type="application/x-ndjson")


@app.post("/api/tutor/explain-image")
async def explain_image_endpoint(request: ImageTutorRequest):
    """Explain a topic using an uploaded image."""
    from agents.tutor_agent import explain_image
    import base64
    
    try:
        image_bytes = base64.b64decode(request.image_base64)
        explanation = await explain_image(
            topic=request.topic,
            image_bytes=image_bytes,
            mime_type=request.mime_type
        )
        return explanation.model_dump()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


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


class ImageQuizRequest(BaseModel):
    topic: str
    image_base64: str
    mime_type: str = "image/jpeg"
    num_questions: int = 5
    difficulty: str = "medium"


@app.post("/api/quiz/generate-from-image")
async def generate_quiz_from_image_endpoint(request: ImageQuizRequest):
    """
    Generate a quiz from a diagram/image with visual grounding.
    
    This is the key multimodal-central feature for the hackathon.
    Questions include references like "In the top-left section..."
    to demonstrate real multimodal reasoning.
    """
    from agents.quiz_agent import generate_quiz_from_image, DifficultyLevel
    import base64
    
    try:
        image_bytes = base64.b64decode(request.image_base64)
        difficulty = DifficultyLevel(request.difficulty)
        
        quiz = await generate_quiz_from_image(
            topic=request.topic,
            image_bytes=image_bytes,
            mime_type=request.mime_type,
            num_questions=request.num_questions,
            difficulty=difficulty
        )
        
        return {
            "topic": quiz.topic,
            "image_description": quiz.image_description,
            "visual_elements_used": quiz.visual_elements_used,
            "time_estimate_minutes": quiz.time_estimate_minutes,
            "questions": [
                {
                    "id": q.id,
                    "text": q.text,
                    "visual_reference": q.visual_reference,
                    "options": q.options,
                    "correct_option_index": q.correct_option_index,
                    "explanation": q.explanation,
                    "difficulty": q.difficulty.value,
                    "concept_tested": q.concept_tested
                }
                for q in quiz.questions
            ]
        }
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


@app.post("/api/quiz/misconception")
async def bust_misconception_endpoint(request: MisconceptionRequest):
    """Analyze a wrong answer and generate a counter-example + redemption question."""
    from agents.misconception_agent import analyze_and_bust_misconception
    from agents.quiz_agent import Question, QuestionType, DifficultyLevel
    from agents.state_machine import StateMachine, StudentContext
    
    try:
        # Reconstruct question
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
        
        analysis = await analyze_and_bust_misconception(
            question=question,
            wrong_answer_index=request.student_answer_index,
            topic_context=request.topic_context
        )
        
        # Log the misconception to persistent state
        context = StudentContext(user_id="", session_id=request.session_id)
        sm = StateMachine(context)
        await sm.log_action("misconception_buster", {
            "topic": request.concept_tested,
            "confusion": analysis.inferred_confusion
        })
        
        return analysis.model_dump()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# --- Session Management Routes ---

@app.get("/api/session/{session_id}/state")
async def get_session_state(session_id: str):
    """Resume session state from Supabase."""
    from agents.state_machine import StateMachine, StudentContext
    
    try:
        context = StudentContext(user_id="", session_id=session_id)
        sm = StateMachine(context)
        phase = await sm.load_state()
        
        return {
            "phase": phase.value if phase else "INTAKE",
            "context": sm.context.model_dump()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/session/{session_id}/save")
async def save_session_state(session_id: str, context_data: dict, phase: str):
    """Manually save session state."""
    from agents.state_machine import StateMachine, StudentContext, StudyPhase
    
    try:
        context = StudentContext(**context_data)
        sm = StateMachine(context)
        await sm.save_state(StudyPhase(phase))
        return {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# --- Autopilot Mode Routes (Action Era Showcase) ---

class AutopilotStartRequest(BaseModel):
    study_plan: dict
    exam_type: str = "NEET"
    duration_minutes: int = 30


@app.post("/api/autopilot/start")
async def start_autopilot_session(session_id: str, request: AutopilotStartRequest):
    """
    Start an autonomous 30-minute learning session.
    
    This is the flagship "Action Era" feature - the AI orchestrates 
    topic selection, teaching, quizzing, and self-correction without user clicks.
    """
    from agents.autopilot_agent import start_autopilot, get_session
    
    try:
        # Check if session already running
        existing = get_session(session_id)
        if existing and existing.status == "running":
            raise HTTPException(status_code=400, detail="Session already running")
        
        session = await start_autopilot(
            session_id=session_id,
            study_plan=request.study_plan,
            exam_type=request.exam_type,
            duration_minutes=request.duration_minutes
        )
        
        return {
            "session_id": session.session_id,
            "status": session.status,
            "target_duration_minutes": session.target_duration_minutes,
            "started_at": session.started_at
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/autopilot/status/{session_id}")
async def get_autopilot_status(session_id: str):
    """
    Get current autopilot session status and run log.
    
    Returns the full run log showing every AI decision with reasoning.
    """
    from agents.autopilot_agent import get_session
    
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return {
        "session_id": session.session_id,
        "status": session.status,
        "current_phase": session.current_phase,
        "current_topic": session.current_topic,
        "topics_completed": session.topics_completed,
        "elapsed_seconds": session.elapsed_seconds,
        "target_duration_minutes": session.target_duration_minutes,
        "topic_mastery": {k: v.model_dump() for k, v in session.topic_mastery.items()},
        "steps": [step.model_dump() for step in session.steps],
        "started_at": session.started_at,
        "completed_at": session.completed_at,
        
        # Interactive State
        "current_content": session.current_content,
        "current_question": session.current_question,
        "awaiting_input": session.awaiting_input
    }


@app.post("/api/autopilot/pause/{session_id}")
async def pause_autopilot_session(session_id: str):
    """Pause the running autopilot session."""
    from agents.autopilot_agent import get_session, get_engine
    
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    if session.status != "running":
        raise HTTPException(status_code=400, detail="Session is not running")
    
    engine = get_engine(session_id)
    if engine:
        engine.pause()
    
    return {"status": "paused", "session_id": session_id}


@app.post("/api/autopilot/resume/{session_id}")
async def resume_autopilot_session(session_id: str):
    """Resume a paused autopilot session."""
    from agents.autopilot_agent import get_session, get_engine
    
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    if session.status != "paused":
        raise HTTPException(status_code=400, detail="Session is not paused")
    
    engine = get_engine(session_id)
    if engine:
        engine.resume()
    
    return {"status": "running", "session_id": session_id}


@app.post("/api/autopilot/stop/{session_id}")
async def stop_autopilot_session(session_id: str):
    """Stop the autopilot session."""
    from agents.autopilot_agent import get_session, get_engine
    
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    engine = get_engine(session_id)
    if engine:
        engine.stop()
    
    return {"status": "stopped", "session_id": session_id}


class AutopilotAnswerRequest(BaseModel):
    answer_index: int


@app.post("/api/autopilot/answer/{session_id}")
async def submit_autopilot_answer(session_id: str, request: AutopilotAnswerRequest):
    """Submit an answer to the running autopilot session."""
    from agents.autopilot_agent import get_session, get_engine
    
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    if not session.awaiting_input:
        raise HTTPException(status_code=400, detail="Session is not waiting for input")
    
    engine = get_engine(session_id)
    if engine:
        engine.submit_answer(request.answer_index)
        return {"status": "answer_received", "session_id": session_id}
    
    raise HTTPException(status_code=500, detail="Engine not found")


# --- Run with: uvicorn main:app --reload --port 8000 ---

# --- User & Persistence Routes ---

@app.post("/api/users/login")
async def user_login(request: UserLoginRequest):
    """Create or retrieve user by name."""
    try:
        # Check if user exists
        response = supabase.table("users").select("*").eq("name", request.name).execute()
        if response.data:
            return response.data[0]
        
        # Create new user
        response = supabase.table("users").insert({"name": request.name}).execute()
        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/tutor/chat")
async def get_chat_history(user_id: str, topic_id: str):
    """Get chat history."""
    try:
        response = supabase.table("tutor_chats").select("messages, explanation").eq("user_id", user_id).eq("topic_id", topic_id).execute()
        if response.data:
            return response.data[0]
        return {"messages": [], "explanation": None}
    except Exception as e:
        # If error occurs (e.g. valid UUID format check), return empty
        print(f"Chat fetch error: {e}")
        return {"messages": []}


@app.post("/api/tutor/chat")
async def save_chat_history(request: ChatHistoryRequest):
    """Save chat history."""
    try:
        data = {
            "user_id": request.user_id,
            "topic_id": request.topic_id,
            "messages": request.messages,
            "explanation": request.explanation,
            # last_updated defaults to now()
        }
        # Upsert requires unique constraint
        supabase.table("tutor_chats").upsert(data, on_conflict="user_id, topic_id").execute()
        return {"status": "success"}
    except Exception as e:
        print(f"Chat save error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/quiz/persistence")
async def get_saved_quiz(user_id: str, topic_id: str):
    """Get saved quiz for a topic."""
    try:
        response = supabase.table("quizzes").select("questions").eq("user_id", user_id).eq("topic_id", topic_id).order("created_at", desc=True).limit(1).execute()
        if response.data:
            return response.data[0]
        return None
    except Exception as e:
        print(f"Quiz fetch error: {e}")
        return None


@app.post("/api/quiz/persistence")
async def save_quiz(request: QuizPersistenceRequest):
    """Save generated quiz."""
    try:
        data = {
            "user_id": request.user_id,
            "topic_id": request.topic_id,
            "questions": request.questions
        }
        supabase.table("quizzes").insert(data).execute()
        return {"status": "success"}
    except Exception as e:
        print(f"Quiz save error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
