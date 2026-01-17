"use client";

import { useState, useEffect, useRef } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Play,
  Pause,
  Square,
  Clock01Icon,
  Brain,
  CheckmarkCircle02Icon,
  AlertTriangle,
  Zap,
  Book02Icon,
  Target,
  TrendingUp,
  ChevronDown,
  Refresh01Icon,
} from "@hugeicons/core-free-icons";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/Card";

interface AutopilotStep {
  timestamp: string;
  action: string;
  data: Record<string, unknown>;
  reasoning: string;
  duration_ms?: number;
}

interface AutopilotSession {
  session_id: string;
  status: string;
  current_phase: string;
  current_topic: string | null;
  topics_completed: number;
  elapsed_seconds: number;
  target_duration_minutes: number;
  topic_mastery: Record<string, { topic: string; score: number; attempts: number }>;
  steps: AutopilotStep[];
  started_at: string | null;
  completed_at: string | null;
}

const ACTION_ICONS: Record<string, React.ReactNode> = {
  session_started: <HugeiconsIcon icon={Play} size={20} color="currentColor" strokeWidth={1.5} className="w-5 h-5 text-primary" />,
  topic_selected: <HugeiconsIcon icon={Target} size={20} color="currentColor" strokeWidth={1.5} className="w-5 h-5 text-chart-1" />,
  lesson_started: <HugeiconsIcon icon={Book02Icon} size={20} color="currentColor" strokeWidth={1.5} className="w-5 h-5 text-chart-2" />,
  lesson_completed: <HugeiconsIcon icon={CheckmarkCircle02Icon} size={20} color="currentColor" strokeWidth={1.5} className="w-5 h-5 text-chart-2" />,
  quiz_generated: <HugeiconsIcon icon={Brain} size={20} color="currentColor" strokeWidth={1.5} className="w-5 h-5 text-chart-3" />,
  answer_evaluated: <HugeiconsIcon icon={TrendingUp} size={20} color="currentColor" strokeWidth={1.5} className="w-5 h-5 text-primary" />,
  misconception_detected: <HugeiconsIcon icon={AlertTriangle} size={20} color="currentColor" strokeWidth={1.5} className="w-5 h-5 text-destructive" />,
  misconception_busted: <HugeiconsIcon icon={Zap} size={20} color="currentColor" strokeWidth={1.5} className="w-5 h-5 text-chart-3" />,
  topic_completed: <HugeiconsIcon icon={CheckmarkCircle02Icon} size={20} color="currentColor" strokeWidth={1.5} className="w-5 h-5 text-chart-2" />,
  plan_updated: <HugeiconsIcon icon={Refresh01Icon} size={20} color="currentColor" strokeWidth={1.5} className="w-5 h-5 text-primary" />,
  session_paused: <HugeiconsIcon icon={Pause} size={20} color="currentColor" strokeWidth={1.5} className="w-5 h-5 text-muted-foreground" />,
  session_completed: <HugeiconsIcon icon={CheckmarkCircle02Icon} size={20} color="currentColor" strokeWidth={1.5} className="w-5 h-5 text-chart-2" />,
  self_correction: <HugeiconsIcon icon={Refresh01Icon} size={20} color="currentColor" strokeWidth={1.5} className="w-5 h-5 text-chart-3" />,
};

const ACTION_LABELS: Record<string, string> = {
  session_started: "Session Started",
  topic_selected: "Topic Selected",
  lesson_started: "Lesson Started",
  lesson_completed: "Lesson Complete",
  quiz_generated: "Quiz Generated",
  answer_evaluated: "Answer Evaluated",
  misconception_detected: "Misconception Found",
  misconception_busted: "Misconception Fixed",
  topic_completed: "Topic Mastered",
  plan_updated: "Plan Updated",
  session_paused: "Session Paused",
  session_completed: "Session Complete",
  self_correction: "Self-Correction",
};

export default function AutopilotPage() {
  const router = useRouter();
  const [session, setSession] = useState<AutopilotSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId] = useState(() => `autopilot-${Date.now()}`);
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set());
  const runLogRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

  // Get study plan from localStorage
  const getStudyPlan = () => {
    const stored = localStorage.getItem("studyPlan");
    if (!stored) return null;
    try {
      return JSON.parse(stored);
    } catch {
      return null;
    }
  };

  // Poll for session status
  const pollStatus = async () => {
    if (!session || session.status === "completed" || session.status === "idle") return;

    try {
      const res = await fetch(`${API_BASE}/api/autopilot/status/${sessionId}`);
      if (res.ok) {
        const data = await res.json();
        setSession(data);

        // Auto-scroll run log
        if (runLogRef.current) {
          runLogRef.current.scrollTop = runLogRef.current.scrollHeight;
        }

        // Stop polling if completed
        if (data.status === "completed" && pollingRef.current) {
          clearInterval(pollingRef.current);
        }
      }
    } catch (err) {
      console.error("Polling error:", err);
    }
  };

  // Start polling when session is running
  useEffect(() => {
    const poll = async () => {
      if (!session || session.status === "completed" || session.status === "idle") return;

      try {
        const res = await fetch(`${API_BASE}/api/autopilot/status/${sessionId}`);
        if (res.ok) {
          const data = await res.json();
          setSession(data);

          if (runLogRef.current) {
            runLogRef.current.scrollTop = runLogRef.current.scrollHeight;
          }

          if (data.status === "completed" && pollingRef.current) {
            clearInterval(pollingRef.current);
          }
        }
      } catch (err) {
        console.error("Polling error:", err);
      }
    };

    if (session?.status === "running") {
      pollingRef.current = setInterval(poll, 2000);
    }
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [session, sessionId, API_BASE]);

  const handleStart = async () => {
    const plan = getStudyPlan();
    if (!plan) {
      router.push("/onboarding");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/api/autopilot/start?session_id=${sessionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          study_plan: plan,
          exam_type: localStorage.getItem("examType") || "NEET",
          duration_minutes: 5, // Short for demo, normally 30
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to start autopilot session");
      }

      const data = await res.json();
      setSession({
        session_id: data.session_id,
        status: data.status,
        current_phase: "selecting_topic",
        current_topic: null,
        topics_completed: 0,
        elapsed_seconds: 0,
        target_duration_minutes: data.target_duration_minutes,
        topic_mastery: {},
        steps: [],
        started_at: data.started_at,
        completed_at: null,
      });

      // Start polling
      await pollStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start");
    } finally {
      setLoading(false);
    }
  };

  const handlePause = async () => {
    try {
      await fetch(`${API_BASE}/api/autopilot/pause/${sessionId}`, { method: "POST" });
      await pollStatus();
    } catch (err) {
      console.error("Pause error:", err);
    }
  };

  const handleResume = async () => {
    try {
      await fetch(`${API_BASE}/api/autopilot/resume/${sessionId}`, { method: "POST" });
      await pollStatus();
    } catch (err) {
      console.error("Resume error:", err);
    }
  };

  const handleStop = async () => {
    try {
      await fetch(`${API_BASE}/api/autopilot/stop/${sessionId}`, { method: "POST" });
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
      await pollStatus();
    } catch (err) {
      console.error("Stop error:", err);
    }
  };

  const toggleStepExpanded = (index: number) => {
    setExpandedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatTimestamp = (ts: string) => {
    return new Date(ts).toLocaleTimeString();
  };

  // No session yet - show start screen
  if (!session) {
    const hasPlan = !!getStudyPlan();

    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-3xl mx-auto pt-16">
          <Card variant="elevated" className="p-8 text-center">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <HugeiconsIcon icon={Zap} size={40} color="currentColor" strokeWidth={1.5} className="w-10 h-10 text-primary" />
            </div>

            <h1 className="text-3xl font-bold text-foreground mb-4">
              Autopilot Mode
            </h1>

            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              Let the AI take control. It will automatically select topics, teach
              lessons, quiz you, and adapt based on your performance.
            </p>

            <div className="grid md:grid-cols-3 gap-4 mb-8">
              <div className="p-4 bg-secondary/50 rounded-lg transition-premium">
                <HugeiconsIcon icon={Brain} size={32} color="currentColor" strokeWidth={1.5} className="w-8 h-8 text-primary mx-auto mb-2" />
                <p className="text-sm font-medium text-foreground">
                  AI Topic Selection
                </p>
                <p className="text-xs text-muted-foreground">
                  Picks what to study next
                </p>
              </div>
              <div className="p-4 bg-secondary/50 rounded-lg transition-premium">
                <HugeiconsIcon icon={Book02Icon} size={32} color="currentColor" strokeWidth={1.5} className="w-8 h-8 text-chart-2 mx-auto mb-2" />
                <p className="text-sm font-medium text-foreground">
                  Micro-Lessons
                </p>
                <p className="text-xs text-muted-foreground">
                  Teaches in focused bursts
                </p>
              </div>
              <div className="p-4 bg-secondary/50 rounded-lg transition-premium">
                <HugeiconsIcon icon={Refresh01Icon} size={32} color="currentColor" strokeWidth={1.5} className="w-8 h-8 text-chart-3 mx-auto mb-2" />
                <p className="text-sm font-medium text-foreground">
                  Self-Correction
                </p>
                <p className="text-xs text-muted-foreground">
                  Fixes misconceptions live
                </p>
              </div>
            </div>

            {error && (
              <div className="bg-destructive/10 border border-destructive/30 p-3 rounded-lg mb-4 transition-premium backdrop-blur-lg">
                <p className="text-destructive text-sm">{error}</p>
              </div>
            )}

            {!hasPlan ? (
              <div className="space-y-4">
                <p className="text-chart-3 text-sm">
                  You need a study plan first!
                </p>
                <Button asChild variant="premium" size="lg">
                  <Link href="/onboarding">
                    Create Study Plan
                  </Link>
                </Button>
              </div>
            ) : (
              <Button
                onClick={handleStart}
                disabled={loading}
                variant="premium"
                size="xl"
                className="px-12"
              >
                {loading ? (
                  <>
                    <HugeiconsIcon icon={Refresh01Icon} size={20} color="currentColor" strokeWidth={1.5} className="w-5 h-5 animate-spin" />
                    Starting...
                  </>
                ) : (
                  <>
                    <HugeiconsIcon icon={Play} size={24} color="currentColor" strokeWidth={1.5} className="w-6 h-6 fill-current" />
                    Start Autopilot (5 min demo)
                  </>
                )}
              </Button>
            )}
          </Card>
        </div>
      </div>
    );
  }

  // Session is active - show run log
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-5xl mx-auto pt-8">
        {/* Header with controls */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
              <HugeiconsIcon icon={Zap} size={40} color="currentColor" strokeWidth={1.5} className="w-10 h-10 text-primary" />
              Autopilot Mode
              <span
                className={`text-sm px-3 py-1 rounded-full ${
                  session.status === "running"
                    ? "bg-chart-2/20 text-chart-2"
                    : session.status === "paused"
                    ? "bg-chart-3/20 text-chart-3"
                    : session.status === "completed"
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {session.status.toUpperCase()}
              </span>
            </h1>
            <p className="text-muted-foreground mt-1">
              {session.current_topic
                ? `Currently: ${session.current_topic}`
                : "Initializing..."}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-muted-foreground">
              <HugeiconsIcon icon={Clock01Icon} size={16} color="currentColor" strokeWidth={1.5} className="w-4 h-4" />
              <span className="font-mono text-lg">
                {formatTime(session.elapsed_seconds)} /{" "}
                {session.target_duration_minutes}:00
              </span>
            </div>

            {session.status === "running" && (
              <>
                <Button onClick={handlePause} variant="outline" size="sm">
                  <HugeiconsIcon icon={Pause} size={16} color="currentColor" strokeWidth={1.5} className="w-4 h-4" />
                  Pause
                </Button>
                <Button onClick={handleStop} variant="destructive" size="sm">
                  <HugeiconsIcon icon={Square} size={16} color="currentColor" strokeWidth={1.5} className="w-4 h-4" />
                  Stop
                </Button>
              </>
            )}

            {session.status === "paused" && (
              <>
                <Button onClick={handleResume} variant="premium" size="sm">
                  <HugeiconsIcon icon={Play} size={16} color="currentColor" strokeWidth={1.5} className="w-4 h-4" />
                  Resume
                </Button>
                <Button onClick={handleStop} variant="destructive" size="sm">
                  <HugeiconsIcon icon={Square} size={16} color="currentColor" strokeWidth={1.5} className="w-4 h-4" />
                  Stop
                </Button>
              </>
            )}

            {session.status === "completed" && (
              <Button asChild variant="premium" size="sm">
                <Link href="/results">View Results</Link>
              </Button>
            )}
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <Card variant="elevated" className="p-4">
            <p className="text-muted-foreground text-sm">Topics Completed</p>
            <p className="text-2xl font-bold text-foreground">
              {session.topics_completed}
            </p>
          </Card>
          <Card variant="elevated" className="p-4">
            <p className="text-muted-foreground text-sm">Current Phase</p>
            <p className="text-lg font-semibold text-foreground capitalize">
              {session.current_phase.replace("_", " ")}
            </p>
          </Card>
          <Card variant="elevated" className="p-4">
            <p className="text-muted-foreground text-sm">Agent Steps</p>
            <p className="text-2xl font-bold text-foreground">
              {session.steps.length}
            </p>
          </Card>
          <Card variant="elevated" className="p-4">
            <p className="text-muted-foreground text-sm">Avg Mastery</p>
            <p className="text-2xl font-bold text-primary">
              {Object.values(session.topic_mastery).length > 0
                ? Math.round(
                    Object.values(session.topic_mastery).reduce(
                      (acc, m) => acc + m.score,
                      0
                    ) / Object.values(session.topic_mastery).length
                  )
                : 0}
              %
            </p>
          </Card>
        </div>

        {/* Run Log - The key "Action Era" showcase */}
        <Card variant="elevated" className="p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <HugeiconsIcon icon={Brain} size={32} color="currentColor" strokeWidth={1.5} className="w-8 h-8 text-primary" />
            AI Run Log
            <span className="text-sm font-normal text-muted-foreground">
              (Every decision with reasoning)
            </span>
          </h2>

          <div
            ref={runLogRef}
            className="max-h-[500px] overflow-y-auto space-y-2 pr-2"
          >
            {session.steps.map((step, index) => (
              <div
                key={index}
                className={`border border-border rounded-lg p-3 transition-premium animate-slide-up ${
                  expandedSteps.has(index) ? "bg-secondary/50" : "bg-background"
                }`}
                style={{ animationDelay: `${index * 30}ms` }}
              >
                <div
                  className="flex items-center gap-3 cursor-pointer"
                  onClick={() => toggleStepExpanded(index)}
                >
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                    {ACTION_ICONS[step.action] || (
                      <HugeiconsIcon icon={Brain} size={24} color="currentColor" strokeWidth={1.5} className="w-6 h-6 text-muted-foreground" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground text-sm">
                        {ACTION_LABELS[step.action] || step.action}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatTimestamp(step.timestamp)}
                      </span>
                      {step.duration_ms && (
                        <span className="text-xs bg-muted px-1.5 py-0.5 rounded">
                          {step.duration_ms}ms
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {step.reasoning}
                    </p>
                  </div>

                  <HugeiconsIcon
                    icon={ChevronDown}
                    size={16}
                    color="currentColor"
                    strokeWidth={1.5}
                    className={`w-4 h-4 text-muted-foreground transition-transform ${
                      expandedSteps.has(index) ? "rotate-180" : ""
                    }`}
                  />
                </div>

                {expandedSteps.has(index) && (
                  <div className="mt-3 pt-3 border-t border-border animate-fade-in">
                    <p className="text-sm text-foreground mb-2">
                      <strong>Reasoning:</strong> {step.reasoning}
                    </p>
                    {Object.keys(step.data).length > 0 && (
                      <pre className="text-xs bg-muted/95 p-2 rounded overflow-x-auto backdrop-blur-lg">
                        {JSON.stringify(step.data, null, 2)}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            ))}

            {session.status === "running" && (
              <div className="flex items-center gap-2 p-3 text-muted-foreground">
                <HugeiconsIcon icon={Refresh01Icon} size={16} color="currentColor" strokeWidth={1.5} className="w-4 h-4 animate-spin" />
                <span className="text-sm">AI is thinking...</span>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
