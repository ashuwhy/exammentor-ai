"use client";

import { useState, useEffect } from "react";
import {
  BookOpen,
  MessageSquare,
  Send,
  Lightbulb,
  AlertTriangle,
  ChevronRight,
  FileText,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

// Mock tutor response
const MOCK_EXPLANATION = {
  topic: "Photosynthesis",
  intuition:
    "Think of photosynthesis as nature's solar panel factory. Plants capture sunlight and convert it into chemical energy (glucose) that powers all life on Earth.",
  steps: [
    {
      step_title: "Light Absorption",
      content:
        "Chlorophyll in the thylakoid membrane absorbs light energy, primarily from red and blue wavelengths (that's why plants look green - they reflect green light).",
      analogy: "Like a solar panel collecting sunlight",
    },
    {
      step_title: "Water Splitting",
      content:
        "Light energy splits water molecules (H₂O) into hydrogen ions, electrons, and oxygen. The oxygen is released as a byproduct - this is where we get our breathable air!",
      analogy: "Like breaking apart Lego blocks to use the pieces elsewhere",
    },
    {
      step_title: "ATP & NADPH Production",
      content:
        "The electrons flow through the electron transport chain, creating ATP (energy currency) and NADPH (electron carrier). This happens in the thylakoid membrane.",
      analogy:
        "Like a hydroelectric dam - the flow of electrons generates power",
    },
    {
      step_title: "Calvin Cycle",
      content:
        "In the stroma, CO₂ is fixed using ATP and NADPH to form glucose through a series of enzyme-catalyzed reactions. This is the 'dark reaction' (doesn't directly need light).",
      analogy: "Like a factory assembly line building glucose molecule by molecule",
    },
  ],
  real_world_example:
    "Agricultural scientists optimize greenhouse lighting to maximize photosynthesis - using red and blue LED lights because those wavelengths are most efficiently absorbed by chlorophyll.",
  common_pitfall:
    "Many students think the 'dark reaction' happens at night. It's called 'dark' because it doesn't directly use light - but it still happens during the day!",
};

export default function LearnPage() {
  const params = useParams();
  const topicId = params.topicId as string;
  const [messages, setMessages] = useState<
    { role: "user" | "ai"; content: string }[]
  >([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showPDF, setShowPDF] = useState(true);

  // Initial AI greeting
  useEffect(() => {
    setMessages([
      {
        role: "ai",
        content: `Let's master **${MOCK_EXPLANATION.topic}** together! I'll explain the key concepts step by step. Ask me anything along the way.`,
      },
    ]);
  }, []);

  const handleSend = () => {
    if (!input.trim()) return;

    setMessages((prev) => [...prev, { role: "user", content: input }]);
    setInput("");
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      setIsTyping(false);
      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          content:
            "Great question! In the context of photosynthesis, the answer relates to how chlorophyll absorbs specific wavelengths. Would you like me to elaborate on the molecular structure of chlorophyll?",
        },
      ]);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex">
      {/* Left Panel - PDF/Content Context */}
      {showPDF && (
        <div className="w-1/2 border-r border-slate-700 flex flex-col">
          <div className="p-4 border-b border-slate-700 flex items-center justify-between bg-slate-800/50">
            <div className="flex items-center gap-2 text-white font-medium">
              <FileText className="w-5 h-5 text-purple-400" />
              Source Material
            </div>
            <button
              onClick={() => setShowPDF(false)}
              className="text-slate-400 hover:text-white text-sm"
            >
              Hide
            </button>
          </div>
          <div className="flex-1 p-6 overflow-y-auto">
            {/* Explanation Steps */}
            <div className="space-y-6">
              <div className="bg-purple-500/20 border border-purple-500/50 rounded-xl p-4">
                <Lightbulb className="w-5 h-5 text-purple-400 mb-2" />
                <p className="text-purple-200">{MOCK_EXPLANATION.intuition}</p>
              </div>

              {MOCK_EXPLANATION.steps.map((step, i) => (
                <div
                  key={i}
                  className="bg-slate-800/50 rounded-xl p-5 border border-slate-700"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <span className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                      {i + 1}
                    </span>
                    <h3 className="text-lg font-bold text-white">
                      {step.step_title}
                    </h3>
                  </div>
                  <p className="text-slate-300 mb-3">{step.content}</p>
                  {step.analogy && (
                    <p className="text-sm text-purple-300 italic">
                      💡 {step.analogy}
                    </p>
                  )}
                </div>
              ))}

              {/* Common Pitfall Warning */}
              <div className="bg-amber-500/20 border border-amber-500/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                  <span className="text-amber-200 font-medium">
                    Common Mistake
                  </span>
                </div>
                <p className="text-amber-200/80">
                  {MOCK_EXPLANATION.common_pitfall}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Right Panel - AI Tutor Chat */}
      <div className={`${showPDF ? "w-1/2" : "w-full"} flex flex-col`}>
        {/* Header */}
        <div className="p-4 border-b border-slate-700 flex items-center justify-between bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-white font-bold">AI Tutor</h2>
              <p className="text-sm text-slate-400 capitalize">
                {topicId?.replace("-", " ")}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {!showPDF && (
              <button
                onClick={() => setShowPDF(true)}
                className="text-slate-400 hover:text-white text-sm px-3 py-1 border border-slate-600 rounded-lg"
              >
                Show Source
              </button>
            )}
            <Link
              href={`/quiz/${topicId}`}
              className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 text-sm transition-all"
            >
              Take Quiz
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 p-6 overflow-y-auto space-y-4">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${
                msg.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  msg.role === "user"
                    ? "bg-purple-500 text-white"
                    : "bg-slate-700 text-slate-200"
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-slate-700 rounded-2xl px-4 py-3">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" />
                  <span
                    className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                    style={{ animationDelay: "0.1s" }}
                  />
                  <span
                    className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                    style={{ animationDelay: "0.2s" }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="p-4 border-t border-slate-700 bg-slate-800/50">
          <div className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Ask a follow-up question..."
              className="flex-1 bg-slate-700/50 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <button
              onClick={handleSend}
              className="bg-purple-500 hover:bg-purple-600 text-white px-4 rounded-xl transition-all"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
