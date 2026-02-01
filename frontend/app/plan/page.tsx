"use client";

import { useState, useEffect } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Clock01Icon, ChevronRight, Play, AlertCircle, Sparkles } from "@hugeicons/core-free-icons";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PlanSkeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/Card";
import { startStudySessionAction } from "@/app/actions";


interface Topic {
  name: string;
  difficulty: "easy" | "medium" | "hard";
  rationale: string;
}

interface DailyPlan {
  day: number;
  theme: string;
  topics: Topic[];
  estimated_hours: number;
}

interface StudyPlan {
  exam_name: string;
  total_days: number;
  overview: string;
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

    // Ensure we have a study session for persistence (if user is logged in)
    const userId = localStorage.getItem("app-user-id");
    const existingSession = localStorage.getItem("app-session-id");
    if (userId && !existingSession) {
      startStudySessionAction(userId, localStorage.getItem("examType") || "NEET").then(
        (created) => {
          if (created?.session_id)
            localStorage.setItem("app-session-id", created.session_id);
        }
      );
    }
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen p-6">
        <PlanSkeleton />
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card variant="elevated" className="max-w-md w-full p-8 text-center">
          <HugeiconsIcon icon={AlertCircle} size={48} color="currentColor" strokeWidth={1.5} className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">Plan Not Found</h2>
          <p className="text-muted-foreground mb-6">
            {error || "We couldn't find your study plan. Let's create one!"}
          </p>
          <Button
            asChild
            variant="premium"
            className="mt-6"
          >
            <Link href="/onboarding">
              Create Study Plan
              <HugeiconsIcon icon={ChevronRight} size={20} color="currentColor" strokeWidth={1.5} className="w-5 h-5" />
            </Link>
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 relative">
      <div className="max-w-4xl mx-auto pt-8 relative z-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-12 animate-fade-in">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-primary/20 text-primary text-xs font-medium mb-3 backdrop-blur-xl border border-primary/20">
              <HugeiconsIcon icon={Sparkles} size={20} color="currentColor" strokeWidth={1.5} className="w-5 h-5" />
              AI Generated Plan
            </div>
            <h1 className="text-4xl font-bold text-foreground flex items-center gap-3 mb-2">
              {plan.exam_name}
            </h1>
            <p className="text-muted-foreground max-w-xl text-lg leading-relaxed">
              {plan.overview}
            </p>
          </div>
          {plan.schedule?.length > 0 && plan.schedule[0]?.topics?.length > 0 && (
            <Button
              asChild
              variant="premium"
              size="lg"
              className="mt-2"
            >
              <Link href={`/learn/${encodeURIComponent(plan.schedule[0].topics[0].name.toLowerCase().replace(/\s+/g, "-"))}`}>
                <HugeiconsIcon icon={Play} size={24} color="currentColor" strokeWidth={1.5} className="w-6 h-6 fill-current mr-2" />
                Start Day 1
              </Link>
            </Button>
          )}
        </div>

        {/* Critical Topics Alert */}
        {plan.critical_topics && plan.critical_topics.length > 0 && (
          <div className="mb-10 animate-fade-in" style={{ animationDelay: '100ms' }}>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
              <HugeiconsIcon icon={AlertCircle} size={16} color="currentColor" strokeWidth={2} />
              Critical Focus Areas
            </h3>
            <div className="flex flex-wrap gap-2">
              {plan.critical_topics.map((topic, i) => (
                <div key={i} className="bg-chart-5/20 text-chart-5 border border-chart-5/30 px-4 py-2 rounded-lg text-sm font-medium backdrop-blur-xl">
                  {topic}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Timeline */}
        <div className="space-y-6 relative">
          {/* Vertical line connecting days */}
          <div className="absolute left-[27px] top-8 bottom-8 w-0.5 bg-border/50 z-0" />
          
          {plan.schedule?.map((day, index) => (
            <div
              key={day.day}
              className="relative z-10 animate-slide-up"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <Card 
                variant="glass" 
                className={`transition-premium ${selectedDay === day.day ? 'ring-1 ring-primary/50 bg-card/40' : ''}`}
              >
                <div 
                  className="p-6 cursor-pointer"
                  onClick={() => setSelectedDay(selectedDay === day.day ? null : day.day)}
                >
                  <div className="flex items-start gap-6">
                    {/* Day Number Badge */}
                    <div className={`w-14 h-14 rounded-lg flex items-center justify-center flex-shrink-0 font-bold text-xl shadow-lg transition-premium ${
                      selectedDay === day.day 
                        ? 'bg-primary text-primary-foreground scale-105' 
                        : 'bg-card text-foreground border border-border'
                    }`}>
                      <div className="text-center leading-none">
                        <span className="text-xs opacity-70 font-medium block mb-0.5">DAY</span>
                        {day.day}
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-xl font-semibold text-foreground truncate pr-4">
                          {day.theme}
                        </h3>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground flex-shrink-0">
                          <div className="flex items-center gap-1.5">
                            <HugeiconsIcon icon={Clock01Icon} size={16} color="currentColor" strokeWidth={2} />
                            <span>{day.estimated_hours}h</span>
                          </div>
                          <HugeiconsIcon 
                            icon={ChevronRight} 
                            size={20} 
                            color="currentColor" 
                            strokeWidth={2} 
                            className={`transition-premium ${selectedDay === day.day ? 'rotate-90 text-primary' : ''}`} 
                          />
                        </div>
                      </div>

                      {/* Topic Pills Preview */}
                      <div className="flex flex-wrap gap-2">
                        {day.topics.slice(0, 3).map((topic, i) => (
                          <span
                            key={i}
                            className="bg-secondary/50 text-secondary-foreground border border-secondary px-2.5 py-0.5 rounded-lg text-xs font-medium"
                          >
                            {topic.name}
                          </span>
                        ))}
                        {day.topics.length > 3 && (
                          <span className="text-xs text-muted-foreground py-0.5 px-1">
                            +{day.topics.length - 3} more
                          </span>
                        )}
                      </div>

                      {/* Expanded Content */}
                      <div className={`grid transition-premium ${
                        selectedDay === day.day ? 'grid-rows-[1fr] opacity-100 mt-6' : 'grid-rows-[0fr] opacity-0'
                      }`}>
                        <div className="overflow-hidden">
                          <div className="border-t border-border/50 pt-4 space-y-3">
                            {day.topics.map((topic, i) => (
                              <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-background/50 border border-border/50 transition-premium group">
                                <div className={`mt-0.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                                  topic.difficulty === 'hard' ? 'bg-destructive' : 
                                  topic.difficulty === 'medium' ? 'bg-orange-400' : 'bg-green-400'
                                }`} />
                                <div className="flex-1">
                                  <Link 
                                    href={`/learn/${encodeURIComponent(topic.name.toLowerCase().replace(/\s+/g, "-"))}`}
                                    className="text-sm font-medium text-foreground transition-colors flex items-center gap-2"
                                  >
                                    {topic.name}
                                    <HugeiconsIcon icon={ChevronRight} size={14} color="currentColor" strokeWidth={2} className="opacity-0 transition-opacity" />
                                  </Link>
                                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                                    {topic.rationale}
                                  </p>
                                </div>
                                <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                  {topic.difficulty}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
