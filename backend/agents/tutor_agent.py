"""
Tutor Agent - Streams explanations using Gemini 3 Deep Think for reasoning.

Uses the Feynman Technique for intuitive explanations.
"""

import os
from typing import AsyncGenerator
from google import genai
from pydantic import BaseModel, Field
from typing import List, Optional


# --- Structured Output for Complete Explanations ---

class ExplanationStep(BaseModel):
    step_number: int
    title: str
    content: str
    analogy: Optional[str] = Field(default=None, description="Optional analogy to make concept clearer")


class TutorExplanation(BaseModel):
    topic: str
    intuition: str = Field(description="Simple one-line intuition for the concept")
    steps: List[ExplanationStep]
    real_world_example: str
    common_pitfall: str = Field(description="Common mistake students make with this topic")
    practice_question: Optional[str] = Field(default=None, description="Quick check question")


class ImageHighlight(BaseModel):
    """Highlight metadata for visual grounding."""
    label: str = Field(description="Label for the highlight")
    region: str = Field(description="Region in the image (e.g., 'top-left', 'center')")
    description: str = Field(description="Contextual explanation of this specific part")


class MultimodalExplanation(BaseModel):
    """Output for the Multimodal Tutor."""
    topic: str
    intuition: str
    visual_references: List[ImageHighlight] = Field(description="Key parts of the image to highlight")
    explanation: str = Field(description="The main text explanation referencing the image")
    deep_dive: List[ExplanationStep]
    practice_question: str


# --- Streaming Explanation Generator ---

async def stream_explanation(
    topic: str,
    context: str,
    difficulty: str = "medium"
) -> AsyncGenerator[str, None]:
    """
    Stream an explanation character-by-character for live UI feedback.
    
    Args:
        topic: The topic to explain
        context: Relevant context from the syllabus/textbook
        difficulty: easy, medium, or hard - adjusts explanation depth
        
    Yields:
        str: Chunks of the explanation text
    """
    client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
    
    depth_instruction = {
        "easy": "Use simple language, many analogies, avoid jargon",
        "medium": "Balance depth with clarity, include some technical terms",
        "hard": "Be comprehensive, include edge cases and advanced concepts"
    }.get(difficulty, "Balance depth with clarity")
    
    prompt = f"""
You are an expert tutor using the Feynman Technique.
Explain "{topic}" to a student preparing for their exam.

CONTEXT FROM THEIR STUDY MATERIAL:
{context[:5000]}

EXPLANATION STYLE ({difficulty.upper()}):
{depth_instruction}

STRUCTURE YOUR RESPONSE:
1. **Intuition**: Start with a simple analogy or mental model
2. **Deep Explanation**: Break down the concept step-by-step, showing your reasoning
3. **Real Example**: Give a concrete real-world application
4. **Common Mistake**: Warn about a typical misconception
5. **Quick Check**: End with a simple question to test understanding

Use markdown formatting. Be encouraging but accurate.
"""

    # Enable streaming for live UI feedback
    # Enable streaming for live UI feedback
    response = await client.aio.models.generate_content_stream(
        model=os.getenv("GEMINI_MODEL", "gemini-2.5-pro-preview-05-06"),
        contents=prompt
    )
    async for chunk in response:
        if chunk.text:
            yield chunk.text


# --- Structured Explanation (Non-streaming, complete response) ---

async def generate_explanation(
    topic: str,
    context: str,
    difficulty: str = "medium"
) -> TutorExplanation:
    """
    Generate a complete structured explanation (non-streaming).
    
    Returns a validated Pydantic model with all explanation components.
    """
    client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
    
    prompt = f"""
You are an expert tutor using the Feynman Technique.
Explain "{topic}" comprehensively.

CONTEXT:
{context[:5000]}

Create a complete explanation with:
- A simple intuition
- Step-by-step breakdown with analogies
- Real-world example
- Common pitfall to avoid
- Practice question
"""

    response = await client.aio.models.generate_content(
        model=os.getenv("GEMINI_MODEL", "gemini-3-flash-preview"),
        contents=prompt,
        config={
            "response_mime_type": "application/json",
            "response_schema": TutorExplanation,
        }
    )
    
    return response.parsed


async def explain_image(
    topic: str,
    image_bytes: bytes,
    mime_type: str = "image/jpeg"
) -> MultimodalExplanation:
    """
    Explain a concept using a diagram/image with visual grounding.
    """
    client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

    prompt = f"""
You are an expert tutor specializing in visual learning.
Explain the concept "{topic}" based on this diagram/image.

INSTRUCTIONS:
1. Provide a high-level intuition.
2. Identify at least 3 key visual elements (highlights) and explain their significance.
3. Reference these elements in your step-by-step deep dive.
4. End with a practice question focused on the visual details.
"""

    response = await client.aio.models.generate_content(
        model=os.getenv("GEMINI_MODEL", "gemini-3-flash-preview"),
        contents=[
            prompt,
            genai.types.Part.from_bytes(data=image_bytes, mime_type=mime_type)
        ],
        config={
            "response_mime_type": "application/json",
            "response_schema": MultimodalExplanation,
        }
    )

    return response.parsed


# --- Test ---

if __name__ == "__main__":
    import asyncio
    from dotenv import load_dotenv
    
    load_dotenv()
    
    async def test_stream():
        print("🎓 Testing Tutor Agent (Streaming)...\n")
        
        context = """
        Photosynthesis is the process by which plants convert light energy
        into chemical energy. It occurs in chloroplasts and involves two
        main stages: the light-dependent reactions and the Calvin cycle.
        """
        
        async for chunk in stream_explanation(
            topic="Photosynthesis",
            context=context,
            difficulty="medium"
        ):
            print(chunk, end="", flush=True)
        
        print("\n\n✅ Streaming complete!")
    
    asyncio.run(test_stream())
