"use client";

import { useState, useEffect } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Book02Icon,
  Send,
  ChevronRight,
  File01Icon,
  Loading03Icon,
  UserIcon,
} from "@hugeicons/core-free-icons";
import Link from "next/link";
import { useParams } from "next/navigation";
import { TutorStream } from "@/components/TutorStream";
import { PdfViewer, PdfPlaceholder, ImageMaterialViewer } from "@/components/PdfViewer";
import { getExplanationAction, extractPdfTextAction, describeImageForContextAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
// import { formatMarkdown } from "@/lib/markdown";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";

import { Card } from "@/components/ui/Card";

export default function LearnPage() {
  const params = useParams();
  const topicId = params.topicId as string;
  const topicName = decodeURIComponent(topicId?.replace(/-/g, " ") || "Topic");

  const [messages, setMessages] = useState<{ role: "user" | "ai"; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showPDF, setShowPDF] = useState(true);
  const [streamingContent, setStreamingContent] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [materialUrl, setMaterialUrl] = useState<string | null>(null);
  const [materialType, setMaterialType] = useState<"pdf" | "image" | null>(null);
  const [materialContext, setMaterialContext] = useState<string | null>(null);
  const [materialContextLoading, setMaterialContextLoading] = useState(false);

  // User Persistence State
  const [isInitialized, setIsInitialized] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [showNameModal, setShowNameModal] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

  // Load User and Chat History on Mount
  useEffect(() => {
    const initPage = async () => {
      if (!topicId) return;

      const storedUserId = localStorage.getItem("app-user-id");

      if (storedUserId) {
        setUserId(storedUserId);
        await fetchChatHistory(storedUserId);
      } else {
        setShowNameModal(true);
      }
      setIsInitialized(true);
    };

    initPage();
  }, [topicId]);

  const fetchChatHistory = async (uid: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/tutor/chat?user_id=${uid}&topic_id=${topicId}`);
      if (!res.ok) throw new Error("Failed to fetch history");

      const data = await res.json();
      if (data.explanation) setStreamingContent(data.explanation);
      if (data.messages) setMessages(data.messages);
    } catch (err) {
      console.error("History fetch error:", err);
    }
  };

  const saveToDb = async (uid: string, msgs: any[], expl: string) => {
    try {
      await fetch(`${API_BASE}/api/tutor/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: uid,
          topic_id: topicId,
          messages: msgs,
          explanation: expl || null // Send null if empty string
        })
      });
    } catch (err) {
      console.error("Save error:", err);
    }
  };

  const handleNameSubmit = async () => {
    if (!nameInput.trim()) return;
    setIsLoggingIn(true);

    try {
      const res = await fetch(`${API_BASE}/api/users/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nameInput.trim() })
      });

      if (!res.ok) throw new Error("Login failed");

      const user = await res.json();
      localStorage.setItem("app-user-id", user.id);
      localStorage.setItem("app-user-name", user.name);

      setUserId(user.id);
      setShowNameModal(false);

      // After login, fetch existing history if any (merge or replace? For now replace basic state)
      await fetchChatHistory(user.id);

    } catch (err) {
      setError("Failed to login. Please try again.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const getContext = () => {
    if (typeof window === 'undefined') return "NEET";
    const plan = localStorage.getItem("studyPlan");
    const examType = localStorage.getItem("examType") || "NEET";
    return plan ? `Exam: ${examType}. Study plan context available.` : `Exam: ${examType}`;
  };

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const base64 = dataUrl.split(",")[1];
        resolve(base64 || "");
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleMaterialUpload = async (url: string, type: "pdf" | "image", file: File) => {
    if (materialUrl) URL.revokeObjectURL(materialUrl);
    setMaterialUrl(url);
    setMaterialType(type);
    setMaterialContext(null);
    setMaterialContextLoading(true);
    try {
      if (type === "pdf") {
        const base64 = await fileToBase64(file);
        const result = await extractPdfTextAction(base64);
        if (result?.text) setMaterialContext(result.text);
      } else {
        const base64 = await fileToBase64(file);
        const mime = file.type || "image/jpeg";
        const result = await describeImageForContextAction(base64, mime);
        if (result?.description) setMaterialContext(result.description);
      }
    } catch {
      // Keep materialContext null on error; user still sees the file
    } finally {
      setMaterialContextLoading(false);
    }
  };

  useEffect(() => {
    return () => {
      if (materialUrl) URL.revokeObjectURL(materialUrl);
    };
  }, [materialUrl]);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    const userMessage = input.trim();
    const newMessages = [...messages, { role: "user" as const, content: userMessage }];

    setMessages(newMessages);
    setInput("");
    setIsTyping(true);
    setError(null);

    // Save user message immediately? Better to save after AI response for atomicity in this simple flow, 
    // or safeguard. Let's wait for AI response to save pair.

    try {
      const response = await getExplanationAction(
        userMessage,
        getContext(),
        "medium",
        newMessages,
        materialContext
      );

      if (response) {
        const aiMessage = {
          role: "ai" as const,
          content: response.intuition || response.steps?.[0]?.content || "I understand your question. Let me explain...",
        };
        const updatedMessages = [...newMessages, aiMessage];
        setMessages(updatedMessages);

        if (userId) {
          saveToDb(userId, updatedMessages, streamingContent);
        }
      } else {
        throw new Error("No response from tutor");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to get response");
      // Still show error message in chat
      setMessages(prev => [...prev, {
        role: "ai",
        content: "I apologize, but I'm having trouble processing that right now."
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleStreamComplete = (content: string) => {
    setStreamingContent(content);
    setIsStreaming(false);
    if (userId) {
      saveToDb(userId, messages, content);
    }
  };

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <HugeiconsIcon icon={Loading03Icon} size={32} color="currentColor" strokeWidth={1.5} className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex relative overflow-hidden">
      {/* Name Modal */}
      {showNameModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-fade-in">
          <Card variant="elevated" className="w-full max-w-md p-8">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <HugeiconsIcon icon={UserIcon} size={32} className="text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">Welcome to AI Tutor</h2>
              <p className="text-muted-foreground mt-2">What should we call you? We'll save your progress.</p>
            </div>

            <div className="space-y-4">
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="Enter your name..."
                className="input-clean w-full text-lg px-4 py-3"
                onKeyDown={(e) => e.key === 'Enter' && handleNameSubmit()}
              />
              <Button
                variant="premium"
                className="w-full h-12 text-lg"
                onClick={handleNameSubmit}
                disabled={isLoggingIn || !nameInput.trim()}
              >
                {isLoggingIn ? "Saving..." : "Start Learning"}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Left Panel - PDF/Content Context */}
      {showPDF && (
        <div className="w-1/2 border-r border-border flex flex-col h-screen relative z-10 bg-background/30 backdrop-blur-xl">
          <div className="p-4 border-b border-border flex items-center justify-between bg-card/40 backdrop-blur-md flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <HugeiconsIcon icon={File01Icon} size={20} color="currentColor" strokeWidth={1.5} className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-foreground font-semibold">Study Material</h2>
                <p className="text-sm text-muted-foreground capitalize">
                  {topicName}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {materialUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (materialUrl) URL.revokeObjectURL(materialUrl);
                    setMaterialUrl(null);
                    setMaterialType(null);
                    setMaterialContext(null);
                  }}
                >
                  Clear
                </Button>
              )}
              {materialContextLoading && (
                <span className="text-xs text-muted-foreground">Adding to chat context…</span>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPDF(false)}
              >
                Hide
              </Button>
            </div>
          </div>
          <div className="flex-1 p-6 overflow-y-auto" style={{ minHeight: 0 }}>
            {materialUrl ? (
              materialType === "pdf" ? (
                <PdfViewer fileUrl={materialUrl} className="min-h-[400px]" />
              ) : (
                <ImageMaterialViewer src={materialUrl} className="min-h-[400px]" />
              )
            ) : (
              <PdfPlaceholder topic={topicName} onUpload={handleMaterialUpload} />
            )}
          </div>
        </div>
      )}

      {/* Right Panel - AI Tutor Chat */}
      <div className={`${showPDF ? "w-1/2" : "w-full"} flex flex-col h-screen relative z-10 bg-background/30 backdrop-blur-xl transition-all duration-300`}>
        <div className="p-4 border-b border-border flex items-center justify-between bg-card/40 backdrop-blur-md flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <HugeiconsIcon icon={Book02Icon} size={20} color="currentColor" strokeWidth={1.5} className="w-5 h-5 text-primary" />
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
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPDF(true)}
              >
                Show Source
              </Button>
            )}
            <Button
              asChild
              variant="premium"
              size="sm"
            >
              <Link href={`/quiz/${topicId}`}>
                Take Quiz
                <HugeiconsIcon icon={ChevronRight} size={16} color="currentColor" strokeWidth={1.5} className="w-4 h-4" />
              </Link>
            </Button>
          </div>
        </div>

        {/* Messages & Streaming Content */}
        <div className="flex-1 p-6 overflow-y-auto space-y-4" style={{ minHeight: 0 }}>
          {/* Initial streaming explanation */}
          {!streamingContent && !isStreaming && messages.length === 0 && (
            <div className="space-y-4">
              <div className="flex justify-start">
                <div className="bg-card/60 backdrop-blur-md border border-border/50 rounded-lg px-4 py-3 max-w-[80%] shadow-sm">
                  <p className="text-foreground">
                    Let&apos;s master <strong>{topicName}</strong> together! I&apos;ll explain the key concepts step by step. Ask me anything along the way.
                  </p>
                </div>
              </div>
              <div className="">
                {userId && (
                    <TutorStream
                      topic={topicName}
                      context={getContext()}
                      difficulty="medium"
                      attachedContext={materialContext}
                      onComplete={handleStreamComplete}
                    />
                )}
              </div>
            </div>
          )}

          {/* Show streaming content when available */}
          {streamingContent && (
            <div className="space-y-4">
              <div className="flex justify-start">
                <div className="bg-card/60 backdrop-blur-md border border-border/50 rounded-lg px-4 py-3 max-w-[90%] shadow-sm">
                  <MarkdownRenderer content={streamingContent} />
                </div>
              </div>
            </div>
          )}

          {/* Chat messages */}
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"
                } animate-slide-up`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-3 shadow-sm ${msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-card/60 backdrop-blur-md border border-border/50"
                  }`}
              >
                <div
                  className={`whitespace-pre-wrap ${msg.role === "user" ? "text-primary-foreground" : "text-foreground"
                    }`}
                >
                  {msg.role === "ai" ? (
                    <MarkdownRenderer content={msg.content} />
                  ) : (
                    msg.content
                  )}
                </div>
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-card/60 backdrop-blur-md border border-border/50 rounded-lg px-4 py-3 shadow-sm">
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
        <div className="p-4 border-t border-border bg-card/40 backdrop-blur-md flex-shrink-0">
          <div className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Ask a follow-up question..."
              className="input-clean flex-1 bg-background/50 backdrop-blur-md border-primary/20 focus:border-primary/50"
            />
            <Button
              variant="premium"
              size="icon"
              onClick={handleSend}
              disabled={isTyping || !input.trim()}
            >
              {isTyping ? (
                <HugeiconsIcon icon={Loading03Icon} size={20} color="currentColor" strokeWidth={1.5} className="w-5 h-5 animate-spin" />
              ) : (
                <HugeiconsIcon icon={Send} size={20} color="currentColor" strokeWidth={1.5} className="w-5 h-5" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
