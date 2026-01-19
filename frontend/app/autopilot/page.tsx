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
  session_started: <HugeiconsIcon icon={Play} size={16} className="text-primary" />,
  topic_selected: <HugeiconsIcon icon={Target} size={16} className="text-chart-1" />,
  lesson_started: <HugeiconsIcon icon={Book02Icon} size={16} className="text-chart-2" />,
  lesson_completed: <HugeiconsIcon icon={CheckmarkCircle02Icon} size={16} className="text-chart-2" />,
  quiz_generated: <HugeiconsIcon icon={Brain} size={16} className="text-chart-3" />,
  answer_evaluated: <HugeiconsIcon icon={TrendingUp} size={16} className="text-primary" />,
  misconception_detected: <HugeiconsIcon icon={AlertTriangle} size={16} className="text-destructive" />,
  misconception_busted: <HugeiconsIcon icon={Zap} size={16} className="text-chart-3" />,
  topic_completed: <HugeiconsIcon icon={CheckmarkCircle02Icon} size={16} className="text-chart-2" />,
  plan_updated: <HugeiconsIcon icon={Refresh01Icon} size={16} className="text-primary" />,
  session_paused: <HugeiconsIcon icon={Pause} size={16} className="text-muted-foreground" />,
  session_completed: <HugeiconsIcon icon={CheckmarkCircle02Icon} size={16} className="text-chart-2" />,
  self_correction: <HugeiconsIcon icon={Refresh01Icon} size={16} className="text-chart-3" />,
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
  const [hasPlan, setHasPlan] = useState<boolean>(false);

  const getStudyPlan = () => {
    if (typeof window === 'undefined') return null;
    const stored = localStorage.getItem("studyPlan");
    if (!stored) return null;
    try { return JSON.parse(stored); } catch { return null; }
  };

  useEffect(() => { setHasPlan(!!getStudyPlan()); }, []);

  const pollStatus = async () => {
    if (!session || session.status === "completed" || session.status === "idle") return;
    try {
      const res = await fetch(`${API_BASE}/api/autopilot/status/${sessionId}`);
      if (res.ok) {
        const data = await res.json();
        setSession(data);
        if (runLogRef.current) runLogRef.current.scrollTop = runLogRef.current.scrollHeight;
        if (data.status === "completed" && pollingRef.current) clearInterval(pollingRef.current);
      }
    } catch (err) { console.error("Polling error:", err); }
  };

  useEffect(() => {
    if (session?.status === "running") {
      pollingRef.current = setInterval(pollStatus, 2000);
    }
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [session?.status]);

  const handleStart = async () => {
    const plan = getStudyPlan();
    if (!plan) { router.push("/onboarding"); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/autopilot/start?session_id=${sessionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          study_plan: plan,
          exam_type: localStorage.getItem("examType") || "NEET",
          duration_minutes: 5,
        }),
      });
      if (!res.ok) throw new Error("Failed to start autopilot session");
      const data = await res.json();
      setSession({
        session_id: data.session_id, status: data.status, current_phase: "selecting_topic",
        current_topic: null, topics_completed: 0, elapsed_seconds: 0,
        target_duration_minutes: data.target_duration_minutes, topic_mastery: {},
        steps: [], started_at: data.started_at, completed_at: null,
      });
      await pollStatus();
    } catch (err) { setError(err instanceof Error ? err.message : "Failed to start"); }
    finally { setLoading(false); }
  };

  const handlePause = async () => { try { await fetch(`${API_BASE}/api/autopilot/pause/${sessionId}`, { method: "POST" }); await pollStatus(); } catch (e) { console.error(e); } };
  const handleResume = async () => { try { await fetch(`${API_BASE}/api/autopilot/resume/${sessionId}`, { method: "POST" }); await pollStatus(); } catch (e) { console.error(e); } };
  const handleStop = async () => { try { await fetch(`${API_BASE}/api/autopilot/stop/${sessionId}`, { method: "POST" }); if (pollingRef.current) clearInterval(pollingRef.current); await pollStatus(); } catch (e) { console.error(e); } };

  const toggleStepExpanded = (index: number) => {
    setExpandedSteps((prev) => { const next = new Set(prev); next.has(index) ? next.delete(index) : next.add(index); return next; });
  };
  const formatTime = (seconds: number) => `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, "0")}`;
  const formatTimestamp = (ts: string) => new Date(ts).toLocaleTimeString();

  // --- START SCREEN ---
  if (!session) {
    return (
      <div className="min-h-screen">
        <section className="max-w-3xl mx-auto px-6 pt-24 pb-16 text-center">
          {/* Icon */}
          <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <HugeiconsIcon icon={Zap} size={32} className="text-primary" />
          </div>

          {/* Heading */}
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4 tracking-tight">
            Autopilot Mode
          </h1>

          {/* Description */}
          <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-10">
            Let the AI take full control. It will autonomously{" "}
            <span className="text-primary font-medium">select topics</span>,{" "}
            <span className="text-chart-2 font-medium">teach micro-lessons</span>, and{" "}
            <span className="text-chart-3 font-medium">fix misconceptions</span>—all without you clicking a button.
          </p>

          {/* Feature Cards */}
          <div className="grid md:grid-cols-3 gap-4 mb-10">
            <Card className="p-5 border border-border bg-card/50 hover:border-primary/30 transition-colors text-center">
              <HugeiconsIcon icon={Brain} size={28} className="text-primary mx-auto mb-2" />
              <p className="font-semibold text-foreground text-sm">AI Topic Selection</p>
              <p className="text-xs text-muted-foreground">Optimizes your learning path</p>
            </Card>
            <Card className="p-5 border border-border bg-card/50 hover:border-chart-2/30 transition-colors text-center">
              <HugeiconsIcon icon={Book02Icon} size={28} className="text-chart-2 mx-auto mb-2" />
              <p className="font-semibold text-foreground text-sm">Micro-Lessons</p>
              <p className="text-xs text-muted-foreground">Focused, bite-sized teaching</p>
            </Card>
            <Card className="p-5 border border-border bg-card/50 hover:border-chart-3/30 transition-colors text-center">
              <HugeiconsIcon icon={Refresh01Icon} size={28} className="text-chart-3 mx-auto mb-2" />
              <p className="font-semibold text-foreground text-sm">Self-Correction</p>
              <p className="text-xs text-muted-foreground">Detects & fixes gaps live</p>
            </Card>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 p-3 rounded-lg mb-6 flex items-center justify-center gap-2 text-sm">
              <HugeiconsIcon icon={AlertTriangle} size={18} className="text-destructive" />
              <p className="text-destructive font-medium">{error}</p>
            </div>
          )}

          {/* CTA */}
          {!hasPlan ? (
            <div className="space-y-3">
              <p className="text-chart-3 text-sm font-medium">Study plan required to engage autopilot.</p>
              <Button asChild size="md">
                <Link href="/onboarding">
                  Generate Study Plan
                  <HugeiconsIcon icon={Target} size={18} className="ml-2" />
                </Link>
              </Button>
            </div>
          ) : (
            <Button onClick={handleStart} disabled={loading} size="md">
              {loading ? (
                <>
                  <HugeiconsIcon icon={Refresh01Icon} size={18} className="animate-spin mr-2" />
                  Initializing...
                </>
              ) : (
                <>
                  <HugeiconsIcon icon={Play} size={18} className="mr-2" />
                  Engage Autopilot (5m Demo)
                </>
              )}
            </Button>
          )}

          <p className="text-xs text-muted-foreground mt-12 opacity-60">
            Powered by Gemini 3 Flash • Autonomous Agent Architecture
          </p>
        </section>
      </div>
    );
  }

  // --- SESSION ACTIVE ---
  return (
    <div className="min-h-screen">
      <div className="max-w-6xl mx-auto px-6 pt-8 pb-16">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
              <span className="text-xs font-mono text-primary uppercase tracking-wider">Live Session</span>
            </div>
            <h1 className="text-3xl font-bold text-foreground tracking-tight flex items-center gap-3">
              Autopilot Active
              <span className={`text-xs px-3 py-1 rounded-full border ${
                session.status === "running" ? "bg-primary/10 text-primary border-primary/20" :
                session.status === "paused" ? "bg-chart-3/10 text-chart-3 border-chart-3/20" :
                "bg-chart-2/10 text-chart-2 border-chart-2/20"
              }`}>{session.status}</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {session.current_topic ? <>Focusing on: <span className="text-foreground">{session.current_topic}</span></> : "Calibrating learning path..."}
            </p>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-3 p-2 border border-border rounded-xl bg-card/50">
            <div className="flex items-center gap-2 px-3 border-r border-border">
              <HugeiconsIcon icon={Clock01Icon} size={18} className="text-primary" />
              <span className="font-mono text-lg font-semibold">{formatTime(session.elapsed_seconds)}</span>
              <span className="text-muted-foreground text-sm">/ {session.target_duration_minutes}:00</span>
            </div>
            <div className="flex items-center gap-2">
              {session.status === "running" && (
                <>
                  <Button onClick={handlePause} variant="outline" size="sm">
                    <HugeiconsIcon icon={Pause} size={16} className="mr-1.5" /> Pause
                  </Button>
                  <Button onClick={handleStop} variant="destructive" size="sm">
                    <HugeiconsIcon icon={Square} size={16} className="mr-1.5" /> Stop
                  </Button>
                </>
              )}
              {session.status === "paused" && (
                <>
                  <Button onClick={handleResume} size="sm">
                    <HugeiconsIcon icon={Play} size={16} className="mr-1.5" /> Resume
                  </Button>
                  <Button onClick={handleStop} variant="destructive" size="sm">
                    <HugeiconsIcon icon={Square} size={16} className="mr-1.5" /> Stop
                  </Button>
                </>
              )}
              {session.status === "completed" && (
                <Button asChild size="sm"><Link href="/results">View Results</Link></Button>
              )}
            </div>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Stats Column */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Card className="p-4 border border-border bg-card/50">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Topics</p>
                <p className="text-3xl font-bold text-foreground">{session.topics_completed}</p>
              </Card>
              <Card className="p-4 border border-border bg-card/50">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Avg Mastery</p>
                <p className="text-3xl font-bold text-chart-2">
                  {Object.values(session.topic_mastery).length > 0
                    ? Math.round(Object.values(session.topic_mastery).reduce((a, m) => a + m.score, 0) / Object.values(session.topic_mastery).length)
                    : 0}%
                </p>
              </Card>
            </div>

            <Card className="p-4 border border-border bg-card/50">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Current Phase</p>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  session.current_phase === 'selecting_topic' ? 'bg-primary/10 text-primary' :
                  session.current_phase === 'teaching' ? 'bg-chart-2/10 text-chart-2' :
                  session.current_phase === 'quizzing' ? 'bg-chart-3/10 text-chart-3' :
                  'bg-muted text-muted-foreground'
                }`}>
                  {session.current_phase === 'selecting_topic' ? <HugeiconsIcon icon={Target} size={22} /> :
                   session.current_phase === 'teaching' ? <HugeiconsIcon icon={Book02Icon} size={22} /> :
                   session.current_phase === 'quizzing' ? <HugeiconsIcon icon={Brain} size={22} /> :
                   <HugeiconsIcon icon={TrendingUp} size={22} />}
                </div>
                <div>
                  <p className="font-semibold text-foreground capitalize">{session.current_phase.replace("_", " ")}</p>
                  <p className="text-xs text-muted-foreground">
                    {session.current_phase === 'selecting_topic' ? "Analyzing performance..." :
                     session.current_phase === 'teaching' ? "Explaining concepts..." :
                     session.current_phase === 'quizzing' ? "Verifying understanding..." : "Updating model..."}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-4 border border-border bg-card/50">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total Actions</p>
              <p className="text-3xl font-bold text-foreground">{session.steps.length}</p>
              <p className="text-xs text-muted-foreground">Autonomous decisions</p>
            </Card>
          </div>

          {/* Run Log Column */}
          <div className="lg:col-span-2">
            <Card className="h-[500px] flex flex-col border border-border bg-card/50">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <h2 className="font-semibold text-foreground flex items-center gap-2">
                  <HugeiconsIcon icon={Brain} size={20} className="text-primary" />
                  Thought Stream
                </h2>
                <span className="text-xs font-mono text-muted-foreground flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /> LIVE
                </span>
              </div>

              <div ref={runLogRef} className="flex-1 overflow-y-auto p-4 space-y-3">
                {session.steps.map((step, index) => (
                  <div
                    key={index}
                    className={`group relative pl-6 border-l-2 transition-colors cursor-pointer ${
                      expandedSteps.has(index) ? "border-primary bg-primary/5 rounded-r-lg pb-3" : "border-border hover:border-primary/40"
                    }`}
                    onClick={() => toggleStepExpanded(index)}
                  >
                    <div className={`absolute -left-[7px] top-0 w-3 h-3 rounded-full border-2 bg-background ${
                      expandedSteps.has(index) ? "border-primary" : "border-muted-foreground/40"
                    }`} />
                    <div className="flex items-center gap-2 text-sm">
                      {ACTION_ICONS[step.action]}
                      <span className="font-medium text-foreground">{ACTION_LABELS[step.action] || step.action}</span>
                      <span className="text-xs text-muted-foreground">{formatTimestamp(step.timestamp)}</span>
                      {step.duration_ms && <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded">{step.duration_ms}ms</span>}
                      <HugeiconsIcon icon={ChevronDown} size={14} className={`ml-auto text-muted-foreground transition-transform ${expandedSteps.has(index) ? "rotate-180" : ""}`} />
                    </div>
                    <p className={`text-sm mt-1 ${expandedSteps.has(index) ? "text-foreground" : "text-muted-foreground line-clamp-1"}`}>{step.reasoning}</p>
                    {expandedSteps.has(index) && Object.keys(step.data).length > 0 && (
                      <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-x-auto">{JSON.stringify(step.data, null, 2)}</pre>
                    )}
                  </div>
                ))}
                {session.status === "running" && (
                  <div className="pl-6 border-l-2 border-border py-2 flex items-center gap-2 text-muted-foreground text-sm">
                    <div className="flex gap-1">
                      <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    Processing next action...
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
