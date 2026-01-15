"use client";

import { useState, useEffect } from "react";
import {
  CheckCircle,
  XCircle,
  ArrowRight,
  RotateCcw,
  Trophy,
  Loader2,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { generateQuizAction, submitAnswerAction } from "@/app/actions";
import { QuizSkeleton } from "@/components/ui/Skeleton";

interface Question {
  id: string;
  text: string;
  options: string[];
  correct_option_index: number;
  explanation?: string;
  difficulty: string;
  concept_tested?: string;
}

interface Quiz {
  topic: string;
  questions: Question[];
}

export default function QuizPage() {
  const params = useParams();
  const topicId = params.topicId as string;
  const topicName = topicId?.replace(/-/g, " ") || "Topic";
  
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [evaluations, setEvaluations] = useState<Record<number, {
    explanation?: string;
    feedback?: string;
    is_correct?: boolean;
  }>>({});
  const [quizComplete, setQuizComplete] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Get context from localStorage
  const getContext = () => {
    const plan = localStorage.getItem("studyPlan");
    const examType = localStorage.getItem("examType") || "NEET";
    return plan ? `Exam: ${examType}. Study plan context available.` : `Exam: ${examType}`;
  };

  // Load quiz on mount
  useEffect(() => {
    const loadQuiz = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const quizData = await generateQuizAction(
          topicName,
          getContext(),
          5, // numQuestions
          "medium"
        );

        if (!quizData || !quizData.questions) {
          throw new Error("Failed to generate quiz");
        }

        setQuiz(quizData);
        setAnswers(new Array(quizData.questions.length).fill(null));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load quiz");
      } finally {
        setLoading(false);
      }
    };

    loadQuiz();
  }, [topicName]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <QuizSkeleton />
      </div>
    );
  }

  if (error || !quiz) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-md w-full card-elevated p-8 text-center">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">Quiz Error</h2>
          <p className="text-muted-foreground mb-6">
            {error || "Failed to load quiz"}
          </p>
          <Link
            href={`/learn/${topicId}`}
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3 rounded-lg font-semibold inline-flex items-center gap-2 transition-all"
          >
            Back to Learning
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </div>
    );
  }

  const currentQuestion = quiz.questions[currentIndex];
  const isCorrect = selectedOption === currentQuestion.correct_option_index;
  const evaluation = evaluations[currentIndex];

  const handleSelect = (optionIndex: number) => {
    if (showResult) return;
    setSelectedOption(optionIndex);
  };

  const handleSubmit = async () => {
    if (selectedOption === null || submitting) return;
    
    setSubmitting(true);
    
    try {
      // Submit answer for evaluation
      const evaluation = await submitAnswerAction(
        currentQuestion.id,
        currentQuestion.text,
        currentQuestion.options,
        currentQuestion.correct_option_index,
        selectedOption,
        currentQuestion.concept_tested || topicName,
        getContext()
      );

      if (evaluation) {
        setEvaluations((prev) => ({ ...prev, [currentIndex]: evaluation }));
      }

      // Update answers
      const newAnswers = [...answers];
      newAnswers[currentIndex] = selectedOption;
      setAnswers(newAnswers);
      setShowResult(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to evaluate answer");
      // Still show result even if evaluation fails
      const newAnswers = [...answers];
      newAnswers[currentIndex] = selectedOption;
      setAnswers(newAnswers);
      setShowResult(true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleNext = () => {
    if (!quiz) return;
    if (currentIndex < quiz.questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedOption(null);
      setShowResult(false);
    } else {
      setQuizComplete(true);
      // Store answers for results page
      const answersData = answers.map((a, i) => ({
        question_id: quiz.questions[i].id,
        question_text: quiz.questions[i].text,
        concept_tested: quiz.questions[i].concept_tested || quiz.topic,
        student_answer: quiz.questions[i].options[a || 0],
        correct_answer: quiz.questions[i].options[quiz.questions[i].correct_option_index],
        is_correct: a === quiz.questions[i].correct_option_index,
      }));
      localStorage.setItem("lastQuizAnswers", JSON.stringify(answersData));
    }
  };

  const handleRetry = () => {
    if (!quiz) return;
    setCurrentIndex(0);
    setSelectedOption(null);
    setShowResult(false);
    setAnswers(new Array(quiz.questions.length).fill(null));
    setEvaluations({});
    setQuizComplete(false);
  };

  const score = answers.filter(
    (a, i) => a === quiz.questions[i].correct_option_index
  ).length;
  const percentage = Math.round((score / quiz.questions.length) * 100);

  if (quizComplete) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-lg w-full card-elevated p-8 text-center animate-scale-in">
          <Trophy
            className={`w-20 h-20 mx-auto mb-6 ${
              percentage >= 80
                ? "text-chart-3"
                : percentage >= 60
                ? "text-muted-foreground"
                : "text-chart-3"
            }`}
          />
          <h1 className="text-3xl font-semibold text-foreground mb-2">Quiz Complete!</h1>
          <p className="text-muted-foreground mb-6">{quiz.topic}</p>

          <div className="text-6xl font-bold text-primary mb-2">
            {percentage}%
          </div>
          <p className="text-muted-foreground mb-8">
            {score} of {quiz.questions.length} correct
          </p>

          <div className="flex gap-4">
            <button
              onClick={handleRetry}
              className="flex-1 bg-secondary hover:bg-secondary/80 text-secondary-foreground py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-all"
            >
              <RotateCcw className="w-5 h-5" />
              Retry
            </button>
            <Link
              href={{
                pathname: "/results",
                query: { 
                  topic: quiz.topic,
                  score: score,
                  total: quiz.questions.length,
                  answers: JSON.stringify(answers.map((a, i) => ({
                    question_id: quiz.questions[i].id,
                    question_text: quiz.questions[i].text,
                    concept_tested: quiz.questions[i].concept_tested || quiz.topic,
                    student_answer: quiz.questions[i].options[a || 0],
                    correct_answer: quiz.questions[i].options[quiz.questions[i].correct_option_index],
                    is_correct: a === quiz.questions[i].correct_option_index,
                  })))
                }
              }}
              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-all"
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
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto pt-8 animate-fade-in">
        {/* Progress */}
        <div className="flex items-center justify-between mb-8">
          <span className="text-muted-foreground">
            Question {currentIndex + 1} of {quiz.questions.length}
          </span>
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              currentQuestion.difficulty === "easy"
                ? "bg-chart-2/20 text-chart-2"
                : currentQuestion.difficulty === "medium"
                ? "bg-chart-3/20 text-chart-3"
                : "bg-destructive/20 text-destructive"
            }`}
          >
            {currentQuestion.difficulty}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="h-2 bg-muted rounded-full mb-8 overflow-hidden">
          <div
            className="h-full bg-primary transition-all"
            style={{
              width: `${
                ((currentIndex + (showResult ? 1 : 0)) /
                  quiz.questions.length) *
                100
              }%`,
            }}
          />
        </div>

        {/* Question Card */}
        <div className="card-elevated p-8 mb-6">
          <h2 className="text-xl font-semibold text-foreground mb-6">
            {currentQuestion.text}
          </h2>

          <div className="space-y-3">
            {currentQuestion.options.map((option, i) => {
              let optionClass =
                "border-border hover:border-primary/50 bg-background";

              if (showResult) {
                if (i === currentQuestion.correct_option_index) {
                  optionClass = "border-chart-2 bg-chart-2/10 text-chart-2";
                } else if (i === selectedOption && !isCorrect) {
                  optionClass = "border-destructive bg-destructive/10 text-destructive";
                }
              } else if (selectedOption === i) {
                optionClass = "border-primary bg-accent";
              }

              return (
                <button
                  key={i}
                  onClick={() => handleSelect(i)}
                  disabled={showResult}
                  className={`w-full p-4 rounded-lg border-2 text-left transition-all flex items-center justify-between ${optionClass}`}
                >
                  <span className="text-foreground">{option}</span>
                  {showResult && i === currentQuestion.correct_option_index && (
                    <CheckCircle className="w-5 h-5 text-chart-2" />
                  )}
                  {showResult && i === selectedOption && !isCorrect && (
                    <XCircle className="w-5 h-5 text-destructive" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Explanation */}
        {showResult && (
          <div
            className={`card-soft p-5 mb-6 animate-slide-up ${
              isCorrect
                ? "bg-chart-2/10 border-chart-2/30"
                : "bg-chart-3/10 border-chart-3/30"
            }`}
          >
            <p
              className={`font-medium mb-2 ${
                isCorrect ? "text-chart-2" : "text-chart-3"
              }`}
            >
              {isCorrect ? "✓ Correct!" : "✗ Not quite right"}
            </p>
            <p className="text-foreground/80">
              {evaluation?.explanation || currentQuestion.explanation || "Review this concept carefully."}
            </p>
            {evaluation?.feedback && (
              <p className="text-primary text-sm mt-2">💡 {evaluation.feedback}</p>
            )}
          </div>
        )}

        {/* Action Button */}
        {!showResult ? (
          <button
            onClick={handleSubmit}
            disabled={selectedOption === null || submitting}
            className={`w-full py-4 rounded-lg font-semibold text-lg transition-all flex items-center justify-center gap-2 ${
              selectedOption !== null && !submitting
                ? "bg-primary hover:bg-primary/90 text-primary-foreground shadow-soft-md active:scale-[0.98]"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            }`}
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Evaluating...
              </>
            ) : (
              "Submit Answer"
            )}
          </button>
        ) : (
          <button
            onClick={handleNext}
            className="w-full py-4 rounded-lg font-semibold text-lg bg-primary hover:bg-primary/90 text-primary-foreground flex items-center justify-center gap-2 transition-all shadow-soft-md active:scale-[0.98]"
          >
            {currentIndex < quiz.questions.length - 1
              ? "Next Question"
              : "See Results"}
            <ArrowRight className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
}
