"use client";

import { useState } from "react";
import {
  BookOpen,
  Send,
  ChevronRight,
  FileText,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { TutorStream } from "@/components/TutorStream";
import { PdfPlaceholder } from "@/components/PdfViewer";
import { getExplanationAction } from "@/app/actions";

export default function LearnPage() {
  const params = useParams();
  const topicId = params.topicId as string;
  const topicName = topicId?.replace(/-/g, " ") || "Topic";
  const [messages, setMessages] = useState<
    { role: "user" | "ai"; content: string }[]
  >([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showPDF, setShowPDF] = useState(true);
  const [streamingContent, setStreamingContent] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get context from localStorage (plan data)
  const getContext = () => {
    const plan = localStorage.getItem("studyPlan");
    const examType = localStorage.getItem("examType") || "NEET";
    return plan ? `Exam: ${examType}. Study plan context available.` : `Exam: ${examType}`;
  };

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    const userMessage = input.trim();
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setInput("");
    setIsTyping(true);
    setError(null);

    try {
      // For now, use a simple response. In future, can add a chat endpoint
      const response = await getExplanationAction(
        userMessage,
        getContext(),
        "medium"
      );

      if (response) {
        setMessages((prev) => [
          ...prev,
          {
            role: "ai",
            content: response.intuition || response.steps?.[0]?.content || "I understand your question. Let me explain...",
          },
        ]);
      } else {
        throw new Error("No response from tutor");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to get response");
      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          content: "I apologize, but I'm having trouble processing that right now. Could you try rephrasing your question?",
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleStreamComplete = (content: string) => {
    setStreamingContent(content);
    setIsStreaming(false);
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Panel - PDF/Content Context */}
      {showPDF && (
        <div className="w-1/2 border-r border-border flex flex-col">
          <div className="p-4 border-b border-border flex items-center justify-between bg-card">
            <div className="flex items-center gap-2 text-foreground font-medium">
              <FileText className="w-5 h-5 text-primary" />
              Study Material
            </div>
            <button
              onClick={() => setShowPDF(false)}
              className="text-muted-foreground hover:text-foreground text-sm transition-colors"
            >
              Hide
            </button>
          </div>
          <div className="flex-1 p-6 overflow-y-auto">
            <PdfPlaceholder topic={topicName} />
          </div>
        </div>
      )}

      {/* Right Panel - AI Tutor Chat */}
      <div className={`${showPDF ? "w-1/2" : "w-full"} flex flex-col`}>
        <div className="p-4 border-b border-border flex items-center justify-between bg-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h2 className="text-foreground font-semibold">AI Tutor</h2>
              <p className="text-sm text-muted-foreground capitalize">
                {topicName}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {!showPDF && (
              <button
                onClick={() => setShowPDF(true)}
                className="text-muted-foreground hover:text-foreground text-sm px-3 py-1 border border-border rounded-lg-lg transition-colors"
              >
                Show Source
              </button>
            )}
            <Link
              href={`/quiz/${topicId}`}
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg-lg font-medium flex items-center gap-2 text-sm transition-all"
            >
              Take Quiz
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Messages & Streaming Content */}
        <div className="flex-1 p-6 overflow-y-auto space-y-4">
          {/* Initial streaming explanation */}
          {!streamingContent && !isStreaming && messages.length === 0 && (
            <div className="space-y-4">
              <div className="flex justify-start">
                <div className="bg-secondary rounded-lg-2xl px-4 py-3 max-w-[80%]">
                  <p className="text-secondary-foreground">
                    Let&apos;s master <strong>{topicName}</strong> together! I&apos;ll explain the key concepts step by step. Ask me anything along the way.
                  </p>
                </div>
              </div>
              <div className="border-t border-border pt-4">
                <TutorStream
                  topic={topicName}
                  context={getContext()}
                  difficulty="medium"
                  onComplete={handleStreamComplete}
                />
              </div>
            </div>
          )}

          {/* Show streaming content when available */}
          {streamingContent && (
            <div className="space-y-4">
              <div className="flex justify-start">
                <div className="bg-secondary rounded-lg-2xl px-4 py-3 max-w-[80%]">
                  <div 
                    className="prose prose-invert max-w-none text-secondary-foreground"
                    dangerouslySetInnerHTML={{ 
                      __html: streamingContent.replace(/\n/g, '<br />')
                    }} 
                  />
                </div>
              </div>
            </div>
          )}

          {/* Chat messages */}
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${
                msg.role === "user" ? "justify-end" : "justify-start"
              } animate-slide-up`}
            >
              <div
                className={`max-w-[80%] rounded-lg-2xl px-4 py-3 ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground"
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))}
          
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-secondary rounded-lg-2xl px-4 py-3">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                  <span
                    className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                    style={{ animationDelay: "0.1s" }}
                  />
                  <span
                    className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                    style={{ animationDelay: "0.2s" }}
                  />
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="card-soft bg-destructive/10 border-destructive/30 p-3">
              <p className="text-destructive text-sm">{error}</p>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="p-4 border-t border-border bg-card">
          <div className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Ask a follow-up question..."
              className="input-clean flex-1"
            />
            <button
              onClick={handleSend}
              disabled={isTyping || !input.trim()}
              className="bg-primary hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground text-primary-foreground px-4 rounded-lg transition-all"
            >
              {isTyping ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
