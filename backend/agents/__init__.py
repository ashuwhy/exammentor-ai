"""
ExamMentor AI - Agents Package

Exports all agent functions and schemas for easy import.
"""

# State Machine
from .state_machine import (
    StudyPhase,
    StudentContext,
    StateMachine,
)

# Common Schemas
from .schemas import (
    StudyDay,
    PlanOutput,
    ExplanationStep,
    TutorOutput,
    Question,
    QuizOutput,
    Evaluation,
    get_gemini_config,
)

# Plan Agent
from .plan_agent import (
    Topic,
    DailyPlan,
    StudyPlan,
    generate_study_plan,
    generate_study_plan_sync,
)

# Tutor Agent
from .tutor_agent import (
    TutorExplanation,
    stream_explanation,
    generate_explanation,
)

# Quiz Agent
from .quiz_agent import (
    DifficultyLevel,
    QuestionType,
    Question as QuizQuestion,
    Quiz,
    AnswerEvaluation,
    generate_quiz,
    evaluate_answer,
)

# Evaluator Agent
from .evaluator_agent import (
    TopicMastery,
    Misconception,
    StudyRecommendation,
    PerformanceAnalysis,
    QuizAnswer,
    analyze_performance,
    generate_progress_report,
)

__all__ = [
    # State Machine
    "StudyPhase",
    "StudentContext", 
    "StateMachine",
    # Plan Agent
    "Topic",
    "DailyPlan",
    "StudyPlan",
    "generate_study_plan",
    "generate_study_plan_sync",
    # Tutor Agent
    "TutorExplanation",
    "stream_explanation",
    "generate_explanation",
    # Quiz Agent
    "DifficultyLevel",
    "QuestionType",
    "QuizQuestion",
    "Quiz",
    "AnswerEvaluation",
    "generate_quiz",
    "evaluate_answer",
    # Evaluator Agent
    "TopicMastery",
    "Misconception",
    "StudyRecommendation",
    "PerformanceAnalysis",
    "QuizAnswer",
    "analyze_performance",
    "generate_progress_report",
]
