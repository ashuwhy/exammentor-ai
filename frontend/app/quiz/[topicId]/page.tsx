"use client";

import { useState, useEffect } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  CheckmarkCircle02Icon,
  XCircle,
  ArrowRight,
  RotateCcw,
  Trophy,
  Loading03Icon,
  AlertCircle,
} from "@hugeicons/core-free-icons";
import Link from "next/link";
import { useParams } from "next/navigation";
import { generateQuizAction, submitAnswerAction, bustMisconceptionAction } from "@/app/actions";
import { QuizSkeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/Card";

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
  const [misconception, setMisconception] = useState<{
    topic: string;
    underlying_confusion: string;
    counter_example: string;
    redemption_question: {
      text: string;
      options: string[];
      correct_option_index: number;
      explanation: string;
    };
  } | null>(null);
  const [loadingMisconception, setLoadingMisconception] = useState(false);
  const [showMisconception, setShowMisconception] = useState(false);

  const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

  // Get context from localStorage
  const getContext = () => {
    if (typeof window === 'undefined') return "NEET";
    const plan = localStorage.getItem("studyPlan");
    const examType = localStorage.getItem("examType") || "NEET";
    return plan ? `Exam: ${examType}. Study plan context available.` : `Exam: ${examType}`;
  };

  const saveQuizToDb = async (uid: string, questions: any[]) => {
      try {
          await fetch(`${API_BASE}/api/quiz/persistence`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                  user_id: uid,
                  topic_id: topicId,
                  questions: questions
              })
          });
      } catch (e) {
          console.error("Failed to save quiz", e);
      }
  };

  // Load quiz on mount
  useEffect(() => {
    const loadQuiz = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const userId = localStorage.getItem("app-user-id");
        let existingQuiz: Quiz | null = null;

        // Try to fetch existing quiz if user is logged in
        if (userId) {
            try {
                const res = await fetch(`${API_BASE}/api/quiz/persistence?user_id=${userId}&topic_id=${topicId}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data && data.questions) {
                        existingQuiz = { topic: topicName, questions: data.questions };
                    }
                }
            } catch (e) {
                console.error("Failed to fetch existing quiz", e);
            }
        }
        
        if (existingQuiz) {
            setQuiz(existingQuiz);
            setAnswers(new Array(existingQuiz.questions.length).fill(null));
        } else {
            // Generate new quiz
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
            
            // Save newly generated quiz if user exists
            if (userId) {
                saveQuizToDb(userId, quizData.questions);
            }
        }

      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load quiz");
      } finally {
        setLoading(false);
      }
    };

    loadQuiz();
  }, [topicName, topicId]);

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
        <Card variant="elevated" className="max-w-md w-full p-8 text-center">
          <HugeiconsIcon icon={AlertCircle} size={48} color="currentColor" strokeWidth={1.5} className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">Quiz Error</h2>
          <p className="text-muted-foreground mb-6">
            {error || "Failed to load quiz"}
          </p>
          <Link
            href={`/learn/${topicId}`}
            className="bg-primary text-primary-foreground px-6 py-3 rounded-lg font-semibold inline-flex items-center gap-2 transition-premium"
          >
            Back to Learning
            <HugeiconsIcon icon={ArrowRight} size={20} color="currentColor" strokeWidth={1.5} className="w-5 h-5" />
          </Link>
        </Card>
      </div>
    );
  }

  const currentQuestion = quiz.questions[currentIndex];
  // Safety check
  if (!currentQuestion) return null;

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

  const handleMisconceptionCheck = async () => {
    if (isCorrect || loadingMisconception || !quiz) return;
    
    setLoadingMisconception(true);
    try {
      const result = await bustMisconceptionAction({
        question_id: currentQuestion.id,
        question_text: currentQuestion.text,
        options: currentQuestion.options,
        correct_option_index: currentQuestion.correct_option_index,
        student_answer_index: selectedOption || 0,
        concept_tested: currentQuestion.concept_tested || topicName,
        topic_context: getContext(),
        session_id: "demo-session"
      });
      if (result) {
        setMisconception(result);
        setShowMisconception(true);
      }
    } catch (err) {
      console.error("Failed to get misconception analysis:", err);
    } finally {
      setLoadingMisconception(false);
    }
  };

  const handleNext = () => {
    if (!quiz) return;
    if (currentIndex < quiz.questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedOption(null);
      setShowResult(false);
      setMisconception(null);
      setShowMisconception(false);
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
    (a, i) => quiz.questions[i] && a === quiz.questions[i].correct_option_index
  ).length;
  const percentage = Math.round((score / quiz.questions.length) * 100);

  if (quizComplete) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card variant="elevated" className="max-w-lg w-full p-8 text-center animate-scale-in">
          <HugeiconsIcon
            icon={Trophy}
            size={80}
            color="currentColor"
            strokeWidth={1.5}
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
            <Button
              onClick={handleRetry}
              variant="secondary"
              className="flex-1"
            >
              <HugeiconsIcon icon={RotateCcw} size={20} color="currentColor" strokeWidth={1.5} className="w-5 h-5" />
              Retry
            </Button>
            <Button
              asChild
              variant="premium"
              className="flex-1"
            >
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
              >
                View Results
                <HugeiconsIcon icon={ArrowRight} size={20} color="currentColor" strokeWidth={1.5} className="w-5 h-5" />
              </Link>
            </Button>
          </div>
        </Card>
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
            className={`px-3 py-1 rounded-lg text-sm font-medium backdrop-blur-lg ${
              currentQuestion.difficulty === "easy"
                ? "bg-chart-2/30 text-chart-2"
                : currentQuestion.difficulty === "medium"
                ? "bg-chart-3/30 text-chart-3"
                : "bg-destructive/30 text-destructive"
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
        <Card variant="elevated" className="p-8 mb-6">
          <h2 className="text-xl font-semibold text-foreground mb-6">
            {currentQuestion.text}
          </h2>

          <div className="space-y-3">
            {currentQuestion.options.map((option, i) => {
              let optionClass =
                "border-border bg-background/95 backdrop-blur-lg";

              if (showResult) {
                if (i === currentQuestion.correct_option_index) {
                  optionClass = "border-chart-2 bg-chart-2/10 text-chart-2 backdrop-blur-lg";
                } else if (i === selectedOption && !isCorrect) {
                  optionClass = "border-destructive bg-destructive/10 text-destructive backdrop-blur-lg";
                }
              } else if (selectedOption === i) {
                optionClass = "border-primary bg-accent/95 backdrop-blur-lg";
              }

              return (
                <Button
                  key={i}
                  variant="outline"
                  onClick={() => handleSelect(i)}
                  disabled={showResult}
                  className={`w-full h-auto p-4 flex items-center justify-between text-left whitespace-normal ${optionClass}`}
                >
                  <span className="text-foreground">{option}</span>
                  {showResult && i === currentQuestion.correct_option_index && (
                    <HugeiconsIcon icon={CheckmarkCircle02Icon} size={20} color="currentColor" strokeWidth={1.5} className="w-5 h-5 text-chart-2" />
                  )}
                  {showResult && i === selectedOption && !isCorrect && (
                    <HugeiconsIcon icon={XCircle} size={20} color="currentColor" strokeWidth={1.5} className="w-5 h-5 text-destructive" />
                  )}
                </Button>
              );
            })}
          </div>
        </Card>

        {/* Explanation */}
        {showResult && (
          <Card
            variant="soft"
            className={`p-5 mb-6 animate-slide-up ${
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
            {!isCorrect && !misconception && (
              <Button
                variant="outline"
                size="sm"
                className="mt-4 border-chart-3 text-chart-3"
                onClick={handleMisconceptionCheck}
                disabled={loadingMisconception}
              >
                {loadingMisconception ? (
                  <>
                    <HugeiconsIcon icon={Loading03Icon} size={16} color="currentColor" strokeWidth={1.5} className="w-4 h-4 animate-spin" />
                    Analyzing confusion...
                  </>
                ) : (
                  "Why did I get this wrong? (Vibe Check)"
                )}
              </Button>
            )}

            {showMisconception && misconception && (
              <div className="mt-6 border-t border-border pt-4 animate-fade-in">
                <div className="bg-chart-3/20 p-4 rounded-lg mb-4 backdrop-blur-lg">
                  <h4 className="font-bold text-chart-3 mb-2">The Underlying Confusion</h4>
                  <p className="text-foreground/90 italic mb-2">&quot;{misconception.underlying_confusion}&quot;</p>
                  <p className="text-sm font-medium">Think about it this way: {misconception.counter_example}</p>
                </div>
                
                <div className="bg-primary/5 border border-primary/20 p-4 rounded-lg backdrop-blur-lg">
                  <h4 className="font-bold text-primary mb-2">Redemption Question</h4>
                  <p className="text-foreground mb-4">{misconception.redemption_question.text}</p>
                  <div className="space-y-2">
                    {misconception.redemption_question.options.map((opt, i) => (
                      <div key={i} className="p-3 border border-border rounded-lg bg-background/95 text-sm transition-premium backdrop-blur-lg">
                        {opt}
                      </div>
                    ))}
                  </div>
                  <p className="mt-4 text-xs text-muted-foreground italic">
                    Hint: {misconception.redemption_question.explanation}
                  </p>
                </div>
              </div>
            )}
          </Card>
        )}

        {/* Action Button */}
        {!showResult ? (
          <Button
            onClick={handleSubmit}
            disabled={selectedOption === null || submitting}
            variant={selectedOption !== null && !submitting ? "premium" : "secondary"}
            size="xl"
            className="w-full"
          >
            {submitting ? (
              <>
                <HugeiconsIcon icon={Loading03Icon} size={20} color="currentColor" strokeWidth={1.5} className="w-5 h-5 animate-spin" />
                Evaluating...
              </>
            ) : (
              "Submit Answer"
            )}
          </Button>
        ) : (
          <Button
            onClick={handleNext}
            variant="premium"
            size="xl"
            className="w-full"
          >
            {currentIndex < quiz.questions.length - 1
              ? "Next Question"
              : "See Results"}
            <HugeiconsIcon icon={ArrowRight} size={20} color="currentColor" strokeWidth={1.5} className="w-5 h-5" />
          </Button>
        )}
      </div>
    </div>
  );
}
