"use client";

import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Target,
  Brain01Icon,
  TrendingUp,
  ArrowRight,
  Calendar03Icon,
  CheckmarkCircle02Icon,
  Zap,
  Refresh01Icon,
  Camera,
  Sparkles
} from "@hugeicons/core-free-icons";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/button";
import Image from "next/image";

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="max-w-4xl mx-auto px-6 pt-24 pb-12 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 text-muted-foreground text-sm font-medium mb-6 bg-card/50 px-4 py-1.5 rounded-full border border-border backdrop-blur-md">
          <Image src="/gemini.png" alt="Gemini" width={18} height={18} />
          Powered by Gemini 3 Pro &amp; Flash
        </div>
        
        <h1 className="text-5xl md:text-6xl font-bold text-foreground mb-5 tracking-tight">
          ExamMentor AI
        </h1>
        
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-3">
          <span className="text-primary font-semibold">Whole-Syllabus Reasoning Engine</span> with
          autonomous learning, self-correcting plans, and multimodal tutoring
        </p>
        
        <p className="text-sm text-muted-foreground/70 mb-10">
          Not a prompt wrapper. A true <span className="text-primary">Action Era</span> AI that teaches itself.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
          <Button asChild size="md">
            <Link href="/autopilot">
              <HugeiconsIcon icon={Sparkles} size={18} className="mr-2" />
              Autopilot Mode
            </Link>
          </Button>
          <Button asChild variant="secondary" size="md">
            <Link href="/onboarding">
              Get Started
              <HugeiconsIcon icon={ArrowRight} size={18} className="ml-2" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="md">
            <Link href="/plan">
              <HugeiconsIcon icon={Calendar03Icon} size={18} className="mr-2" />
              My Plan
            </Link>
          </Button>
        </div>
      </section>

      {/* Action Era Features */}
      <section className="max-w-5xl mx-auto px-6 pb-12">
        <div className="text-center mb-6">
          <span className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1.5 rounded-lg text-xs font-medium border border-primary/20 backdrop-blur-md">
            <HugeiconsIcon icon={Sparkles} size={14} />
            Action Era Features
          </span>
        </div>
        
        <div className="grid md:grid-cols-3 gap-4">
          <Card className="p-5 border border-border bg-card/50 hover:border-primary/40 transition-colors">
            <div className="w-9 h-9 rounded-lg bg-chart-3/10 text-chart-3 flex items-center justify-center mb-3">
              <HugeiconsIcon icon={Zap} size={20} />
            </div>
            <h3 className="text-base font-semibold text-foreground mb-1">Autopilot Mode</h3>
            <p className="text-sm text-muted-foreground mb-2">
              30-minute autonomous sessions. AI picks topics, teaches, and adapts.
            </p>
            <Link href="/autopilot" className="text-primary text-xs font-medium hover:underline">
              Try Autopilot →
            </Link>
          </Card>

          <Card className="p-5 border border-border bg-card/50 hover:border-chart-2/40 transition-colors">
            <div className="w-9 h-9 rounded-lg bg-chart-2/10 text-chart-2 flex items-center justify-center mb-3">
              <HugeiconsIcon icon={Refresh01Icon} size={20} />
            </div>
            <h3 className="text-base font-semibold text-foreground mb-1">Self-Correcting Plans</h3>
            <p className="text-sm text-muted-foreground mb-2">
              Watch the AI verify and fix its own study plans in real-time.
            </p>
            <Link href="/onboarding" className="text-chart-2 text-xs font-medium hover:underline">
              Generate Plan →
            </Link>
          </Card>

          <Card className="p-5 border border-border bg-card/50 hover:border-chart-1/40 transition-colors">
            <div className="w-9 h-9 rounded-lg bg-chart-1/10 text-chart-1 flex items-center justify-center mb-3">
              <HugeiconsIcon icon={Camera} size={20} />
            </div>
            <h3 className="text-base font-semibold text-foreground mb-1">Diagram Quiz</h3>
            <p className="text-sm text-muted-foreground mb-2">
              Upload diagrams. Get spatial questions like &quot;the top-left section...&quot;
            </p>
            <span className="text-chart-1 text-xs font-medium">Multimodal-First</span>
          </Card>
        </div>
      </section>

      {/* Core Capabilities */}
      <section className="max-w-5xl mx-auto px-6 pb-12">
        <h2 className="text-lg font-semibold text-foreground mb-4 text-center">Core Capabilities</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <Card className="p-5 border border-border bg-card/50">
            <div className="w-9 h-9 rounded-lg bg-muted text-foreground flex items-center justify-center mb-3">
              <HugeiconsIcon icon={Target} size={18} />
            </div>
            <h3 className="text-base font-semibold text-foreground mb-1">Personalized Plans</h3>
            <p className="text-sm text-muted-foreground">
              AI-generated study schedules for your exam, timeline, and goals
            </p>
          </Card>

          <Card className="p-5 border border-border bg-card/50">
            <div className="w-9 h-9 rounded-lg bg-muted text-foreground flex items-center justify-center mb-3">
              <HugeiconsIcon icon={Brain01Icon} size={18} />
            </div>
            <h3 className="text-base font-semibold text-foreground mb-1">Interactive Tutoring</h3>
            <p className="text-sm text-muted-foreground">
              Step-by-step explanations with analogies and real-world examples
            </p>
          </Card>

          <Card className="p-5 border border-border bg-card/50">
            <div className="w-9 h-9 rounded-lg bg-muted text-foreground flex items-center justify-center mb-3">
              <HugeiconsIcon icon={TrendingUp} size={18} />
            </div>
            <h3 className="text-base font-semibold text-foreground mb-1">Misconception Busting</h3>
            <p className="text-sm text-muted-foreground">
              Detects wrong reasoning and gives redemption questions
            </p>
          </Card>
        </div>
      </section>

      {/* How It Works */}
      <section className="max-w-5xl mx-auto px-6 pb-12">
        <Card className="p-8 border border-border bg-card/50">
          <h2 className="text-xl font-semibold text-foreground mb-8 text-center">How It Works</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { step: 1, title: "Choose Exam", desc: "NEET, JEE, UPSC, CAT" },
              { step: 2, title: "AI Plans", desc: "Self-correcting loop" },
              { step: 3, title: "Learn", desc: "Streaming + quizzes" },
              { step: 4, title: "Track", desc: "Mastery trajectory" },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center mx-auto mb-3 text-base font-bold">
                  {item.step}
                </div>
                <h4 className="font-semibold text-foreground text-base mb-1">{item.title}</h4>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </Card>
      </section>

      {/* Technical Features */}
      <section className="max-w-5xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { title: "Multi-Agent AI", desc: "5 specialized agents" },
            { title: "Long-Context", desc: "Full syllabus reasoning" },
            { title: "Streaming", desc: "Real-time explanations" },
            { title: "Supabase", desc: "Persistent sessions" },
          ].map((item) => (
            <Card key={item.title} className="p-3 flex items-center gap-3 border border-border bg-card/50">
              <HugeiconsIcon icon={CheckmarkCircle02Icon} size={16} className="text-primary flex-shrink-0" />
              <div>
                <p className="font-medium text-foreground text-sm">{item.title}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
