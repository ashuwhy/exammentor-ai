"use client";

import { useState } from "react";
import {
  CheckCircle,
  XCircle,
  ArrowRight,
  RotateCcw,
  Trophy,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

// Mock quiz data
const MOCK_QUIZ = {
  topic: "Photosynthesis",
  questions: [
    {
      id: "q1",
      text: "Where does the light-dependent reaction of photosynthesis occur?",
      options: [
        "A) Stroma",
        "B) Thylakoid membrane",
        "C) Mitochondria",
        "D) Cytoplasm",
      ],
      correct_option_index: 1,
      explanation:
        "The light-dependent reactions occur in the thylakoid membrane where chlorophyll absorbs light energy.",
      difficulty: "medium",
    },
    {
      id: "q2",
      text: "What is the primary product of the Calvin Cycle?",
      options: ["A) Oxygen", "B) ATP", "C) Glucose (G3P)", "D) Water"],
      correct_option_index: 2,
      explanation:
        "The Calvin Cycle produces glyceraldehyde-3-phosphate (G3P), which is used to synthesize glucose.",
      difficulty: "medium",
    },
    {
      id: "q3",
      text: "Which wavelengths of light are LEAST absorbed by chlorophyll?",
      options: ["A) Red", "B) Blue", "C) Green", "D) Violet"],
      correct_option_index: 2,
      explanation:
        "Chlorophyll reflects green light, which is why plants appear green. It absorbs red and blue light most efficiently.",
      difficulty: "easy",
    },
    {
      id: "q4",
      text: "What gas is released as a byproduct of the light reactions?",
      options: [
        "A) Carbon dioxide",
        "B) Nitrogen",
        "C) Oxygen",
        "D) Hydrogen",
      ],
      correct_option_index: 2,
      explanation:
        "Oxygen is released when water molecules are split during the light reactions (photolysis).",
      difficulty: "easy",
    },
    {
      id: "q5",
      text: 'Why is the Calvin Cycle called the "dark reaction"?',
      options: [
        "A) It only occurs at night",
        "B) It requires darkness",
        "C) It does not directly require light",
        "D) It produces dark pigments",
      ],
      correct_option_index: 2,
      explanation:
        "The Calvin Cycle is called 'dark reaction' because it doesn't directly require light - but it still happens during the day using ATP and NADPH from light reactions.",
      difficulty: "hard",
    },
  ],
};

export default function QuizPage() {
  const params = useParams();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [answers, setAnswers] = useState<(number | null)[]>(
    new Array(MOCK_QUIZ.questions.length).fill(null)
  );
  const [quizComplete, setQuizComplete] = useState(false);

  const currentQuestion = MOCK_QUIZ.questions[currentIndex];
  const isCorrect = selectedOption === currentQuestion.correct_option_index;

  const handleSelect = (optionIndex: number) => {
    if (showResult) return;
    setSelectedOption(optionIndex);
  };

  const handleSubmit = () => {
    if (selectedOption === null) return;
    setShowResult(true);
    const newAnswers = [...answers];
    newAnswers[currentIndex] = selectedOption;
    setAnswers(newAnswers);
  };

  const handleNext = () => {
    if (currentIndex < MOCK_QUIZ.questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedOption(null);
      setShowResult(false);
    } else {
      setQuizComplete(true);
    }
  };

  const handleRetry = () => {
    setCurrentIndex(0);
    setSelectedOption(null);
    setShowResult(false);
    setAnswers(new Array(MOCK_QUIZ.questions.length).fill(null));
    setQuizComplete(false);
  };

  const score = answers.filter(
    (a, i) => a === MOCK_QUIZ.questions[i].correct_option_index
  ).length;
  const percentage = Math.round((score / MOCK_QUIZ.questions.length) * 100);

  if (quizComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-6">
        <div className="max-w-lg w-full bg-slate-800/50 backdrop-blur-lg rounded-2xl p-8 border border-slate-700 text-center">
          <Trophy
            className={`w-20 h-20 mx-auto mb-6 ${
              percentage >= 80
                ? "text-yellow-400"
                : percentage >= 60
                ? "text-slate-300"
                : "text-amber-600"
            }`}
          />
          <h1 className="text-3xl font-bold text-white mb-2">Quiz Complete!</h1>
          <p className="text-slate-400 mb-6">{MOCK_QUIZ.topic}</p>

          <div className="text-6xl font-bold text-purple-400 mb-2">
            {percentage}%
          </div>
          <p className="text-slate-400 mb-8">
            {score} of {MOCK_QUIZ.questions.length} correct
          </p>

          <div className="flex gap-4">
            <button
              onClick={handleRetry}
              className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-all"
            >
              <RotateCcw className="w-5 h-5" />
              Retry
            </button>
            <Link
              href="/results"
              className="flex-1 bg-purple-500 hover:bg-purple-600 text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-all"
            >
              View Results
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-2xl mx-auto pt-8">
        {/* Progress */}
        <div className="flex items-center justify-between mb-8">
          <span className="text-slate-400">
            Question {currentIndex + 1} of {MOCK_QUIZ.questions.length}
          </span>
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              currentQuestion.difficulty === "easy"
                ? "bg-green-500/20 text-green-400"
                : currentQuestion.difficulty === "medium"
                ? "bg-yellow-500/20 text-yellow-400"
                : "bg-red-500/20 text-red-400"
            }`}
          >
            {currentQuestion.difficulty}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="h-2 bg-slate-700 rounded-full mb-8 overflow-hidden">
          <div
            className="h-full bg-purple-500 transition-all"
            style={{
              width: `${
                ((currentIndex + (showResult ? 1 : 0)) /
                  MOCK_QUIZ.questions.length) *
                100
              }%`,
            }}
          />
        </div>

        {/* Question Card */}
        <div className="bg-slate-800/50 backdrop-blur-lg rounded-2xl p-8 border border-slate-700 mb-6">
          <h2 className="text-xl font-bold text-white mb-6">
            {currentQuestion.text}
          </h2>

          <div className="space-y-3">
            {currentQuestion.options.map((option, i) => {
              let optionClass =
                "border-slate-600 hover:border-slate-500 bg-slate-700/50";

              if (showResult) {
                if (i === currentQuestion.correct_option_index) {
                  optionClass =
                    "border-green-500 bg-green-500/20 text-green-200";
                } else if (i === selectedOption && !isCorrect) {
                  optionClass = "border-red-500 bg-red-500/20 text-red-200";
                }
              } else if (selectedOption === i) {
                optionClass = "border-purple-500 bg-purple-500/20";
              }

              return (
                <button
                  key={i}
                  onClick={() => handleSelect(i)}
                  disabled={showResult}
                  className={`w-full p-4 rounded-xl border-2 text-left transition-all flex items-center justify-between ${optionClass}`}
                >
                  <span className="text-slate-200">{option}</span>
                  {showResult && i === currentQuestion.correct_option_index && (
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  )}
                  {showResult && i === selectedOption && !isCorrect && (
                    <XCircle className="w-5 h-5 text-red-400" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Explanation */}
        {showResult && (
          <div
            className={`rounded-xl p-5 mb-6 border ${
              isCorrect
                ? "bg-green-500/20 border-green-500/50"
                : "bg-amber-500/20 border-amber-500/50"
            } animate-in fade-in slide-in-from-bottom-2`}
          >
            <p
              className={`font-medium mb-2 ${
                isCorrect ? "text-green-200" : "text-amber-200"
              }`}
            >
              {isCorrect ? "✓ Correct!" : "✗ Not quite right"}
            </p>
            <p
              className={isCorrect ? "text-green-200/80" : "text-amber-200/80"}
            >
              {currentQuestion.explanation}
            </p>
          </div>
        )}

        {/* Action Button */}
        {!showResult ? (
          <button
            onClick={handleSubmit}
            disabled={selectedOption === null}
            className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
              selectedOption !== null
                ? "bg-purple-500 hover:bg-purple-600 text-white"
                : "bg-slate-700 text-slate-500 cursor-not-allowed"
            }`}
          >
            Submit Answer
          </button>
        ) : (
          <button
            onClick={handleNext}
            className="w-full py-4 rounded-xl font-bold text-lg bg-purple-500 hover:bg-purple-600 text-white flex items-center justify-center gap-2 transition-all"
          >
            {currentIndex < MOCK_QUIZ.questions.length - 1
              ? "Next Question"
              : "See Results"}
            <ArrowRight className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
}
