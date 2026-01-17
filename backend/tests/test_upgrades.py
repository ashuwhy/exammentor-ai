import asyncio
import os
import base64
from dotenv import load_dotenv
from agents.plan_agent import generate_verified_plan
from agents.tutor_agent import explain_image
from agents.misconception_agent import analyze_and_bust_misconception
from agents.quiz_agent import Question, QuestionType, DifficultyLevel

load_dotenv()

async def test_verified_plan():
    print("\n--- Testing Verified Plan Loop ---")
    syllabus = "Topic 1: Mitosis. Topic 2: Meiosis. Topic 3: DNA Replication."
    plan = await generate_verified_plan(
        syllabus_text=syllabus,
        exam_type="Biology",
        goal="Master cell division",
        days=3
    )
    print(f"✅ Verified Plan generated for: {plan.exam_name}")
    print(f"   Schedule length: {len(plan.schedule)} days")

async def test_misconception_agent():
    print("\n--- Testing Misconception Agent ---")
    question = Question(
        id="q1",
        text="Which process results in four haploid daughter cells?",
        question_type=QuestionType.MULTIPLE_CHOICE,
        options=["Mitosis", "Meiosis", "Binary Fission", "Budding"],
        correct_option_index=1,
        explanation="Meiosis is two rounds of division resulting in four cells.",
        difficulty=DifficultyLevel.MEDIUM,
        concept_tested="Meiosis vs Mitosis"
    )
    
    # Simulate student picking "Mitosis" (Index 0)
    analysis = await analyze_and_bust_misconception(
        question=question,
        wrong_answer_index=0,
        topic_context="Mitosis produces 2 diploid cells. Meiosis produces 4 haploid cells."
    )
    
    print(f"✅ Misconception diagnosed: {analysis.inferred_confusion}")
    print(f"   Counter-example: {analysis.counter_example}")
    print(f"   Redemption Q: {analysis.redemption_question.text}")

async def main():
    print("🚀 Starting Upgrade Verification Test Suite...")
    tasks = [
        test_verified_plan(),
        test_misconception_agent()
    ]
    await asyncio.gather(*tasks)
    print("\n🏁 All tests completed!")

if __name__ == "__main__":
    asyncio.run(main())
