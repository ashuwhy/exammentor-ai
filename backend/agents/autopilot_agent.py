"""
Autopilot Agent - Orchestrates autonomous 30-minute learning sessions.

This is the flagship "Action Era" feature for the Gemini 3 hackathon.
It demonstrates long-running autonomy, self-correction, and multi-agent orchestration.
"""

import os
import asyncio
import datetime
from typing import List, Optional, Dict, Any, AsyncGenerator
from pydantic import BaseModel, Field
from enum import Enum
from google import genai

from agents.plan_agent import StudyPlan
from agents.tutor_agent import stream_explanation, generate_explanation
from agents.quiz_agent import generate_quiz, evaluate_answer, Question, DifficultyLevel
from agents.misconception_agent import analyze_and_bust_misconception


class AutopilotAction(str, Enum):
    """Types of actions the autopilot can take."""
    SESSION_STARTED = "session_started"
    TOPIC_SELECTED = "topic_selected"
    LESSON_STARTED = "lesson_started"
    LESSON_COMPLETED = "lesson_completed"
    QUIZ_GENERATED = "quiz_generated"
    ANSWER_EVALUATED = "answer_evaluated"
    MISCONCEPTION_DETECTED = "misconception_detected"
    MISCONCEPTION_BUSTED = "misconception_busted"
    TOPIC_COMPLETED = "topic_completed"
    PLAN_UPDATED = "plan_updated"
    SESSION_PAUSED = "session_paused"
    SESSION_COMPLETED = "session_completed"
    SELF_CORRECTION = "self_correction"


class AutopilotStep(BaseModel):
    """A single step in the autopilot run log."""
    timestamp: str
    action: AutopilotAction
    data: Dict[str, Any] = Field(default_factory=dict)
    reasoning: str = Field(description="Why this action was taken")
    duration_ms: Optional[int] = None


class TopicMastery(BaseModel):
    """Tracks mastery level for a topic."""
    topic: str
    score: float = 0.0  # 0-100
    attempts: int = 0
    misconceptions: List[str] = Field(default_factory=list)
    last_attempted: Optional[str] = None


class AutopilotSession(BaseModel):
    """State of an autopilot session."""
    session_id: str
    status: str = "idle"  # idle, running, paused, completed
    started_at: Optional[str] = None
    paused_at: Optional[str] = None
    completed_at: Optional[str] = None
    target_duration_minutes: int = 30
    elapsed_seconds: int = 0
    
    # Progress tracking
    current_topic: Optional[str] = None
    current_phase: str = "selecting_topic"  # selecting_topic, teaching, quizzing, analyzing
    topics_completed: int = 0
    topics_attempted: List[str] = Field(default_factory=list)
    
    # Mastery tracking
    topic_mastery: Dict[str, TopicMastery] = Field(default_factory=dict)
    
    # Run log (the key "Action Era" showcase)
    steps: List[AutopilotStep] = Field(default_factory=list)
    
    # Context
    study_plan: Optional[Dict[str, Any]] = None
    exam_type: str = "NEET"


class TopicSelection(BaseModel):
    """Schema for AI topic selection decision."""
    selected_topic: str
    reasoning: str = Field(description="Why this topic was chosen next")
    priority_score: float = Field(description="0-1 score for topic urgency")
    prerequisites_met: bool
    estimated_difficulty: str


# --- Autopilot Engine ---

class AutopilotEngine:
    """
    The main orchestrator for autonomous learning sessions.
    
    This engine:
    1. Selects the next topic based on mastery levels
    2. Teaches 2 micro-lessons using the Tutor Agent
    3. Quizzes the student with 3-5 questions
    4. Diagnoses errors and updates the plan
    5. Logs every decision with reasoning for the run log
    """
    
    def __init__(self, session: AutopilotSession):
        self.session = session
        self.client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
        self._running = False
        self._paused = False
    
    def log_step(
        self,
        action: AutopilotAction,
        data: Dict[str, Any],
        reasoning: str,
        duration_ms: Optional[int] = None
    ) -> AutopilotStep:
        """Log a step to the run log."""
        step = AutopilotStep(
            timestamp=datetime.datetime.now(datetime.timezone.utc).isoformat(),
            action=action,
            data=data,
            reasoning=reasoning,
            duration_ms=duration_ms
        )
        self.session.steps.append(step)
        return step
    
    async def select_next_topic(self) -> Optional[str]:
        """Use AI to select the next topic based on mastery and plan."""
        if not self.session.study_plan:
            return None
        
        # Get all topics from the plan
        all_topics = []
        schedule = self.session.study_plan.get("schedule", [])
        for day in schedule:
            topics = day.get("focus_topics", []) or day.get("topics", [])
            if isinstance(topics, list):
                for t in topics:
                    if isinstance(t, dict):
                        all_topics.append(t.get("name", str(t)))
                    else:
                        all_topics.append(str(t))
        
        if not all_topics:
            return None
        
        # Build mastery context
        mastery_context = []
        for topic in all_topics:
            mastery = self.session.topic_mastery.get(topic, TopicMastery(topic=topic))
            mastery_context.append(f"- {topic}: {mastery.score}% (attempts: {mastery.attempts})")
        
        prompt = f"""
You are an intelligent tutor deciding which topic to teach next.

AVAILABLE TOPICS:
{chr(10).join(mastery_context)}

ALREADY COMPLETED THIS SESSION:
{', '.join(self.session.topics_attempted) or 'None yet'}

EXAM TYPE: {self.session.exam_type}

Select the best topic to study next based on:
1. Lowest mastery scores should generally be prioritized
2. Prerequisites should be studied before advanced topics
3. Avoid repeating topics already attempted this session unless mastery is very low
4. Consider spaced repetition for medium-mastery topics

Return your decision using the response schema.
"""
        
        start_time = datetime.datetime.now()
        
        response = await self.client.aio.models.generate_content(
            model=os.getenv("GEMINI_MODEL", "gemini-3-flash-preview"),
            contents=prompt,
            config={
                "response_mime_type": "application/json",
                "response_schema": TopicSelection,
            }
        )
        
        selection = response.parsed
        duration = int((datetime.datetime.now() - start_time).total_seconds() * 1000)
        
        self.log_step(
            action=AutopilotAction.TOPIC_SELECTED,
            data={
                "topic": selection.selected_topic,
                "priority_score": selection.priority_score,
                "difficulty": selection.estimated_difficulty
            },
            reasoning=selection.reasoning,
            duration_ms=duration
        )
        
        return selection.selected_topic
    
    async def teach_micro_lesson(self, topic: str, lesson_num: int) -> str:
        """Teach a focused micro-lesson on the topic."""
        self.session.current_phase = "teaching"
        
        start_time = datetime.datetime.now()
        
        self.log_step(
            action=AutopilotAction.LESSON_STARTED,
            data={"topic": topic, "lesson_number": lesson_num},
            reasoning=f"Starting micro-lesson {lesson_num} for {topic}"
        )
        
        # Use the tutor agent
        context = f"Exam: {self.session.exam_type}. This is micro-lesson {lesson_num}/2."
        explanation = await generate_explanation(topic, context, "medium")
        
        duration = int((datetime.datetime.now() - start_time).total_seconds() * 1000)
        
        self.log_step(
            action=AutopilotAction.LESSON_COMPLETED,
            data={
                "topic": topic,
                "lesson_number": lesson_num,
                "intuition": explanation.intuition if explanation else "Lesson completed"
            },
            reasoning=f"Completed micro-lesson {lesson_num}. Covered: {explanation.intuition[:100] if explanation else 'core concepts'}...",
            duration_ms=duration
        )
        
        return explanation.intuition if explanation else ""
    
    async def run_quiz(self, topic: str) -> Dict[str, Any]:
        """Generate and run a quiz, returning results."""
        self.session.current_phase = "quizzing"
        
        start_time = datetime.datetime.now()
        context = f"Exam: {self.session.exam_type}"
        
        # Get previous misconceptions for adaptive quizzing
        mastery = self.session.topic_mastery.get(topic, TopicMastery(topic=topic))
        previous_mistakes = mastery.misconceptions[:3] if mastery.misconceptions else None
        
        quiz = await generate_quiz(
            topic=topic,
            context=context,
            num_questions=3,
            difficulty=DifficultyLevel.MEDIUM,
            previous_mistakes=previous_mistakes
        )
        
        duration = int((datetime.datetime.now() - start_time).total_seconds() * 1000)
        
        self.log_step(
            action=AutopilotAction.QUIZ_GENERATED,
            data={
                "topic": topic,
                "num_questions": len(quiz.questions) if quiz else 0,
                "targeted_misconceptions": previous_mistakes or []
            },
            reasoning=f"Generated {len(quiz.questions) if quiz else 0}-question quiz" + 
                      (f" targeting previous misconceptions: {previous_mistakes}" if previous_mistakes else ""),
            duration_ms=duration
        )
        
        return {
            "quiz": quiz,
            "questions": [q.model_dump() for q in quiz.questions] if quiz else []
        }
    
    async def analyze_quiz_results(
        self,
        topic: str,
        questions: List[Question],
        answers: List[int]
    ) -> Dict[str, Any]:
        """Analyze quiz results and update mastery."""
        self.session.current_phase = "analyzing"
        
        correct = 0
        misconceptions_found = []
        
        for i, (question, answer) in enumerate(zip(questions, answers)):
            is_correct = answer == question.correct_option_index
            if is_correct:
                correct += 1
            else:
                # Analyze the wrong answer
                start_time = datetime.datetime.now()
                
                self.log_step(
                    action=AutopilotAction.MISCONCEPTION_DETECTED,
                    data={
                        "question": question.text[:100],
                        "student_choice": question.options[answer],
                        "correct_answer": question.options[question.correct_option_index]
                    },
                    reasoning=f"Student chose '{question.options[answer]}' but correct was '{question.options[question.correct_option_index]}'"
                )
                
                # Use misconception agent
                try:
                    analysis = await analyze_and_bust_misconception(
                        question=question,
                        wrong_answer_index=answer,
                        topic_context=f"Topic: {topic}. Exam: {self.session.exam_type}"
                    )
                    
                    duration = int((datetime.datetime.now() - start_time).total_seconds() * 1000)
                    
                    self.log_step(
                        action=AutopilotAction.MISCONCEPTION_BUSTED,
                        data={
                            "confusion": analysis.inferred_confusion if analysis else "Unknown",
                            "counter_example": analysis.counter_example[:100] if analysis else ""
                        },
                        reasoning=f"Identified confusion: {analysis.inferred_confusion if analysis else 'analysis pending'}",
                        duration_ms=duration
                    )
                    
                    if analysis:
                        misconceptions_found.append(analysis.inferred_confusion)
                except Exception as e:
                    print(f"Misconception analysis error: {e}")
        
        # Update mastery
        score = (correct / len(questions)) * 100 if questions else 0
        mastery = self.session.topic_mastery.get(topic, TopicMastery(topic=topic))
        
        # Weighted average with previous attempts
        if mastery.attempts > 0:
            old_weight = min(mastery.attempts, 3) / (mastery.attempts + 1)
            new_weight = 1 - old_weight
            mastery.score = (mastery.score * old_weight) + (score * new_weight)
        else:
            mastery.score = score
        
        mastery.attempts += 1
        mastery.misconceptions.extend(misconceptions_found)
        mastery.last_attempted = datetime.datetime.now(datetime.timezone.utc).isoformat()
        self.session.topic_mastery[topic] = mastery
        
        self.log_step(
            action=AutopilotAction.TOPIC_COMPLETED,
            data={
                "topic": topic,
                "score": score,
                "correct": correct,
                "total": len(questions),
                "new_mastery": mastery.score
            },
            reasoning=f"Completed topic with {correct}/{len(questions)} correct. Mastery updated to {mastery.score:.1f}%"
        )
        
        return {
            "score": score,
            "correct": correct,
            "total": len(questions),
            "misconceptions": misconceptions_found,
            "new_mastery_level": mastery.score
        }
    
    async def run_session(self) -> AsyncGenerator[AutopilotStep, None]:
        """
        Run the full autopilot session, yielding steps as they occur.
        
        This is the main orchestration loop that demonstrates "Action Era" autonomy.
        """
        self._running = True
        self.session.status = "running"
        self.session.started_at = datetime.datetime.now(datetime.timezone.utc).isoformat()
        
        yield self.log_step(
            action=AutopilotAction.SESSION_STARTED,
            data={
                "target_duration": self.session.target_duration_minutes,
                "exam_type": self.session.exam_type
            },
            reasoning=f"Starting {self.session.target_duration_minutes}-minute autonomous learning session"
        )
        
        session_start = datetime.datetime.now()
        target_duration = datetime.timedelta(minutes=self.session.target_duration_minutes)
        
        while self._running:
            # Check if paused
            if self._paused:
                self.session.status = "paused"
                yield self.log_step(
                    action=AutopilotAction.SESSION_PAUSED,
                    data={},
                    reasoning="Session paused by user"
                )
                await asyncio.sleep(1)
                continue
            
            # Check time limit
            elapsed = datetime.datetime.now() - session_start
            self.session.elapsed_seconds = int(elapsed.total_seconds())
            
            if elapsed >= target_duration:
                break
            
            # --- Main Loop: Select → Teach → Quiz → Analyze ---
            
            # 1. Select next topic
            self.session.current_phase = "selecting_topic"
            topic = await self.select_next_topic()
            
            if not topic:
                yield self.log_step(
                    action=AutopilotAction.SELF_CORRECTION,
                    data={"issue": "no_topics_available"},
                    reasoning="No more topics to study. Ending session early."
                )
                break
            
            self.session.current_topic = topic
            self.session.topics_attempted.append(topic)
            
            # 2. Teach 2 micro-lessons
            for lesson_num in [1, 2]:
                if not self._running or self._paused:
                    break
                await self.teach_micro_lesson(topic, lesson_num)
                yield self.session.steps[-1]  # Yield the lesson completed step
                await asyncio.sleep(0.5)  # Small delay for UI updates
            
            if not self._running or self._paused:
                continue
            
            # 3. Quiz
            quiz_result = await self.run_quiz(topic)
            yield self.session.steps[-1]  # Yield quiz generated step
            
            if quiz_result["quiz"]:
                # Simulate answers (in real app, this would come from UI)
                # For demo, we'll generate "student" answers that are mostly correct
                questions = quiz_result["quiz"].questions
                simulated_answers = []
                for q in questions:
                    # 70% chance of correct answer for demo
                    import random
                    if random.random() < 0.7:
                        simulated_answers.append(q.correct_option_index)
                    else:
                        wrong_indices = [i for i in range(len(q.options)) if i != q.correct_option_index]
                        simulated_answers.append(random.choice(wrong_indices) if wrong_indices else 0)
                
                # 4. Analyze results
                analysis = await self.analyze_quiz_results(topic, questions, simulated_answers)
                yield self.session.steps[-1]  # Yield topic completed step
            
            self.session.topics_completed += 1
            
            # Brief pause before next topic
            await asyncio.sleep(1)
        
        # Session complete
        self.session.status = "completed"
        self.session.completed_at = datetime.datetime.now(datetime.timezone.utc).isoformat()
        
        yield self.log_step(
            action=AutopilotAction.SESSION_COMPLETED,
            data={
                "topics_completed": self.session.topics_completed,
                "total_steps": len(self.session.steps),
                "duration_seconds": self.session.elapsed_seconds
            },
            reasoning=f"Completed {self.session.topics_completed} topics in {self.session.elapsed_seconds // 60} minutes"
        )
        
        self._running = False
    
    def pause(self):
        """Pause the session."""
        self._paused = True
    
    def resume(self):
        """Resume the session."""
        self._paused = False
        self.session.status = "running"
    
    def stop(self):
        """Stop the session."""
        self._running = False


# --- Session Manager (for API endpoints) ---

# In-memory session storage (use Supabase in production)
_active_sessions: Dict[str, AutopilotSession] = {}
_active_engines: Dict[str, AutopilotEngine] = {}


def get_or_create_session(session_id: str) -> AutopilotSession:
    """Get or create an autopilot session."""
    if session_id not in _active_sessions:
        _active_sessions[session_id] = AutopilotSession(session_id=session_id)
    return _active_sessions[session_id]


def get_session(session_id: str) -> Optional[AutopilotSession]:
    """Get an existing session."""
    return _active_sessions.get(session_id)


def get_engine(session_id: str) -> Optional[AutopilotEngine]:
    """Get the engine for a session."""
    return _active_engines.get(session_id)


async def start_autopilot(
    session_id: str,
    study_plan: Dict[str, Any],
    exam_type: str = "NEET",
    duration_minutes: int = 30
) -> AutopilotSession:
    """Start a new autopilot session."""
    session = get_or_create_session(session_id)
    session.study_plan = study_plan
    session.exam_type = exam_type
    session.target_duration_minutes = duration_minutes
    
    engine = AutopilotEngine(session)
    _active_engines[session_id] = engine
    
    # Start the session in background
    asyncio.create_task(_run_session_background(session_id, engine))
    
    return session


async def _run_session_background(session_id: str, engine: AutopilotEngine):
    """Run the session in background and store steps."""
    try:
        print(f"[AUTOPILOT] Starting background session: {session_id}")
        async for step in engine.run_session():
            # Steps are automatically added to session.steps in the engine
            print(f"[AUTOPILOT] Step: {step.action.value} - {step.reasoning[:50]}...")
    except Exception as e:
        print(f"[AUTOPILOT] ERROR in session {session_id}: {e}")
        import traceback
        traceback.print_exc()
        # Mark session as errored
        if session_id in _active_sessions:
            _active_sessions[session_id].status = "error"
    finally:
        # Cleanup
        if session_id in _active_engines:
            del _active_engines[session_id]
        print(f"[AUTOPILOT] Session {session_id} ended")
