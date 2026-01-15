"use client";

import { useState } from "react";
import { ChevronRight, BookOpen, Target, Calendar, Sparkles, AlertCircle } from "lucide-react";
import { createPlanAction, type PlanFormData } from "@/app/actions";
import { useRouter } from "next/navigation";

const EXAM_TYPES = [
  { id: "neet", name: "NEET", description: "Medical Entrance", icon: "🩺" },
  { id: "jee", name: "JEE", description: "Engineering Entrance", icon: "⚡" },
  { id: "upsc", name: "UPSC", description: "Civil Services", icon: "🏛️" },
  { id: "cat", name: "CAT", description: "MBA Entrance", icon: "📊" },
];

const STEPS = ["Exam Type", "Your Goal", "Timeline"];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [examType, setExamType] = useState("");
  const [goal, setGoal] = useState("");
  const [days, setDays] = useState(7);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzeStatus, setAnalyzeStatus] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
      setError(null);
    } else {
      startAnalysis();
    }
  };

  const startAnalysis = async () => {
    setIsAnalyzing(true);
    setError(null);
    setAnalyzeStatus("Analyzing syllabus structure...");

    try {
      const planData: PlanFormData = {
        examType,
        goal,
        days,
      };

      // Update status messages during API call
      const statusMessages = [
        "Analyzing syllabus structure...",
        "Identifying key topics...",
        "Mapping concept dependencies...",
        "Calculating optimal study path...",
        "Generating personalized plan...",
      ];

      let messageIndex = 0;
      const statusInterval = setInterval(() => {
        if (messageIndex < statusMessages.length - 1) {
          messageIndex++;
          setAnalyzeStatus(statusMessages[messageIndex]);
        }
      }, 1500);

      const result = await createPlanAction(planData);

      clearInterval(statusInterval);

      if (!result.success) {
        throw new Error(result.error || "Failed to generate plan");
      }

      // Store plan in localStorage for plan page
      if (result.plan) {
        localStorage.setItem("studyPlan", JSON.stringify(result.plan));
        localStorage.setItem("examType", examType);
        localStorage.setItem("goal", goal);
        localStorage.setItem("days", days.toString());
      }

      setAnalyzeStatus("Plan generated successfully!");
      
      // Redirect to plan page after a brief delay
      setTimeout(() => {
        router.push("/plan");
      }, 500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate plan");
      setIsAnalyzing(false);
    }
  };

  const canProceed =
    (step === 0 && examType) ||
    (step === 1 && goal.length > 10) ||
    step === 2;

  if (isAnalyzing) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-6 animate-fade-in max-w-md">
          <div className="relative">
            <div className="w-24 h-24 border-4 border-primary/30 rounded-full animate-spin border-t-primary mx-auto" />
            <Sparkles className="w-8 h-8 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
          </div>
          <p className="text-xl text-foreground font-medium animate-pulse">
            {analyzeStatus}
          </p>
          {error && (
            <div className="card-soft bg-destructive/10 border-destructive/30 p-4 mt-4">
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="w-5 h-5" />
                <p className="text-sm">{error}</p>
              </div>
              <button
                onClick={() => {
                  setIsAnalyzing(false);
                  setError(null);
                }}
                className="mt-3 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90 transition-all"
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background/80 p-6">
      <div className="max-w-2xl mx-auto pt-12 animate-fade-in">
        {/* Stepper */}
        <div className="flex items-center justify-center gap-2 mb-12">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${
                  i <= step
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`w-12 h-1 mx-2 rounded-lg ${
                    i < step ? "bg-primary" : "bg-muted"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="card-elevated p-8 animate-slide-up">
          {step === 0 && (
            <div className="space-y-6">
              <div className="text-center">
                <BookOpen className="w-12 h-12 text-primary mx-auto mb-4" />
                <h1 className="text-3xl font-semibold text-foreground mb-2">
                  What exam are you preparing for?
                </h1>
                <p className="text-muted-foreground">
                  We&apos;ll customize your study plan accordingly
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {EXAM_TYPES.map((exam) => (
                  <button
                    key={exam.id}
                    onClick={() => setExamType(exam.id)}
                    className={`p-6 rounded-lg border-2 transition-all text-left ${
                      examType === exam.id
                        ? "border-primary bg-accent"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <span className="text-3xl">{exam.icon}</span>
                    <h3 className="text-xl font-semibold text-foreground mt-2">
                      {exam.name}
                    </h3>
                    <p className="text-muted-foreground text-sm">{exam.description}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center">
                <Target className="w-12 h-12 text-primary mx-auto mb-4" />
                <h1 className="text-3xl font-semibold text-foreground mb-2">
                  What&apos;s your goal?
                </h1>
                <p className="text-muted-foreground">
                  Tell us what you want to achieve
                </p>
              </div>
              <textarea
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="e.g., I want to score 650+ in NEET and master Organic Chemistry..."
                className="input-clean w-full h-32 resize-none"
              />
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center">
                <Calendar className="w-12 h-12 text-primary mx-auto mb-4" />
                <h1 className="text-3xl font-semibold text-foreground mb-2">
                  How many days do you have?
                </h1>
                <p className="text-muted-foreground">
                  We&apos;ll optimize your schedule
                </p>
              </div>
              <div className="flex items-center justify-center gap-6">
                <input
                  type="range"
                  min={3}
                  max={30}
                  value={days}
                  onChange={(e) => setDays(Number(e.target.value))}
                  className="w-64 accent-primary"
                />
                <span className="text-4xl font-bold text-primary w-20 text-center">
                  {days}
                </span>
              </div>
              <p className="text-center text-muted-foreground">days until exam</p>
            </div>
          )}

          {/* Next Button */}
          <button
            onClick={handleNext}
            disabled={!canProceed}
            className={`w-full mt-8 py-4 rounded-lg font-semibold text-lg flex items-center justify-center gap-2 transition-all ${
              canProceed
                ? "bg-primary hover:bg-primary/90 text-primary-foreground shadow-soft-md active:scale-[0.98]"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            }`}
          >
            {step === STEPS.length - 1 ? "Generate My Plan" : "Continue"}
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
