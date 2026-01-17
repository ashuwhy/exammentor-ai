"""
State Machine for ExamMentor AI Agent Workflow.

Ensures the AI follows a structured learning path:
INTAKE → PLANNING → LEARNING → QUIZZING → ANALYZING → COMPLETED
"""

from enum import Enum
from typing import Optional, List, Dict, Any
from pydantic import BaseModel
import os
from supabase import create_client, Client
import json
import datetime


class StudyPhase(str, Enum):
    """Phases of the study workflow."""
    INTAKE = "INTAKE"       # 1. Getting student info
    PLANNING = "PLANNING"   # 2. Generating study schedule
    LEARNING = "LEARNING"   # 3. Explaining concepts
    QUIZZING = "QUIZZING"   # 4. Testing knowledge
    ANALYZING = "ANALYZING" # 5. Diagnosing errors
    COMPLETED = "COMPLETED" # 6. Session complete


class StudentContext(BaseModel):
    """Context object tracking student state across the workflow."""
    user_id: str
    session_id: str
    current_topic: Optional[str] = None
    last_quiz_score: Optional[int] = None
    misconceptions: List[str] = []
    plan_cache_key: Optional[str] = None
    extra_data: Dict[str, Any] = {}


class StateMachine:
    """
    Controls valid transitions between study phases.
    Prevents the AI from jumping ahead or getting lost.
    """
    
    # Valid transitions: (current_phase, action) -> next_phase
    TRANSITIONS = {
        (StudyPhase.INTAKE, "generate_plan"): StudyPhase.PLANNING,
        (StudyPhase.PLANNING, "start_topic"): StudyPhase.LEARNING,
        (StudyPhase.LEARNING, "take_quiz"): StudyPhase.QUIZZING,
        (StudyPhase.QUIZZING, "submit_answers"): StudyPhase.ANALYZING,
        (StudyPhase.ANALYZING, "next_topic"): StudyPhase.PLANNING,
        (StudyPhase.ANALYZING, "complete"): StudyPhase.COMPLETED,
    }

    def __init__(self, context: StudentContext):
        self.context = context
        # Initialize Supabase client
        supabase_url = os.getenv("SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY")
        if supabase_url and supabase_key:
            self.supabase: Optional[Client] = create_client(supabase_url, supabase_key)
        else:
            self.supabase = None
            print("⚠️ Warning: Supabase credentials missing. Persistence disabled.")

    def transition(self, current_phase: StudyPhase, action: str) -> StudyPhase:
        """
        Attempt to transition to a new phase based on the action.
        Returns the new phase, or the current phase if transition is invalid.
        """
        key = (current_phase, action)
        return self.TRANSITIONS.get(key, current_phase)

    def get_valid_actions(self, current_phase: StudyPhase) -> List[str]:
        """Return list of valid actions from the current phase."""
        return [
            action for (phase, action) in self.TRANSITIONS.keys()
            if phase == current_phase
        ]

    async def save_state(self, current_phase: StudyPhase) -> None:
        """Persist current state and context to Supabase."""
        if not self.supabase:
            return

        data = {
            "current_state": current_phase.value,
            "current_context": self.context.model_dump(),
            "updated_at": datetime.datetime.now(datetime.timezone.utc).isoformat()
        }

        try:
            self.supabase.table("study_sessions").update(data).eq("id", self.context.session_id).execute()
        except Exception as e:
            print(f"❌ Failed to save state to Supabase: {e}")

    async def load_state(self) -> Optional[StudyPhase]:
        """Rehydrate state and context from Supabase."""
        if not self.supabase:
            return None

        try:
            response = self.supabase.table("study_sessions").select("*").eq("id", self.context.session_id).single().execute()
            if response.data:
                state_str = response.data.get("current_state")
                stored_context = response.data.get("current_context")
                
                if stored_context:
                    self.context = StudentContext(**stored_context)
                
                return StudyPhase(state_str) if state_str else None
        except Exception as e:
            print(f"❌ Failed to load state from Supabase: {e}")
            return None

    async def log_action(self, action: str, metadata: Optional[Dict[str, Any]] = None) -> None:
        """Log an agent action to the session history (audit log)."""
        if not self.supabase:
            return

        log_entry = {
            "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "action": action,
            "metadata": metadata or {}
        }

        try:
            # We use Postgres array_append via RPC or raw string concatenation if needed,
            # but usually, we fetch, append, and update for simplicity in MVP.
            response = self.supabase.table("study_sessions").select("agent_history").eq("id", self.context.session_id).single().execute()
            history = response.data.get("agent_history") or []
            history.append(log_entry)
            
            self.supabase.table("study_sessions").update({"agent_history": history}).eq("id", self.context.session_id).execute()
        except Exception as e:
            print(f"❌ Failed to log action to Supabase: {e}")
