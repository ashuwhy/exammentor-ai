"use client";

import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { 
  ChevronRight, 
  Book02Icon, 
  Target, 
  Calendar03Icon, 
  Sparkles, 
  AlertCircle,
  Stethoscope,
  Zap,
  Landmark,
  BarChart,
  CheckmarkCircle02Icon,
  AlertTriangle,
  Refresh01Icon
} from "@hugeicons/core-free-icons";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/Card";

interface VerificationStep {
  version: number;
  status: 'pending' | 'verifying' | 'failed' | 'passed';
  critique?: string;
  missingTopics?: string[];
}

const EXAM_TYPES = [
  { id: "neet", name: "NEET", description: "Medical Entrance", icon: <HugeiconsIcon icon={Stethoscope} size={48} color="currentColor" strokeWidth={1.5} className="!w-6 !h-6 text-primary" /> },
  { id: "jee", name: "JEE", description: "Engineering Entrance", icon: <HugeiconsIcon icon={Zap} size={48} color="currentColor" strokeWidth={1.5} className="!w-6 !h-6 text-chart-1" /> },
  { id: "upsc", name: "UPSC", description: "Civil Services", icon: <HugeiconsIcon icon={Landmark} size={48} color="currentColor" strokeWidth={1.5} className="!w-6 !h-6 text-chart-2" /> },
  { id: "cat", name: "CAT", description: "MBA Entrance", icon: <HugeiconsIcon icon={BarChart} size={48} color="currentColor" strokeWidth={1.5} className="!w-6 !h-6 text-chart-3" /> },
];

const STEPS = ["Exam Type", "Your Goal", "Timeline"];

const EXAM_PLACEHOLDERS: Record<string, string> = {
  neet: "e.g., I want to score 650+ in NEET and master Organic Chemistry...",
  jee: "e.g., I want to score 95+ percentile in JEE and master Physics Mechanics...",
  upsc: "e.g., I want to clear UPSC Prelims and master Indian History...",
  cat: "e.g., I want to score 99+ percentile in CAT and master Quantitative Aptitude...",
};

const SYLLABI: Record<string, string> = {
  neet: `
    NEET Biology Syllabus:
    1. Cell Biology - Cell structure, cell organelles, cell division (mitosis, meiosis)
    2. Genetics - Mendelian genetics, molecular biology, DNA replication, transcription, translation
    3. Human Physiology - Digestion, Circulation, Respiration, Excretion, Neural control
    4. Plant Physiology - Photosynthesis, Respiration, Plant hormones, Mineral nutrition
    5. Ecology - Ecosystems, Biodiversity, Environmental issues, Population dynamics
    6. Evolution - Origin of life, Theories of evolution, Human evolution
    7. Biotechnology - Recombinant DNA, Applications in medicine and agriculture
    8. Reproduction - Human reproduction, Plant reproduction, Reproductive health
  `,
  jee: `
    JEE Physics & Chemistry Syllabus:
    Physics:
    1. Mechanics - Laws of motion, Work-Energy, Rotational dynamics
    2. Electromagnetism - Electrostatics, Magnetism, Electromagnetic induction
    3. Optics - Ray optics, Wave optics, Modern physics
    4. Thermodynamics - Heat, Kinetic theory, Laws of thermodynamics
    
    Chemistry:
    1. Physical Chemistry - Atomic structure, Chemical bonding, Thermodynamics
    2. Organic Chemistry - Hydrocarbons, Functional groups, Reaction mechanisms
    3. Inorganic Chemistry - Periodic table, Coordination compounds, Metallurgy
  `,
  upsc: `
    UPSC Civil Services Syllabus:
    1. History - Ancient, Medieval, Modern India, World History
    2. Geography - Physical, Indian, World Geography
    3. Polity - Constitution, Governance, International Relations
    4. Economy - Indian Economy, Economic Development
    5. Environment - Ecology, Biodiversity, Climate Change
    6. Science & Technology - Current developments, Space, IT
    7. Ethics - Aptitude, Integrity, Case Studies
  `,
  cat: `
    CAT MBA Entrance Syllabus:
    1. Quantitative Ability - Arithmetic, Algebra, Geometry, Number Systems
    2. Verbal Ability - Reading Comprehension, Grammar, Vocabulary
    3. Data Interpretation - Tables, Graphs, Charts, Caselets
    4. Logical Reasoning - Puzzles, Arrangements, Logical Deductions
  `,
};

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [examType, setExamType] = useState("");
  const [goal, setGoal] = useState("");
  const [days, setDays] = useState(7);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzeStatus, setAnalyzeStatus] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [verificationSteps, setVerificationSteps] = useState<VerificationStep[]>([]);
  const [currentPhase, setCurrentPhase] = useState<'generating' | 'verifying' | 'fixing' | 'complete'>('generating');

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
    setVerificationSteps([]);
    setCurrentPhase('generating');
    setAnalyzeStatus("Initializing AI agent...");

    try {
      const syllabusText = SYLLABI[examType] || SYLLABI.neet;
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/api/plan/stream-verified`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          syllabus_text: syllabusText,
          exam_type: examType,
          goal: goal,
          days: days,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader available");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || ""; // Keep incomplete line

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const data = JSON.parse(line);
            
            if (data.type === 'status') {
              setAnalyzeStatus(data.message);
            } else if (data.type === 'draft') {
              // Add new version entry
              setVerificationSteps(prev => {
                // Check if version already exists to avoid duplicates
                if (prev.find(v => v.version === data.version)) return prev;
                return [...prev, { version: data.version, status: 'verifying' }];
              });
              setCurrentPhase('verifying');
            } else if (data.type === 'verification') {
              // Update verification result
              setVerificationSteps(prev => prev.map(v => {
                if (v.version === data.version) {
                  const isValid = data.result.is_valid;
                  return {
                    ...v,
                    status: isValid ? 'passed' : 'failed',
                    critique: data.result.critique,
                    missingTopics: data.result.missing_topics
                  };
                }
                return v;
              }));
              
              if (!data.result.is_valid) {
                 setCurrentPhase('fixing');
                 setAnalyzeStatus("AI is fixing the plan based on critique...");
                 // Ensure next version placeholder is added soon by 'draft' event
              } else {
                 setCurrentPhase('complete');
              }
            } else if (data.type === 'complete') {
              setAnalyzeStatus("Plan verified successfully!");
              const result = data.final_result;
              
              // Store plan
              if (result.final_plan) {
                localStorage.setItem("studyPlan", JSON.stringify(result.final_plan));
                localStorage.setItem("examType", examType);
                localStorage.setItem("goal", goal);
                localStorage.setItem("days", days.toString());
                if (result.versions) {
                  localStorage.setItem("planVersions", JSON.stringify(result.versions));
                }
              }
              
              // Redirect
              setTimeout(() => {
                router.push("/plan");
              }, 1000);
            }
          } catch (e) {
            console.error("Stream parse error", e);
          }
        }
      }

    } catch (err) {
      console.error(err);
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
      <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-6">
        <div className="relative z-10 w-full max-w-lg">
          <div className="text-center space-y-8 animate-fade-in">
            {/* Main Spinner */}
            <div className="relative mb-4">
              <div className="w-24 h-24 border-4 border-primary/20 rounded-full animate-spin border-t-primary mx-auto" />
              <HugeiconsIcon 
                icon={currentPhase === 'complete' ? CheckmarkCircle02Icon : Sparkles} 
                size={32} 
                color="currentColor" 
                strokeWidth={1.5} 
                className={`w-8 h-8 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 ${currentPhase === 'complete' ? 'text-chart-2' : 'text-primary animate-pulse'}`} 
              />
            </div>
            
            <p className="text-xl text-foreground font-medium">
              {analyzeStatus}
            </p>

            {/* Self-Correction Steps */}
            {verificationSteps.length > 0 && (
              <Card variant="glass" className="p-6 text-left space-y-4 animate-fade-in">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <HugeiconsIcon icon={Refresh01Icon} size={16} color="currentColor" strokeWidth={1.5} className="w-4 h-4" />
                  AI Self-Correction Log
                </div>
                
                <div className="space-y-3">
                  {verificationSteps.map((vs, i) => (
                    <div key={vs.version} className="space-y-2">
                      <div className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          vs.status === 'passed' ? 'bg-chart-2/20 text-chart-2' :
                          vs.status === 'failed' ? 'bg-destructive/20 text-destructive' :
                          vs.status === 'verifying' ? 'bg-primary/20 text-primary animate-pulse' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          {vs.status === 'passed' ? (
                            <HugeiconsIcon icon={CheckmarkCircle02Icon} size={14} color="currentColor" strokeWidth={2} />
                          ) : vs.status === 'failed' ? (
                            <HugeiconsIcon icon={AlertTriangle} size={14} color="currentColor" strokeWidth={2} />
                          ) : (
                            `v${vs.version}`
                          )}
                        </div>
                        <span className={`text-sm font-medium ${
                          vs.status === 'passed' ? 'text-chart-2' :
                          vs.status === 'failed' ? 'text-destructive' :
                          'text-foreground'
                        }`}>
                          {vs.status === 'passed' ? 'Plan Verified' :
                           vs.status === 'failed' ? 'Issues Found' :
                           vs.status === 'verifying' ? 'Verifying...' :
                           `Draft v${vs.version}`}
                        </span>
                      </div>
                      
                      {vs.status === 'failed' && vs.critique && (
                        <div className="ml-9 p-3 rounded-lg bg-destructive/5 border border-destructive/20 transition-premium">
                          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                            {vs.critique}
                          </p>
                          {vs.missingTopics && vs.missingTopics.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {vs.missingTopics.slice(0, 3).map((topic, ti) => (
                                <span key={ti} className="text-xs px-2 py-0.5 rounded-full bg-destructive/10 text-destructive">
                                  {topic}
                                </span>
                              ))}
                              {vs.missingTopics.length > 3 && (
                                <span className="text-xs text-muted-foreground">+{vs.missingTopics.length - 3} more</span>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                      
                      {i < verificationSteps.length - 1 && vs.status === 'failed' && (
                        <div className="ml-9 flex items-center gap-2 text-xs text-primary">
                          <HugeiconsIcon icon={Refresh01Icon} size={12} color="currentColor" strokeWidth={2} className="w-3 h-3" />
                          AI is fixing issues...
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {error && (
              <Card variant="elevated" className="p-4 bg-destructive/10 border-destructive/30">
                <div className="flex items-center gap-2 text-destructive">
                  <HugeiconsIcon icon={AlertCircle} size={20} color="currentColor" strokeWidth={1.5} className="w-5 h-5" />
                  <p className="text-sm">{error}</p>
                </div>
                <Button
                  onClick={() => {
                    setIsAnalyzing(false);
                    setError(null);
                    setVerificationSteps([]);
                  }}
                  variant="default"
                  size="sm"
                  className="mt-3"
                >
                  Try Again
                </Button>
              </Card>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="relative z-10 p-6">
        <div className="max-w-2xl mx-auto pt-12 animate-fade-in">
        {/* Stepper */}
        <div className="flex items-center justify-center gap-2 mb-12">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-premium ${
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
        <Card variant="elevated" className="p-8 animate-slide-up">
          {step === 0 && (
            <div className="space-y-6">
              <div className="text-center">
                <HugeiconsIcon icon={Book02Icon} size={48} color="currentColor" strokeWidth={1.5} className="w-12 h-12 text-primary mx-auto mb-4" />
                <h1 className="text-3xl font-semibold text-foreground mb-2">
                  What exam are you preparing for?
                </h1>
                <p className="text-muted-foreground">
                  We&apos;ll customize your study plan accordingly
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {EXAM_TYPES.map((exam) => (
                  <Button
                    key={exam.id}
                    variant="outline"
                    onClick={() => setExamType(exam.id)}
                    className={`h-auto p-6 flex flex-col items-start gap-2 transition-all ${
                      examType === exam.id
                        ? "border-primary bg-accent ring-2 ring-primary/20"
                        : "border-border"
                    }`}
                  >
                    <div className="mb-2">{exam.icon}</div>
                    <h3 className="text-xl font-semibold text-foreground">
                      {exam.name}
                    </h3>
                    <p className="text-muted-foreground text-sm whitespace-normal">{exam.description}</p>
                  </Button>
                ))}
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center">
                <HugeiconsIcon icon={Target} size={48} color="currentColor" strokeWidth={1.5} className="w-12 h-12 text-primary mx-auto mb-4" />
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
                placeholder={examType ? EXAM_PLACEHOLDERS[examType] || "e.g., I want to achieve my goals..." : "Select an exam type first..."}
                className="input-clean w-full h-32 resize-none"
              />
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center">
                <HugeiconsIcon icon={Calendar03Icon} size={48} color="currentColor" strokeWidth={1.5} className="w-12 h-12 text-primary mx-auto mb-4" />
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
          <Button
            onClick={handleNext}
            disabled={!canProceed}
            variant={canProceed ? "premium" : "secondary"}
            size="xl"
            className="w-full mt-8"
          >
            {step === STEPS.length - 1 ? "Generate My Plan" : "Continue"}
            <HugeiconsIcon icon={ChevronRight} size={20} color="currentColor" strokeWidth={1.5} className="w-5 h-5" />
          </Button>
        </Card>
        </div>
      </div>
    </div>
  );
}
