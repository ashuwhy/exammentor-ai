"use client";

import { useState, useEffect } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  BarChart,
  TrendingUp,
  Target,
  AlertTriangle,
  CheckmarkCircle02Icon,
  Book02Icon,
  ArrowRight,
  Flame,
  Lightbulb,
} from "@hugeicons/core-free-icons";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { analyzePerformanceAction } from "@/app/actions";
import { ResultsSkeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/Card";

interface Misconception {
  topic: string;
  issue: string;
  advice: string;
}

interface PerformanceAnalysis {
  overall_score: number;
  strengths: string[];
  weaknesses: string[];
  misconceptions: Misconception[];
  recommendations: string[];
  topic_performance?: Array<{
    name: string;
    score: number;
    status: "mastered" | "learning" | "weak" | "pending";
  }>;
}

import { Suspense } from "react";

function ResultsContent() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [analysis, setAnalysis] = useState<PerformanceAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    overall_score: 0,
    topics_mastered: 0,
    topics_total: 0,
    study_hours: 0,
    quizzes_taken: 1,
    streak_days: 0,
  });

  useEffect(() => {
    const loadAnalysis = async () => {
      try {
        setLoading(true);
        
        // Get quiz data from URL params or localStorage
        const answersParam = searchParams.get("answers");
        const topic = searchParams.get("topic") || "Topic";
        const score = parseInt(searchParams.get("score") || "0");
        const total = parseInt(searchParams.get("total") || "0");

        let quizAnswers: Array<{
          question_id: string;
          question_text: string;
          concept_tested: string;
          student_answer: string;
          correct_answer: string;
          is_correct: boolean;
        }> = [];
        
        if (answersParam) {
          quizAnswers = JSON.parse(decodeURIComponent(answersParam));
        } else {
          // Try to get from localStorage as fallback
          const storedAnswers = localStorage.getItem("lastQuizAnswers");
          if (storedAnswers) {
            quizAnswers = JSON.parse(storedAnswers);
          }
        }

        if (quizAnswers.length === 0) {
          // No quiz data, show placeholder
          setStats({
            overall_score: Math.round((score / total) * 100) || 0,
            topics_mastered: 0,
            topics_total: 0,
            study_hours: 0,
            quizzes_taken: 1,
            streak_days: 0,
          });
          setLoading(false);
          return;
        }

        // Get context
        const plan = localStorage.getItem("studyPlan");
        const examType = localStorage.getItem("examType") || "NEET";
        const context = plan ? `Exam: ${examType}. Study plan context available.` : `Exam: ${examType}`;

        // Call analysis API
        const analysisData = await analyzePerformanceAction(
          quizAnswers,
          topic,
          context
        );

        if (!analysisData) {
          throw new Error("Failed to analyze performance");
        }

        setAnalysis(analysisData);
        
        // Calculate stats
        const correctCount = quizAnswers.filter((a) => a.is_correct).length;
        const overallScore = Math.round((correctCount / quizAnswers.length) * 100);
        
        setStats({
          overall_score: overallScore,
          topics_mastered: analysisData.topic_performance?.filter((t: { status: string }) => t.status === "mastered").length || 0,
          topics_total: analysisData.topic_performance?.length || 0,
          study_hours: 0, // Would come from database
          quizzes_taken: 1,
          streak_days: 0, // Would come from database
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load analysis");
        console.error("Analysis error:", err);
      } finally {
        setLoading(false);
      }
    };

    loadAnalysis();
  }, [searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen p-6">
        <ResultsSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card variant="elevated" className="max-w-md w-full p-8 text-center">
          <HugeiconsIcon icon={AlertTriangle} size={48} color="currentColor" strokeWidth={1.5} className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">Analysis Error</h2>
          <p className="text-muted-foreground mb-6">{error}</p>
          <Button
            asChild
            variant="premium"
            className="mt-6"
          >
            <Link href="/plan">
              Back to Plan
              <HugeiconsIcon icon={ArrowRight} size={24} color="currentColor" strokeWidth={1.5} className="w-6 h-6" />
            </Link>
          </Button>
        </Card>
      </div>
    );
  }

  const misconceptions = analysis?.misconceptions || [];
  const topicPerformance = analysis?.topic_performance || [];
  return (
    <div className="min-h-screen p-6">
      <div className="max-w-5xl mx-auto pt-8 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-semibold text-foreground flex items-center gap-3">
              <HugeiconsIcon icon={BarChart} size={40} color="currentColor" strokeWidth={1.5} className="w-10 h-10 text-primary" />
              Your Progress
            </h1>
            <p className="text-muted-foreground mt-1">
              {localStorage.getItem("examType")?.toUpperCase() || "NEET"} 2025
            </p>
          </div>
          <Button
            asChild
            variant="premium"
            size="lg"
          >
            <Link href="/plan">
              Continue Learning
              <HugeiconsIcon icon={ArrowRight} size={24} color="currentColor" strokeWidth={1.5} className="w-6 h-6" />
            </Link>
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="p-5 border border-border bg-card/50">
            <HugeiconsIcon icon={TrendingUp} size={32} color="currentColor" strokeWidth={1.5} className="w-8 h-8 text-chart-2 mb-2" />
            <p className="text-3xl font-bold text-foreground">
              {stats.overall_score}%
            </p>
            <p className="text-muted-foreground text-sm">Overall Score</p>
          </Card>
          <Card className="p-5 border border-border bg-card/50">
            <HugeiconsIcon icon={Target} size={32} color="currentColor" strokeWidth={1.5} className="w-8 h-8 text-primary mb-2" />
            <p className="text-3xl font-bold text-foreground">
              {stats.topics_mastered}/{stats.topics_total}
            </p>
            <p className="text-muted-foreground text-sm">Topics Mastered</p>
          </Card>
          <Card className="p-5 border border-border bg-card/50">
            <HugeiconsIcon icon={Book02Icon} size={32} color="currentColor" strokeWidth={1.5} className="w-8 h-8 text-chart-1 mb-2" />
            <p className="text-3xl font-bold text-foreground">
              {stats.study_hours}h
            </p>
            <p className="text-muted-foreground text-sm">Study Time</p>
          </Card>
          <Card className="p-5 border border-border bg-card/50">
            <HugeiconsIcon icon={CheckmarkCircle02Icon} size={32} color="currentColor" strokeWidth={1.5} className="w-8 h-8 text-chart-3 mb-2" />
            <p className="text-3xl font-bold text-foreground flex items-center gap-2">
              {stats.streak_days} <HugeiconsIcon icon={Flame} size={32} color="currentColor" strokeWidth={1.5} className="w-8 h-8 text-orange-500 fill-orange-500" />
            </p>
            <p className="text-muted-foreground text-sm">Day Streak</p>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Topic Performance */}
          <Card className="p-6 border border-border bg-card/50">
            <h2 className="text-xl font-semibold text-foreground mb-4">
              Topic Performance
            </h2>
            <div className="space-y-4">
              {topicPerformance.length > 0 ? (
                topicPerformance.map((topic, index) => (
                <div key={topic.name} className="animate-slide-up" style={{ animationDelay: `${index * 50}ms` }}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-foreground text-sm">{topic.name}</span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        topic.status === "mastered"
                          ? "bg-chart-2/20 text-chart-2"
                          : topic.status === "learning"
                          ? "bg-chart-3/20 text-chart-3"
                          : topic.status === "weak"
                          ? "bg-destructive/20 text-destructive"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {topic.status}
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        topic.score >= 80
                          ? "bg-chart-2"
                          : topic.score >= 60
                          ? "bg-chart-3"
                          : topic.score > 0
                          ? "bg-destructive"
                          : "bg-muted-foreground"
                      }`}
                      style={{ width: `${topic.score}%` }}
                    />
                  </div>
                </div>
                ))
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  Complete more quizzes to see topic performance
                </p>
              )}
            </div>
          </Card>

          {/* Misconceptions */}
          <Card className="p-6 border border-border bg-card/50">
            <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <HugeiconsIcon icon={AlertTriangle} size={28} color="currentColor" strokeWidth={1.5} className="w-7 h-7 text-chart-3" />
              Areas to Improve
            </h2>
            <div className="space-y-4">
              {misconceptions.length > 0 ? (
                misconceptions.map((m, i) => (
                <div
                  key={i}
                  className="bg-chart-3/10 border border-chart-3/30 p-4 rounded-lg animate-slide-up backdrop-blur-lg"
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  <p className="text-foreground font-medium mb-1">{m.topic}</p>
                  <p className="text-muted-foreground text-sm mb-2">{m.issue}</p>
                  <p className="text-chart-3 text-sm flex items-start gap-2">
                    <HugeiconsIcon icon={Lightbulb} size={16} color="currentColor" strokeWidth={1.5} className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>{m.advice}</span>
                  </p>
                </div>

))
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  {analysis?.recommendations?.length ? (
                    <div className="space-y-2">
                      <p className="font-medium mb-4">Recommendations:</p>
                      {analysis.recommendations.map((rec, i) => (
                        <p key={i} className="text-sm text-foreground/80">• {rec}</p>
                      ))}
                    </div>
                  ) : (
                    "No misconceptions detected yet. Keep learning!"
                  )}
                </p>
              )}
            </div>
          </Card>
        </div>

        {/* Visual Chart */}
        <Card className="mt-6 p-6 border border-border bg-card/50">
          <h2 className="text-xl font-semibold text-foreground mb-4">
            Daily Progress
          </h2>
          <div className="h-48 flex items-end justify-around gap-2">
            {[45, 62, 78, 0, 0, 0, 0].map((val, i) => (
              <div key={i} className="flex flex-col items-center gap-2 flex-1">
                <div
                  className={`w-full rounded-lg-t-lg transition-all ${
                    val > 0
                      ? "bg-primary"
                      : "bg-muted"
                  }`}
                  style={{ height: `${Math.max(val, 10)}%` }}
                />
                <span className="text-muted-foreground text-xs">D{i + 1}</span>
              </div>
            ))}
          </div>
          <p className="text-center text-muted-foreground text-sm mt-4">
            Score progression over 7 days
          </p>
        </Card>
      </div>
    </div>
  );
}

export default function ResultsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen p-6"><ResultsSkeleton /></div>}>
      <ResultsContent />
    </Suspense>
  );
}
