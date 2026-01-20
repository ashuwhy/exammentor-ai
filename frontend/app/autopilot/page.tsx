"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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

  Refresh01Icon,
  HelpCircleIcon,
} from "@hugeicons/core-free-icons";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/Card";
import ReactMarkdown from "react-markdown";

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
  
  // Interactive State
  current_content: string | null;
  current_question: Record<string, any> | null;
  awaiting_input: boolean;
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

  const runLogRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const [answering, setAnswering] = useState(false);

  const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
  const [hasPlan, setHasPlan] = useState<boolean>(false);

  // Load study plan
  const getStudyPlan = () => {
    if (typeof window === 'undefined') return null;
    const stored = localStorage.getItem("studyPlan");
    if (!stored) return null;
    try { return JSON.parse(stored); } catch { return null; }
  };

  useEffect(() => { setHasPlan(!!getStudyPlan()); }, []);

  // Poll status
  const pollStatus = useCallback(async () => {
    if (!session || session.status === "completed" || session.status === "idle") return;
    try {
      const res = await fetch(`${API_BASE}/api/autopilot/status/${sessionId}`);
      if (res.ok) {
        const data = await res.json();
        // Only update if state changed significantly or new content available
        setSession((prev) => {
            if (!prev) return data;
            // Simple comparison to avoid unnecessary renders, can be deepened
            if (JSON.stringify(prev.current_question) !== JSON.stringify(data.current_question) ||
                prev.steps.length !== data.steps.length ||
                prev.current_content !== data.current_content ||
                prev.awaiting_input !== data.awaiting_input) {
                return data;
            }
            return prev;
        });
        
        if (runLogRef.current && session?.steps.length !== data.steps.length) {
            runLogRef.current.scrollTop = runLogRef.current.scrollHeight;
        }
        if (data.status === "completed" && pollingRef.current) clearInterval(pollingRef.current);
      }
    } catch (err) { console.error("Polling error:", err); }
  }, [session, sessionId, API_BASE]);

  useEffect(() => {
    if (session?.status === "running") {
      pollingRef.current = setInterval(pollStatus, 1500); // 1.5s poll
    }
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [session?.status, pollStatus]);

  // Actions
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
          duration_minutes: 30, // 30 min full session
        }),
      });
      if (!res.ok) throw new Error("Failed to start autopilot session");
      const data = await res.json();
      setSession({
        session_id: data.session_id, status: data.status, current_phase: "selecting_topic",
        current_topic: null, topics_completed: 0, elapsed_seconds: 0,
        target_duration_minutes: data.target_duration_minutes, topic_mastery: {},
        steps: [], started_at: data.started_at, completed_at: null,
        current_content: null, current_question: null, awaiting_input: false
      });
      await pollStatus();
    } catch (err) { setError(err instanceof Error ? err.message : "Failed to start"); }
    finally { setLoading(false); }
  };

  const handlePause = async () => { try { await fetch(`${API_BASE}/api/autopilot/pause/${sessionId}`, { method: "POST" }); await pollStatus(); } catch (e) { console.error(e); } };
  const handleResume = async () => { try { await fetch(`${API_BASE}/api/autopilot/resume/${sessionId}`, { method: "POST" }); await pollStatus(); } catch (e) { console.error(e); } };
  const handleStop = async () => { try { await fetch(`${API_BASE}/api/autopilot/stop/${sessionId}`, { method: "POST" }); if (pollingRef.current) clearInterval(pollingRef.current); await pollStatus(); } catch (e) { console.error(e); } };

  const handleAnswer = async (index: number) => {
    if (answering) return;
    setAnswering(true);
    try {
        await fetch(`${API_BASE}/api/autopilot/answer/${sessionId}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ answer_index: index }),
        });
        // Optimistically clear waiting state
        if (session) setSession({...session, awaiting_input: false});
        await pollStatus();
    } catch (e) { console.error(e); }
    finally { setAnswering(false); }
  };

  const formatTime = (seconds: number) => `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, "0")}`;
  const formatTimestamp = (ts: string) => new Date(ts).toLocaleTimeString();


  // --- START SCREEN ---
  if (!session) {
    return (
      <div className="min-h-screen">
        <section className="max-w-3xl mx-auto px-6 pt-24 pb-16 text-center">
          <div className="w-16 h-16 rounded-xl bg-primary/10 backdrop-blur-xl border border-primary/20 shadow-[0_0_30px_-10px_rgba(var(--primary),0.3)] flex items-center justify-center mx-auto mb-6">
            <HugeiconsIcon icon={Zap} size={32} className="text-primary" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4 tracking-tight">Autopilot Mode</h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-10">
            Let the AI take full control. It will autonomously{" "}
            <span className="text-primary font-medium">select topics</span>,{" "}
            <span className="text-chart-2 font-medium">teach micro-lessons</span>, and{" "}
            <span className="text-chart-3 font-medium">fix misconceptions</span>.
          </p>

          <div className="grid md:grid-cols-3 gap-4 mb-10 text-left">
            <Card className="p-5 border border-border bg-card/50 hover:border-primary/30 transition-colors backdrop-blur-sm">
              <div className="w-10 h-10 rounded-lg bg-primary/10 backdrop-blur-md border border-primary/10 flex items-center justify-center mb-3 text-primary">
                 <HugeiconsIcon icon={Target} size={20} />
              </div>
              <p className="font-semibold text-foreground text-sm mb-1">AI Topic Selection</p>
              <p className="text-xs text-muted-foreground leading-relaxed">Dynamically chooses what to study next based on your mastery gaps.</p>
            </Card>
            <Card className="p-5 border border-border bg-card/50 hover:border-chart-2/30 transition-colors backdrop-blur-sm">
              <div className="w-10 h-10 rounded-lg bg-chart-2/10 backdrop-blur-md border border-chart-2/10 flex items-center justify-center mb-3 text-chart-2">
                 <HugeiconsIcon icon={Book02Icon} size={20} />
              </div>
              <p className="font-semibold text-foreground text-sm mb-1">Micro-Lessons</p>
              <p className="text-xs text-muted-foreground leading-relaxed">Streams concise, 2-minute explanations tailored to you.</p>
            </Card>
            <Card className="p-5 border border-border bg-card/50 hover:border-chart-3/30 transition-colors backdrop-blur-sm">
              <div className="w-10 h-10 rounded-lg bg-chart-3/10 backdrop-blur-md border border-chart-3/10 flex items-center justify-center mb-3 text-chart-3">
                 <HugeiconsIcon icon={Refresh01Icon} size={20} />
              </div>
              <p className="font-semibold text-foreground text-sm mb-1">Self-Correction</p>
              <p className="text-xs text-muted-foreground leading-relaxed">Detects mistakes and pauses to fix misconceptions instantly.</p>
            </Card>
          </div>
          
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 p-3 rounded-lg mb-6 flex items-center justify-center gap-2 text-sm text-destructive">
              <HugeiconsIcon icon={AlertTriangle} size={18} /> {error}
            </div>
          )}

          {!hasPlan ? (
            <Button asChild size="md"><Link href="/onboarding">Generate Study Plan <HugeiconsIcon icon={Target} size={18} className="ml-2" /></Link></Button>
          ) : (
            <Button onClick={handleStart} disabled={loading} size="md">
              {loading ? "Initializing..." : <>Start Session <HugeiconsIcon icon={Play} size={18} className="ml-2" /></>}
            </Button>
          )}
        </section>
      </div>
    );
  }

  // --- INTERACTIVE SESSION ---
  return (
    <div className="min-h-screen pb-12">
      <div className="max-w-7xl mx-auto px-4 pt-6">
        
        {/* TOP HEADER */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 sticky top-0 bg-background/95 backdrop-blur-sm z-10 py-4 border-b border-border/40">
           <div>
             <h1 className="text-xl font-bold flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse"/>
                Autopilot Session
                <span className="text-xs font-mono font-normal bg-muted px-2 py-0.5 rounded text-muted-foreground">
                    {session.status.toUpperCase()}
                </span>
             </h1>
             <p className="text-sm text-muted-foreground">
                {session.current_topic ? `Current Topic: ${session.current_topic}` : "AI is planning next step..."}
             </p>
           </div>
           
           <div className="flex items-center gap-3">
              <div className="px-3 py-1 bg-card border rounded-md flex items-center gap-2 font-mono text-sm">
                <HugeiconsIcon icon={Clock01Icon} size={14} className="text-primary" />
                {formatTime(session.elapsed_seconds)} / {session.target_duration_minutes}:00
              </div>
              {session.status === "running" ? (
                  <Button size="sm" variant="outline" onClick={handlePause}><HugeiconsIcon icon={Pause} size={14} className="mr-1"/> Pause</Button>
              ) : (
                  <Button size="sm" onClick={handleResume}><HugeiconsIcon icon={Play} size={14} className="mr-1"/> Resume</Button>
              )}
              <Button size="sm" variant="destructive" onClick={handleStop}><HugeiconsIcon icon={Square} size={14} className="mr-1"/> Stop</Button>
           </div>
        </div>

        <div className="grid lg:grid-cols-12 gap-6 h-[calc(100vh-140px)]">
            
            {/* MAIN CONTENT AREA (8 cols) */}
            <div className="lg:col-span-8 flex flex-col gap-4 h-full">
                
                {/* DYNAMIC VIEWPORT */}
                <Card className="flex-1 border border-border bg-card/60 relative overflow-hidden flex flex-col">
                    {/* Phase Badge */}
                    <div className="absolute top-4 right-4 z-20">
                         <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border backdrop-blur-md shadow-sm ${
                             session.current_phase === 'teaching' ? 'bg-chart-2/20 border-chart-2/30 text-chart-2' :
                             session.current_phase === 'quizzing' ? 'bg-chart-3/20 border-chart-3/30 text-chart-3' :
                             'bg-primary/20 border-primary/30 text-primary'
                         }`}>
                             {session.current_phase.replace("_", " ")}
                         </span>
                    </div>

                    <div className="p-8 h-full overflow-y-auto">
                        
                        {/* 1. TEACHING VIEW */}
                        {session.current_phase === 'teaching' && session.current_content && (
                            <div className="max-w-3xl mx-auto animate-in fade-in duration-500">
                                <div className="w-12 h-12 rounded-xl bg-chart-2/10 flex items-center justify-center mb-6">
                                    <HugeiconsIcon icon={Book02Icon} size={28} className="text-chart-2" />
                                </div>
                                <h2 className="text-2xl font-bold mb-6">Micro-Lesson: {session.current_topic}</h2>
                                <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none text-muted-foreground leading-relaxed">
                                    <ReactMarkdown>{session.current_content}</ReactMarkdown>
                                </div>
                                <div className="mt-8 flex justify-center">
                                    <p className="text-xs text-muted-foreground animate-pulse">Wait for quiz...</p>
                                </div>
                            </div>
                        )}

                        {/* 2. QUIZ VIEW */}
                        {session.current_phase === 'quizzing' && session.current_question && (
                            <div className="max-w-2xl mx-auto animate-in zoom-in-95 duration-300">
                                 <div className="w-12 h-12 rounded-xl bg-chart-3/10 flex items-center justify-center mb-6">
                                    <HugeiconsIcon icon={HelpCircleIcon} size={28} className="text-chart-3" />
                                </div>
                                <h3 className="text-xl font-semibold mb-6 leading-relaxed">
                                    {session.current_question.text}
                                </h3>
                                
                                <div className="space-y-3">
                                    {(session.current_question.options as string[]).map((option, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => handleAnswer(idx)}
                                            disabled={!session.awaiting_input || answering}
                                            className={`w-full p-4 rounded-xl border text-left transition-all duration-200 ${
                                                !session.awaiting_input 
                                                ? "opacity-50 cursor-not-allowed border-border" 
                                                : "hover:border-primary hover:bg-primary/5 active:scale-[0.99] border-border bg-card"
                                            }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-6 h-6 rounded-full border border-muted-foreground/30 flex items-center justify-center text-xs font-mono">
                                                    {String.fromCharCode(65 + idx)}
                                                </div>
                                                <span className="text-foreground">{option}</span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                                {answering && <p className="text-center text-sm text-muted-foreground mt-4 animate-pulse">Verifying answer...</p>}
                            </div>
                        )}

                        {/* 3. DEFAULT/TRANSITION VIEW */}
                        {(!session.current_content && !session.current_question) && (
                            <div className="h-full flex flex-col items-center justify-center text-center opacity-60">
                                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 animate-bounce">
                                    <HugeiconsIcon icon={Brain} size={32} className="text-primary" />
                                </div>
                                <h3 className="text-lg font-medium">Thinking...</h3>
                                <p className="text-sm">Analysing your progress & selecting next topic</p>
                            </div>
                        )}
                    </div>
                </Card>
            </div>

            {/* SIDEBAR LOG (4 cols) */}
            <div className="lg:col-span-4 h-full">
                <Card className="h-full flex flex-col border border-border bg-card/60">
                    <div className="p-4 border-b border-border flex items-center justify-between bg-card/40">
                        <h2 className="font-semibold text-sm flex items-center gap-2">
                           <HugeiconsIcon icon={Brain} size={16} className="text-primary" /> Thought Stream
                        </h2>
                        <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Live Log</span>
                    </div>
                    <div ref={runLogRef} className="flex-1 overflow-y-auto p-4 space-y-4">
                        {session.steps.map((step, index) => (
                            <div key={index} className="relative pl-4 border-l border-border pb-1">
                                <div className="absolute -left-[5px] top-1 w-2.5 h-2.5 rounded-full border border-border bg-background flex items-center justify-center">
                                    <div className={`w-1 h-1 rounded-full ${ step.action.includes('misconception') ? 'bg-destructive' : 'bg-primary' }`}></div>
                                </div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs font-semibold text-foreground flex items-center gap-1.5 ">
                                       {ACTION_ICONS[step.action]} {ACTION_LABELS[step.action] || step.action}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground ml-auto">{formatTimestamp(step.timestamp)}</span>
                                </div>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    {step.reasoning}
                                </p>
                                {step.action === 'misconception_detected' && (
                                   <div className="mt-2 p-2 rounded bg-destructive/10 border border-destructive/20 text-xs text-destructive">
                                        Misconception detected! Pausing for remediation.
                                   </div> 
                                )}
                            </div>
                        ))}
                    </div>
                </Card>
            </div>

        </div>
      </div>
    </div>
  );
}
