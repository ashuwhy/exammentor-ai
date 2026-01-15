"use client";

import { useState } from "react";
import { ChevronRight, BookOpen, Target, Calendar, Sparkles } from "lucide-react";

const EXAM_TYPES = [
  { id: "neet", name: "NEET", description: "Medical Entrance", icon: "🩺" },
  { id: "jee", name: "JEE", description: "Engineering Entrance", icon: "⚡" },
  { id: "upsc", name: "UPSC", description: "Civil Services", icon: "🏛️" },
  { id: "cat", name: "CAT", description: "MBA Entrance", icon: "📊" },
];

const STEPS = ["Exam Type", "Your Goal", "Timeline"];

export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const [examType, setExamType] = useState("");
  const [goal, setGoal] = useState("");
  const [days, setDays] = useState(7);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzeStatus, setAnalyzeStatus] = useState("");

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      startAnalysis();
    }
  };

  const startAnalysis = () => {
    setIsAnalyzing(true);
    const messages = [
      "Analyzing syllabus structure...",
      "Identifying key topics...",
      "Mapping concept dependencies...",
      "Calculating optimal study path...",
      "Generating personalized plan...",
    ];
    let i = 0;
    const interval = setInterval(() => {
      setAnalyzeStatus(messages[i]);
      i++;
      if (i >= messages.length) {
        clearInterval(interval);
        // Navigate to plan page
        window.location.href = "/plan";
      }
    }, 800);
  };

  const canProceed =
    (step === 0 && examType) ||
    (step === 1 && goal.length > 10) ||
    step === 2;

  if (isAnalyzing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center space-y-6">
          <div className="relative">
            <div className="w-24 h-24 border-4 border-purple-500/30 rounded-full animate-spin border-t-purple-500 mx-auto" />
            <Sparkles className="w-8 h-8 text-purple-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
          </div>
          <p className="text-xl text-purple-200 font-medium animate-pulse">
            {analyzeStatus}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-2xl mx-auto pt-12">
        {/* Stepper */}
        <div className="flex items-center justify-center gap-2 mb-12">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${
                  i <= step
                    ? "bg-purple-500 text-white"
                    : "bg-slate-700 text-slate-400"
                }`}
              >
                {i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`w-12 h-1 mx-2 rounded ${
                    i < step ? "bg-purple-500" : "bg-slate-700"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="bg-slate-800/50 backdrop-blur-lg rounded-2xl p-8 border border-slate-700 shadow-2xl">
          {step === 0 && (
            <div className="space-y-6">
              <div className="text-center">
                <BookOpen className="w-12 h-12 text-purple-400 mx-auto mb-4" />
                <h1 className="text-3xl font-bold text-white mb-2">
                  What exam are you preparing for?
                </h1>
                <p className="text-slate-400">
                  We&apos;ll customize your study plan accordingly
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {EXAM_TYPES.map((exam) => (
                  <button
                    key={exam.id}
                    onClick={() => setExamType(exam.id)}
                    className={`p-6 rounded-xl border-2 transition-all text-left ${
                      examType === exam.id
                        ? "border-purple-500 bg-purple-500/20"
                        : "border-slate-600 hover:border-slate-500"
                    }`}
                  >
                    <span className="text-3xl">{exam.icon}</span>
                    <h3 className="text-xl font-bold text-white mt-2">
                      {exam.name}
                    </h3>
                    <p className="text-slate-400 text-sm">{exam.description}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center">
                <Target className="w-12 h-12 text-purple-400 mx-auto mb-4" />
                <h1 className="text-3xl font-bold text-white mb-2">
                  What&apos;s your goal?
                </h1>
                <p className="text-slate-400">
                  Tell us what you want to achieve
                </p>
              </div>
              <textarea
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="e.g., I want to score 650+ in NEET and master Organic Chemistry..."
                className="w-full h-32 bg-slate-700/50 border border-slate-600 rounded-xl p-4 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
              />
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center">
                <Calendar className="w-12 h-12 text-purple-400 mx-auto mb-4" />
                <h1 className="text-3xl font-bold text-white mb-2">
                  How many days do you have?
                </h1>
                <p className="text-slate-400">
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
                  className="w-64 accent-purple-500"
                />
                <span className="text-4xl font-bold text-purple-400 w-20 text-center">
                  {days}
                </span>
              </div>
              <p className="text-center text-slate-400">days until exam</p>
            </div>
          )}

          {/* Next Button */}
          <button
            onClick={handleNext}
            disabled={!canProceed}
            className={`w-full mt-8 py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all ${
              canProceed
                ? "bg-purple-500 hover:bg-purple-600 text-white"
                : "bg-slate-700 text-slate-500 cursor-not-allowed"
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
