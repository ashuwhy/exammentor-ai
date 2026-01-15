"use client";

import { useState, useEffect } from "react";
import { Calendar, Clock, BookOpen, ChevronRight, Play, AlertCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PlanSkeleton } from "@/components/ui/Skeleton";

interface DailyPlan {
  day_number: number;
  focus_topics: string[];
  estimated_hours: number;
  rationale: string;
}

interface StudyPlan {
  exam_name: string;
  total_days: number;
  schedule: DailyPlan[];
  critical_topics: string[];
}

export default function PlanPage() {
  const router = useRouter();
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Load plan from localStorage
    const storedPlan = localStorage.getItem("studyPlan");
    const examType = localStorage.getItem("examType") || "NEET";
    
    if (!storedPlan) {
      // No plan found, redirect to onboarding
      router.push("/onboarding");
      return;
    }

    try {
      const planData = JSON.parse(storedPlan);
      setPlan(planData);
    } catch (err) {
      setError("Failed to load study plan");
      console.error("Plan parsing error:", err);
    } finally {
      setLoading(false);
    }
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <PlanSkeleton />
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-md w-full card-elevated p-8 text-center">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">Plan Not Found</h2>
          <p className="text-muted-foreground mb-6">
            {error || "We couldn't find your study plan. Let's create one!"}
          </p>
          <Link
            href="/onboarding"
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3 rounded-lg font-semibold inline-flex items-center gap-2 transition-all"
          >
            Create Study Plan
            <ChevronRight className="w-5 h-5" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-5xl mx-auto pt-8 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-semibold text-foreground flex items-center gap-3">
              <Calendar className="w-8 h-8 text-primary" />
              Your Study Plan
            </h1>
            <p className="text-muted-foreground mt-1">
              {plan.exam_name} • {plan.total_days} days
            </p>
          </div>
          {plan.schedule.length > 0 && (
            <Link
              href={`/learn/${encodeURIComponent(plan.schedule[0].focus_topics[0].toLowerCase().replace(/\s+/g, "-"))}`}
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3 rounded-lg font-semibold flex items-center gap-2 transition-all shadow-soft-md active:scale-[0.98]"
            >
              <Play className="w-5 h-5" />
              Start Learning
            </Link>
          )}
        </div>

        {/* Critical Topics Alert */}
        {plan.critical_topics && plan.critical_topics.length > 0 && (
          <div className="card-soft bg-accent/50 border-accent p-4 mb-8">
            <p className="text-accent-foreground font-medium">
              Focus Areas: {plan.critical_topics.join(", ")}
            </p>
          </div>
        )}

        {/* Timeline */}
        <div className="space-y-4">
          {plan.schedule.map((day, index) => (
            <div
              key={day.day_number}
              onClick={() =>
                setSelectedDay(
                  selectedDay === day.day_number ? null : day.day_number
                )
              }
              className={`card-elevated p-5 cursor-pointer transition-all hover:shadow-soft-lg animate-slide-up ${
                selectedDay === day.day_number
                  ? "ring-2 ring-primary"
                  : ""
              }`}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-center gap-6">
                {/* Day Number */}
                <div className="w-14 h-14 rounded-lg bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 font-bold text-lg">
                  D{day.day_number}
                </div>

                {/* Topics */}
                <div className="flex-1">
                  <div className="flex flex-wrap gap-2 mb-1">
                    {day.focus_topics.map((topic, i) => (
                      <span
                        key={i}
                        className="bg-secondary text-secondary-foreground px-3 py-1 rounded-full text-sm font-medium"
                      >
                        {topic}
                      </span>
                    ))}
                  </div>
                  {selectedDay === day.day_number && (
                    <p className="text-muted-foreground text-sm mt-2 animate-fade-in">
                      💡 {day.rationale}
                    </p>
                  )}
                </div>

                {/* Hours */}
                <div className="flex items-center gap-2 text-muted-foreground flex-shrink-0">
                  <Clock className="w-4 h-4" />
                  <span className="font-medium">{day.estimated_hours}h</span>
                </div>

                {/* Progress Bar */}
                <div className="w-32 flex-shrink-0">
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${(day.estimated_hours / 6) * 100}%` }}
                    />
                  </div>
                </div>

                <ChevronRight
                  className={`w-5 h-5 text-muted-foreground transition-transform ${
                    selectedDay === day.day_number ? "rotate-90" : ""
                  }`}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="mt-8 flex items-center justify-center gap-8 text-muted-foreground text-sm">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            <span>Click a day to see rationale</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span>Hours indicate estimated study time</span>
          </div>
        </div>
      </div>
    </div>
  );
}
