"""
State Machine for ExamMentor AI Agent Workflow.

Ensures the AI follows a structured learning path:
INTAKE → PLANNING → LEARNING → QUIZZING → ANALYZING → COMPLETED
"""

from enum import Enum
from typing import Optional, List
from pydantic import BaseModel


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
