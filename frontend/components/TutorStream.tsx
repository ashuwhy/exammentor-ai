'use client'

import { useState, useEffect, useRef } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { Sparkles } from '@hugeicons/core-free-icons'
import { formatMarkdown } from '@/lib/markdown'

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
        className="max-w-none overflow-y-auto"
        style={{ maxHeight: 'calc(100vh - 200px)' }}
      >
        {content ? (
          <div 
            className="text-foreground/90 markdown-content"
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
