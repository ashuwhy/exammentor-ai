'use client'

import { useState, useEffect, useRef } from 'react'
import { Sparkles } from 'lucide-react'

interface TutorStreamProps {
  topic: string
  context?: string
  difficulty?: 'easy' | 'medium' | 'hard'
  onComplete?: (content: string) => void
}

export function TutorStream({ 
  topic, 
  context = '', 
  difficulty = 'medium',
  onComplete 
}: TutorStreamProps) {
  const [content, setContent] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const streamExplanation = async () => {
      setIsStreaming(true)
      setContent('')
      setError(null)

      try {
        const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'
        const response = await fetch(`${API_BASE}/api/tutor/stream`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topic, context, difficulty }),
        })

        if (!response.ok) {
          throw new Error('Failed to stream explanation')
        }

        const reader = response.body?.getReader()
        const decoder = new TextDecoder()

        if (!reader) {
          throw new Error('No response body')
        }

        let fullContent = ''

        while (true) {
          const { done, value } = await reader.read()
          
          if (done) break

          const chunk = decoder.decode(value, { stream: true })
          fullContent += chunk
          setContent(fullContent)

          // Auto-scroll to bottom
          if (containerRef.current) {
            containerRef.current.scrollTop = containerRef.current.scrollHeight
          }
        }

        onComplete?.(fullContent)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setIsStreaming(false)
      }
    }

    if (topic) {
      streamExplanation()
    }
  }, [topic, context, difficulty, onComplete])

  if (error) {
    return (
      <div className="card-soft bg-destructive/10 border-destructive/30 p-4">
        <p className="text-destructive">Error: {error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {isStreaming && (
        <div className="flex items-center gap-2 text-primary">
          <Sparkles className="w-4 h-4 animate-pulse" />
          <span className="text-sm">AI is thinking...</span>
        </div>
      )}
      
      <div 
        ref={containerRef}
        className="prose prose-invert max-w-none overflow-y-auto"
        style={{ maxHeight: 'calc(100vh - 200px)' }}
      >
        {content ? (
          <div 
            className="whitespace-pre-wrap text-foreground/90"
            dangerouslySetInnerHTML={{ 
              __html: formatMarkdown(content) 
            }} 
          />
        ) : (
          <div className="flex items-center justify-center h-32">
            <div className="w-8 h-8 border-2 border-primary/30 rounded-full animate-spin border-t-primary" />
          </div>
        )}
      </div>
    </div>
  )
}

// Simple markdown formatter
function formatMarkdown(text: string): string {
  return text
    // Bold
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Headers
    .replace(/^### (.*$)/gm, '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>')
    .replace(/^## (.*$)/gm, '<h2 class="text-xl font-semibold mt-6 mb-3">$1</h2>')
    .replace(/^# (.*$)/gm, '<h1 class="text-2xl font-bold mt-6 mb-4">$1</h1>')
    // Bullet points
    .replace(/^- (.*$)/gm, '<li class="ml-4">$1</li>')
    .replace(/^(\d+)\. (.*$)/gm, '<li class="ml-4"><span class="font-medium">$1.</span> $2</li>')
    // Code
    .replace(/`(.*?)`/g, '<code class="bg-muted px-1 py-0.5 rounded text-sm">$1</code>')
    // Line breaks
    .replace(/\n\n/g, '</p><p class="mb-4">')
    .replace(/\n/g, '<br />')
}
