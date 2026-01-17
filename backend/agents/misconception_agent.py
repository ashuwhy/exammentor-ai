"""
Misconception Agent - Busts misconceptions with counter-examples and redemption questions.

Triggered when a student gets a quiz question wrong to provide deep conceptual remediation.
"""

import os
from google import genai
from pydantic import BaseModel, Field
from typing import List, Optional
from agents.quiz_agent import Question, DifficultyLevel, QuestionType

class MisconceptionAnalysis(BaseModel):
    """Schema for the Misconception Agent's output."""
    wrong_option_chosen: str
    inferred_confusion: str = Field(description="The underlying conceptual mistake inferred from the wrong choice")
    counter_example: str = Field(description="A specific example or logic that breaks the misconception")
    explanation: str = Field(description="Pedagogical explanation of why the logic was flawed")
    redemption_question: Question = Field(description="A fresh question to verify if the misconception is cleared")

async def analyze_and_bust_misconception(
    question: Question,
    wrong_answer_index: int,
    topic_context: str
) -> MisconceptionAnalysis:
    """
    Diagnose the reasoning for a wrong answer and provide a specific counter-example.
    """
    client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
    
    student_choice = question.options[wrong_answer_index]
    correct_choice = question.options[question.correct_option_index]
    
    prompt = f"""
You are a master teacher specializing in diagnosing student misconceptions.
A student answered this question incorrectly.

QUESTION: {question.text}
STUDENT CHOSE: {student_choice}
CORRECT ANSWER: {correct_choice}

CONTEXT:
{topic_context[:2000]}

TASK:
1. INFER: Why did the student pick this specific wrong option? What confusion does it reveal?
2. BUST: Provide a 'Counter-Example' that makes the student's logic fail in a clear way.
3. EXPLAIN: Briefly explain the correct concept.
4. REDEEM: Create a NEW redemption question (same difficulty) that specifically tests the same edge case.

Use the response schema for structured output.
"""

    response = await client.aio.models.generate_content(
        model=os.getenv("GEMINI_MODEL", "gemini-3-flash-preview"),
        contents=prompt,
        config={
            "response_mime_type": "application/json",
            "response_schema": MisconceptionAnalysis,
        }
    )

    return response.parsed
