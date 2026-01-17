"use client";

import { useState, useRef } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Upload01,
  Camera01,
  Brain01,
  Loader01,
  CheckmarkCircle02,
  XCircle01,
  ArrowRight01,
  Eye01,
  Sparkles,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/Card";

interface ImageQuizQuestion {
  id: string;
  text: string;
  visual_reference: string;
  options: string[];
  correct_option_index: number;
  explanation: string;
  difficulty: string;
  concept_tested: string;
}

interface ImageQuizData {
  topic: string;
  image_description: string;
  visual_elements_used: string[];
  time_estimate_minutes: number;
  questions: ImageQuizQuestion[];
}

interface ImageQuizProps {
  topic: string;
  onQuizComplete?: (results: { score: number; total: number }) => void;
}

export function ImageQuiz({ topic, onQuizComplete }: ImageQuizProps) {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>("image/jpeg");
  const [loading, setLoading] = useState(false);
  const [quiz, setQuiz] = useState<ImageQuizData | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [quizComplete, setQuizComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }

    setMimeType(file.type);

    // Create preview
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setImagePreview(result);
      // Extract base64 data (remove data URI prefix)
      const base64 = result.split(",")[1];
      setImageBase64(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleGenerateQuiz = async () => {
    if (!imageBase64) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/api/quiz/generate-from-image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          image_base64: imageBase64,
          mime_type: mimeType,
          num_questions: 5,
          difficulty: "medium",
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to generate quiz from image");
      }

      const data = await res.json();
      setQuiz(data);
      setAnswers(new Array(data.questions.length).fill(null));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to analyze image");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitAnswer = () => {
    if (selectedOption === null) return;

    const newAnswers = [...answers];
    newAnswers[currentIndex] = selectedOption;
    setAnswers(newAnswers);
    setShowResult(true);
  };

  const handleNext = () => {
    if (!quiz) return;
    
    if (currentIndex < quiz.questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedOption(null);
      setShowResult(false);
    } else {
      setQuizComplete(true);
      const score = answers.filter(
        (a, i) => a === quiz.questions[i].correct_option_index
      ).length;
      onQuizComplete?.({ score, total: quiz.questions.length });
    }
  };

  // Upload state
  if (!quiz) {
    return (
      <Card variant="elevated" className="p-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <HugeiconsIcon icon={Camera01} size={32} color="currentColor" strokeWidth={1.5} className="w-8 h-8 text-primary" />
          </div>

          <h3 className="text-xl font-semibold text-foreground mb-2 flex items-center justify-center gap-2">
            <HugeiconsIcon icon={Camera01} size={20} color="currentColor" strokeWidth={1.5} className="w-5 h-5" />
            Diagram Quiz
          </h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Upload a diagram and the AI will generate quiz questions that
            reference specific visual elements
          </p>

          {/* Image preview */}
          {imagePreview ? (
            <div className="mb-6">
              <div className="relative inline-block">
                <img
                  src={imagePreview}
                  alt="Diagram preview"
                  className="max-h-64 rounded-lg border border-border"
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={() => {
                    setImagePreview(null);
                    setImageBase64(null);
                  }}
                >
                  Change
                </Button>
              </div>
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-border rounded-lg p-8 mb-6 cursor-pointer transition-premium"
            >
              <HugeiconsIcon icon={Upload01} size={32} color="currentColor" strokeWidth={1.5} className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">
                Click to upload a diagram
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                PNG, JPG, or WEBP
              </p>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          {error && (
            <div className="bg-destructive/10 border border-destructive/30 p-3 rounded-lg mb-4 backdrop-blur-lg">
              <p className="text-destructive text-sm">{error}</p>
            </div>
          )}

          <Button
            onClick={handleGenerateQuiz}
            disabled={!imageBase64 || loading}
            variant="premium"
            size="lg"
            className="w-full md:w-auto"
          >
            {loading ? (
              <>
                <HugeiconsIcon icon={Loader01} size={20} color="currentColor" strokeWidth={1.5} className="w-5 h-5 animate-spin" />
                Analyzing diagram...
              </>
            ) : (
              <>
                <HugeiconsIcon icon={Sparkles} size={20} color="currentColor" strokeWidth={1.5} className="w-5 h-5" />
                Generate Quiz from Diagram
              </>
            )}
          </Button>

          <p className="text-xs text-muted-foreground mt-4">
            Questions will reference specific visual elements like &quot;In the
            top-left section...&quot;
          </p>
        </div>
      </Card>
    );
  }

  // Quiz complete
  if (quizComplete) {
    const score = answers.filter(
      (a, i) => a === quiz.questions[i].correct_option_index
    ).length;
    const percentage = Math.round((score / quiz.questions.length) * 100);

    return (
      <Card variant="elevated" className="p-8 text-center">
        <HugeiconsIcon icon={CheckmarkCircle02} size={64} color="currentColor" strokeWidth={1.5} className="w-16 h-16 text-chart-2 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-foreground mb-2">
          Diagram Quiz Complete!
        </h2>
        <p className="text-4xl font-bold text-primary mb-4">{percentage}%</p>
        <p className="text-muted-foreground mb-6">
          {score} of {quiz.questions.length} correct
        </p>
        <Button
          onClick={() => {
            setQuiz(null);
            setImagePreview(null);
            setImageBase64(null);
            setCurrentIndex(0);
            setAnswers([]);
            setQuizComplete(false);
          }}
          variant="outline"
        >
          Try Another Diagram
        </Button>
      </Card>
    );
  }

  // Quiz in progress
  const currentQuestion = quiz.questions[currentIndex];
  const isCorrect = selectedOption === currentQuestion.correct_option_index;

  return (
    <div className="space-y-6">
      {/* Image reference */}
      <Card variant="soft" className="p-4">
        <div className="flex items-start gap-4">
          <img
            src={imagePreview!}
            alt="Diagram"
            className="w-32 h-32 object-cover rounded-lg border border-border"
          />
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <HugeiconsIcon icon={Eye01} size={16} color="currentColor" strokeWidth={1.5} className="w-4 h-4" />
              AI Image Analysis
            </div>
            <p className="text-foreground text-sm">{quiz.image_description}</p>
            <div className="flex flex-wrap gap-1 mt-2">
              {quiz.visual_elements_used.map((el, i) => (
                <span
                  key={i}
                  className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full"
                >
                  {el}
                </span>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Progress */}
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground">
          Question {currentIndex + 1} of {quiz.questions.length}
        </span>
        <span className="text-xs bg-chart-3/20 text-chart-3 px-2 py-1 rounded-full">
          Visual Reasoning
        </span>
      </div>

      {/* Question */}
      <Card variant="elevated" className="p-6">
        {/* Visual reference callout */}
        <div className="bg-primary/5 border border-primary/20 p-3 rounded-lg mb-4 backdrop-blur-lg">
          <p className="text-sm text-primary flex items-center gap-2">
            <HugeiconsIcon icon={Eye01} size={16} color="currentColor" strokeWidth={1.5} className="w-4 h-4" />
            {currentQuestion.visual_reference}
          </p>
        </div>

        <h3 className="text-lg font-semibold text-foreground mb-4">
          {currentQuestion.text}
        </h3>

        <div className="space-y-2">
          {currentQuestion.options.map((option, i) => {
            let optionClass = "border-border";

            if (showResult) {
              if (i === currentQuestion.correct_option_index) {
                optionClass = "border-chart-2 bg-chart-2/10";
              } else if (i === selectedOption && !isCorrect) {
                optionClass = "border-destructive bg-destructive/10";
              }
            } else if (selectedOption === i) {
              optionClass = "border-primary bg-accent";
            }

            return (
              <Button
                key={i}
                variant="outline"
                onClick={() => !showResult && setSelectedOption(i)}
                disabled={showResult}
                className={`w-full h-auto p-4 justify-between text-left whitespace-normal ${optionClass}`}
              >
                <span className="text-foreground">{option}</span>
                {showResult && i === currentQuestion.correct_option_index && (
                  <HugeiconsIcon icon={CheckmarkCircle02} size={20} color="currentColor" strokeWidth={1.5} className="w-5 h-5 text-chart-2 flex-shrink-0" />
                )}
                {showResult && i === selectedOption && !isCorrect && (
                  <HugeiconsIcon icon={XCircle01} size={20} color="currentColor" strokeWidth={1.5} className="w-5 h-5 text-destructive flex-shrink-0" />
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
          className={`p-4 animate-fade-in ${
            isCorrect ? "bg-chart-2/10 border-chart-2/30" : "bg-chart-3/10 border-chart-3/30"
          }`}
        >
          <p className={`font-medium mb-1 flex items-center gap-1 ${isCorrect ? "text-chart-2" : "text-chart-3"}`}>
            {isCorrect ? <HugeiconsIcon icon={CheckmarkCircle02} size={16} color="currentColor" strokeWidth={1.5} className="w-4 h-4" /> : <HugeiconsIcon icon={XCircle01} size={16} color="currentColor" strokeWidth={1.5} className="w-4 h-4" />}
            {isCorrect ? "Correct!" : "Not quite"}
          </p>
          <p className="text-foreground/80 text-sm">
            {currentQuestion.explanation}
          </p>
        </Card>
      )}

      {/* Actions */}
      {!showResult ? (
        <Button
          onClick={handleSubmitAnswer}
          disabled={selectedOption === null}
          variant="premium"
          size="lg"
          className="w-full"
        >
          Submit Answer
        </Button>
      ) : (
        <Button
          onClick={handleNext}
          variant="premium"
          size="lg"
          className="w-full"
        >
          {currentIndex < quiz.questions.length - 1 ? "Next Question" : "See Results"}
          <HugeiconsIcon icon={ArrowRight01} size={20} color="currentColor" strokeWidth={1.5} className="w-5 h-5" />
        </Button>
      )}
    </div>
  );
}
