'use client'

import { useState, useEffect, useRef } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { Sparkles } from '@hugeicons/core-free-icons'
import { MarkdownRenderer } from '@/components/MarkdownRenderer'

interface TutorStreamProps {
  topic: string
  context?: string
  difficulty?: 'easy' | 'medium' | 'hard'
  attachedContext?: string | null
  onComplete?: (content: string) => void
}

export function TutorStream({
  topic,
  context = '',
  difficulty = 'medium',
  attachedContext,
  onComplete
}: TutorStreamProps) {
  const [content, setContent] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Refs for buffering and scroll control
  const contentBuffer = useRef('')
  const autoScrollRef = useRef(true)

  // Smart scroll handler to detect if user has scrolled away from bottom
  const handleScroll = () => {
    if (containerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = containerRef.current
      // If user is within 50px of bottom, sticky scroll is enabled
      const isAtBottom = Math.abs(scrollHeight - clientHeight - scrollTop) < 50
      autoScrollRef.current = isAtBottom
    }
  }

  // Effect to apply scroll when content updates, only if sticky scroll is active
  useEffect(() => {
    if (autoScrollRef.current && containerRef.current) {
      containerRef.current.scrollTo({ top: containerRef.current.scrollHeight, behavior: 'smooth' })
    }
  }, [content])

  // Periodic flush effect to update UI at a smooth frame rate (e.g. 20fps)
  useEffect(() => {
    if (!isStreaming) return

    const intervalId = setInterval(() => {
      // Only trigger re-render if content has actually changed
      if (content !== contentBuffer.current) {
        setContent(contentBuffer.current)
      }
    }, 50)

    return () => clearInterval(intervalId)
  }, [isStreaming, content])

  // Use ref to store onComplete to avoid re-triggering stream
  const onCompleteRef = useRef(onComplete)
  useEffect(() => {
    onCompleteRef.current = onComplete
  }, [onComplete])

  useEffect(() => {
    const streamExplanation = async () => {
      setIsStreaming(true)
      setContent('')
      contentBuffer.current = ''
      setError(null)
      autoScrollRef.current = true

      try {
        const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'
        const body: Record<string, unknown> = { topic, context, difficulty }
        if (attachedContext?.trim()) body.attached_context = attachedContext
        const response = await fetch(`${API_BASE}/api/tutor/stream`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })

        if (!response.ok) {
          throw new Error('Failed to stream explanation')
        }

        const reader = response.body?.getReader()
        const decoder = new TextDecoder()

        if (!reader) {
          throw new Error('No response body')
        }

        while (true) {
          const { done, value } = await reader.read()

          if (done) break

          const chunk = decoder.decode(value, { stream: true })
          // Just update the buffer, don't trigger React state update yet
          contentBuffer.current += chunk
        }

        // Final flush
        setContent(contentBuffer.current)
        onCompleteRef.current?.(contentBuffer.current)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setIsStreaming(false)
      }
    }

    if (topic) {
      streamExplanation()
    }
  }, [topic, context, difficulty, attachedContext])

  if (error) {
    return (
      <div className="card-soft bg-destructive/10 border-destructive/30 p-4 backdrop-blur-lg">
        <p className="text-destructive">Error: {error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {isStreaming && (
        <div className="flex items-center gap-2 text-primary">
          <HugeiconsIcon icon={Sparkles} size={16} color="currentColor" strokeWidth={1.5} className="w-4 h-4 animate-pulse" />
          <span className="text-sm">AI is thinking...</span>
        </div>
      )}

      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="max-w-[90%] overflow-y-auto bg-card/60 backdrop-blur-md border border-border/50 rounded-lg px-4 py-3 shadow-sm"
        style={{ maxHeight: 'calc(100vh - 200px)' }}
      >
        {content ? (
          <MarkdownRenderer content={content} />
        ) : (
          <div className="flex items-center justify-center h-32">
            <div className="w-8 h-8 border-2 border-primary/30 rounded-full animate-spin border-t-primary" />
          </div>
        )}
      </div>
    </div>
  )
}
