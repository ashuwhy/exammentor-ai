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
    <div className="min-h-screen relative z-10">
      {/* Hero Section */}
      <section className="max-w-4xl mx-auto px-6 pt-24 pb-16 text-center">
        <div className="inline-flex items-center gap-2 text-muted-foreground text-sm font-medium mb-6">
          <Image src="/gemini.png" alt="Gemini" width={20} height={20} />
          Powered by Gemini 3 Pro &amp; Flash
        </div>
        
        <h1 className="text-5xl md:text-6xl font-bold text-foreground mb-6 tracking-tight">
          ExamMentor AI
        </h1>
        
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-4">
          <span className="text-primary font-semibold">Whole-Syllabus Reasoning Engine</span> with
          autonomous learning, self-correcting plans, and multimodal tutoring
        </p>
        
        <p className="text-sm text-muted-foreground mb-12">
          Not a prompt wrapper. A true <span className="text-primary">Action Era</span> AI that teaches itself.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Button asChild variant="premium" size="lg">
            <Link href="/autopilot">
              Autopilot Mode
              <HugeiconsIcon icon={Sparkles} size={24} color="currentColor" strokeWidth={1.5} className="w-6 h-6 ml-2" />
            </Link>
          </Button>
          <Button asChild size="lg">
            <Link href="/onboarding">
              Get Started
              <HugeiconsIcon icon={ArrowRight} size={24} color="currentColor" strokeWidth={1.5} className="w-6 h-6 ml-2" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/plan">
              <HugeiconsIcon icon={Calendar03Icon} size={24} color="currentColor" strokeWidth={1.5} className="w-6 h-6 mr-2" />
              View My Plan
            </Link>
          </Button>
        </div>
      </section>

      {/* Action Era Features - The key differentiators */}
      <section className="max-w-5xl mx-auto px-6 pb-16">
        <div className="text-center mb-8">
          <span className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-lg text-sm font-medium backdrop-blur-lg">
            <HugeiconsIcon icon={Sparkles} size={20} color="currentColor" strokeWidth={1.5} className="w-5 h-5" />
            Action Era Features
          </span>
        </div>
        
        <div className="grid md:grid-cols-3 gap-6">
          <Card variant="glass" className="p-6 border-primary/20">
            <div className="w-10 h-10 rounded-lg bg-chart-3/20 text-chart-3 flex items-center justify-center mb-4 backdrop-blur-lg">
              <HugeiconsIcon icon={Zap} size={24} color="currentColor" strokeWidth={1.5} className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Autopilot Mode
            </h3>
            <p className="text-sm text-muted-foreground mb-3">
              30-minute autonomous sessions. AI picks topics, teaches, quizzes, and adapts—without clicking.
            </p>
            <Link href="/autopilot" className="text-primary text-sm font-medium">
              Try Autopilot →
            </Link>
          </Card>

          <Card variant="glass" className="p-6 border-primary/20">
            <div className="w-10 h-10 rounded-lg bg-chart-2/20 text-chart-2 flex items-center justify-center mb-4 backdrop-blur-lg">
              <HugeiconsIcon icon={Refresh01Icon} size={24} color="currentColor" strokeWidth={1.5} className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Self-Correcting Plans
            </h3>
            <p className="text-sm text-muted-foreground mb-3">
              Watch the AI verify, critique, and fix its own study plans. See v1 → v2 diffs live.
            </p>
            <Link href="/onboarding" className="text-chart-2 text-sm font-medium">
              Generate Plan →
            </Link>
          </Card>

          <Card variant="glass" className="p-6 border-primary/20">
            <div className="w-10 h-10 rounded-lg bg-chart-1/20 text-chart-1 flex items-center justify-center mb-4 backdrop-blur-lg">
              <HugeiconsIcon icon={Camera} size={24} color="currentColor" strokeWidth={1.5} className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Diagram Quiz
            </h3>
            <p className="text-sm text-muted-foreground mb-3">
              Upload a diagram. Get quiz questions that reference &quot;the top-left section...&quot;
            </p>
            <span className="text-chart-1 text-sm font-medium">
              Multimodal-First
            </span>
          </Card>
        </div>
      </section>

      {/* Original Features Grid */}
      <section className="max-w-5xl mx-auto px-6 pb-16">
        <h2 className="text-xl font-semibold text-foreground mb-6 text-center">
          Core Capabilities
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          <Card variant="glass" className="p-6">
            <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-4">
              <HugeiconsIcon icon={Target} size={20} color="currentColor" strokeWidth={1.5} className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Personalized Plans
            </h3>
            <p className="text-sm text-muted-foreground">
              AI-generated study schedules optimized for your exam type, timeline, and learning goals
            </p>
          </Card>

          <Card variant="glass" className="p-6">
            <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-4">
              <HugeiconsIcon icon={Brain01Icon} size={20} color="currentColor" strokeWidth={1.5} className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Interactive Tutoring
            </h3>
            <p className="text-sm text-muted-foreground">
              Step-by-step explanations with analogies, real-world examples, and common pitfalls
            </p>
          </Card>

          <Card variant="glass" className="p-6">
            <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-4">
              <HugeiconsIcon icon={TrendingUp} size={20} color="currentColor" strokeWidth={1.5} className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Misconception Busting
            </h3>
            <p className="text-sm text-muted-foreground">
              Detects wrong reasoning, provides counter-examples, and gives redemption questions
            </p>
          </Card>
        </div>
      </section>

      {/* How It Works */}
      <section className="max-w-5xl mx-auto px-6 pb-16">
        <Card variant="soft" className="p-8">
          <h2 className="text-2xl font-semibold text-foreground mb-8 text-center">
            How It Works
          </h2>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { step: 1, title: "Choose Your Exam", desc: "NEET, JEE, UPSC, CAT, or custom" },
              { step: 2, title: "AI Generates Plan", desc: "Self-correcting verification loop" },
              { step: 3, title: "Learn & Practice", desc: "Streaming tutoring + adaptive quizzes" },
              { step: 4, title: "Track Mastery", desc: "Misconception history + trajectory" },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center mx-auto mb-4 font-bold">
                  {item.step}
                </div>
                <h4 className="font-medium text-foreground mb-1">{item.title}</h4>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </Card>
      </section>

      {/* Technical Features */}
      <section className="max-w-5xl mx-auto px-6 pb-24">
        <div className="grid md:grid-cols-4 gap-4">
          <Card variant="default" className="p-4 flex items-center gap-4">
            <HugeiconsIcon icon={CheckmarkCircle02Icon} size={20} color="currentColor" strokeWidth={1.5} className="w-5 h-5 text-primary flex-shrink-0" />
            <div>
              <p className="font-medium text-foreground text-sm">Multi-Agent AI</p>
              <p className="text-xs text-muted-foreground">5 specialized agents</p>
            </div>
          </Card>
          <Card variant="default" className="p-4 flex items-center gap-4">
            <HugeiconsIcon icon={CheckmarkCircle02Icon} size={20} color="currentColor" strokeWidth={1.5} className="w-5 h-5 text-primary flex-shrink-0" />
            <div>
              <p className="font-medium text-foreground text-sm">Long-Context</p>
              <p className="text-xs text-muted-foreground">Full syllabus reasoning</p>
            </div>
          </Card>
          <Card variant="default" className="p-4 flex items-center gap-4">
            <HugeiconsIcon icon={CheckmarkCircle02Icon} size={20} color="currentColor" strokeWidth={1.5} className="w-5 h-5 text-primary flex-shrink-0" />
            <div>
              <p className="font-medium text-foreground text-sm">Streaming</p>
              <p className="text-xs text-muted-foreground">Real-time explanations</p>
            </div>
          </Card>
          <Card variant="default" className="p-4 flex items-center gap-4">
            <HugeiconsIcon icon={CheckmarkCircle02Icon} size={20} color="currentColor" strokeWidth={1.5} className="w-5 h-5 text-primary flex-shrink-0" />
            <div>
              <p className="font-medium text-foreground text-sm">Supabase</p>
              <p className="text-xs text-muted-foreground">Persistent sessions</p>
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
}
