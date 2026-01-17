"""
Quiz Agent - Generates adaptive quizzes using Gemini 3 Structured Outputs.

Creates questions based on mastery level and identifies misconceptions.
"""

import os
from google import genai
from pydantic import BaseModel, Field
from typing import List, Optional
from enum import Enum


# --- Enums and Schemas ---

class DifficultyLevel(str, Enum):
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"


class QuestionType(str, Enum):
    MULTIPLE_CHOICE = "multiple_choice"
    TRUE_FALSE = "true_false"
    FILL_BLANK = "fill_blank"


class Question(BaseModel):
    id: str
    text: str
    question_type: QuestionType
    options: List[str] = Field(description="Answer choices (for MCQ)")
    correct_option_index: int = Field(description="Index of correct answer (0-based)")
    explanation: str = Field(description="Why this answer is correct")
    difficulty: DifficultyLevel
    concept_tested: str = Field(description="The specific concept this question tests")


class Quiz(BaseModel):
    topic: str
    questions: List[Question]
    time_estimate_minutes: int = Field(description="Estimated time to complete")


class AnswerEvaluation(BaseModel):
    is_correct: bool
    feedback: str = Field(description="Personalized feedback for this answer")
    misconception: Optional[str] = Field(default=None, description="Identified misconception if wrong")
    hint_for_similar: str = Field(description="Tip for similar questions")

# --- Quiz Generator ---

async def generate_quiz(
    topic: str,
    context: str,
    num_questions: int = 5,
    difficulty: DifficultyLevel = DifficultyLevel.MEDIUM,
    previous_mistakes: List[str] = None
) -> Quiz:
    """
    Generate an adaptive quiz focused on the topic.
    
    Args:
        topic: The topic to quiz on
        context: Relevant context from study material
        num_questions: Number of questions to generate
        difficulty: Target difficulty level
        previous_mistakes: List of past misconceptions to target
        
    Returns:
        Quiz: A validated quiz with questions
    """
    client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
    
    mistakes_instruction = ""
    if previous_mistakes:
        mistakes_instruction = f"""
The student has previously struggled with these concepts:
{', '.join(previous_mistakes)}

Include questions that specifically address these misconceptions.
"""
    
    prompt = f"""
You are an expert exam question writer for competitive exams.
Create a {num_questions}-question quiz on "{topic}".

CONTEXT FROM STUDY MATERIAL:
{context[:5000]}

DIFFICULTY: {difficulty.value}
{mistakes_instruction}

REQUIREMENTS:
1. Questions should test deep understanding, not just memorization
2. Include a mix of conceptual and application-based questions
3. Wrong options should be plausible (common mistakes)
4. Explanations should teach, not just state the answer
5. Each question should test a specific concept
"""

    response = await client.aio.models.generate_content(
        model=os.getenv("GEMINI_MODEL", "gemini-2.5-pro-preview-05-06"),
        contents=prompt,
        config={
            "response_mime_type": "application/json",
            "response_schema": Quiz,
        }
    )
    
    return response.parsed


# --- Multimodal Quiz Generator (Action Era Feature) ---

class ImageQuizQuestion(BaseModel):
    """A quiz question derived from diagram analysis."""
    id: str
    text: str
    visual_reference: str = Field(description="Reference to specific part of image, e.g. 'In the top-left section...'")
    question_type: QuestionType
    options: List[str]
    correct_option_index: int
    explanation: str
    difficulty: DifficultyLevel
    concept_tested: str


class ImageQuiz(BaseModel):
    """Quiz generated from diagram analysis."""
    topic: str
    image_description: str = Field(description="What the AI sees in the image")
    questions: List[ImageQuizQuestion]
    visual_elements_used: List[str] = Field(description="List of visual elements referenced in questions")
    time_estimate_minutes: int


async def generate_quiz_from_image(
    topic: str,
    image_bytes: bytes,
    mime_type: str = "image/jpeg",
    num_questions: int = 5,
    difficulty: DifficultyLevel = DifficultyLevel.MEDIUM
) -> ImageQuiz:
    """
    Generate quiz questions that specifically reference parts of the diagram.
    
    This is the key multimodal-central feature for the hackathon.
    Questions include visual references like "In the top-left section..."
    to demonstrate real multimodal reasoning, not just text extraction.
    
    Args:
        topic: The topic/subject of the diagram
        image_bytes: The image data
        mime_type: Image MIME type
        num_questions: Number of questions to generate
        difficulty: Target difficulty level
        
    Returns:
        ImageQuiz: Quiz with visually-grounded questions
    """
    client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
    
    prompt = f"""
You are an expert exam question writer with strong visual analysis skills.
Analyze this diagram about "{topic}" and create {num_questions} quiz questions.

CRITICAL REQUIREMENTS:
1. Each question MUST reference a SPECIFIC VISUAL ELEMENT in the image
2. Use spatial references like:
   - "In the top-left section of the diagram..."
   - "The arrow pointing from A to B indicates..."
   - "Looking at the labeled structure in the center..."
   - "The colored region marked in red shows..."
3. Questions should test understanding of WHAT IS SHOWN, not just text labels
4. Include questions about:
   - Relationships shown (arrows, connections, flows)
   - Labeled structures and their functions
   - Spatial arrangements and their significance
   - Cause-effect relationships depicted
5. Wrong options should be plausible misreadings of the diagram

DIFFICULTY: {difficulty.value}

Generate questions that PROVE multimodal reasoning is happening.
A text-only model could NOT answer these questions.
"""

    response = await client.aio.models.generate_content(
        model=os.getenv("GEMINI_MODEL", "gemini-3-flash-preview"),
        contents=[
            prompt,
            genai.types.Part.from_bytes(data=image_bytes, mime_type=mime_type)
        ],
        config={
            "response_mime_type": "application/json",
            "response_schema": ImageQuiz,
        }
    )
    
    return response.parsed


# --- Answer Evaluator ---

async def evaluate_answer(
    question: Question,
    student_answer_index: int,
    topic_context: str
) -> AnswerEvaluation:
    """
    Evaluate a student's answer and identify potential misconceptions.
    """
    client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
    
    is_correct = student_answer_index == question.correct_option_index
    student_answer = question.options[student_answer_index]
    correct_answer = question.options[question.correct_option_index]
    
    prompt = f"""
A student answered a question about "{question.concept_tested}".

QUESTION: {question.text}
STUDENT CHOSE: {student_answer}
CORRECT ANSWER: {correct_answer}
STUDENT WAS: {"CORRECT" if is_correct else "INCORRECT"}

CONTEXT:
{topic_context[:2000]}

Provide:
1. Personalized feedback (encouraging if correct, constructive if wrong)
2. If wrong, identify the specific misconception that led to this error
3. A tip for approaching similar questions in the future
"""

    response = await client.aio.models.generate_content(
        model=os.getenv("GEMINI_MODEL", "gemini-2.5-pro-preview-05-06"),
        contents=prompt,
        config={
            "response_mime_type": "application/json",
            "response_schema": AnswerEvaluation,
        }
    )
    
    return response.parsed


# --- Test ---

if __name__ == "__main__":
    import asyncio
    from dotenv import load_dotenv
    
    load_dotenv()
    
    async def test_quiz():
        print("📝 Testing Quiz Agent...\n")
        
        context = """
        The Calvin Cycle (light-independent reactions) occurs in the stroma.
        It uses ATP and NADPH from light reactions to fix CO2 into glucose.
        Key enzyme: RuBisCO. Three stages: Carbon fixation, Reduction, Regeneration.
        """
        
        quiz = await generate_quiz(
            topic="Calvin Cycle",
            context=context,
            num_questions=3,
            difficulty=DifficultyLevel.MEDIUM
        )
        
        print(f"✅ Generated quiz on: {quiz.topic}")
        print(f"   Time estimate: {quiz.time_estimate_minutes} minutes")
        print(f"   Questions: {len(quiz.questions)}")
        
        for q in quiz.questions:
            print(f"\n   Q: {q.text[:50]}...")
            print(f"   Concept: {q.concept_tested}")
            print(f"   Difficulty: {q.difficulty}")
    
    asyncio.run(test_quiz())
