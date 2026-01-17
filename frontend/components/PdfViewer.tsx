'use client'

import { useState } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { Book02Icon } from '@hugeicons/core-free-icons'
import { Button } from '@/components/ui/button'

interface PdfViewerProps {
  fileUrl: string
  className?: string
}

export function PdfViewer({ fileUrl, className = '' }: PdfViewerProps) {
  const [error, setError] = useState<string | null>(null)

  // For MVP, we'll use an iframe embed
  // In production, use @react-pdf-viewer/core for better control
  
  if (error) {
    return (
      <div className={`flex items-center justify-center h-full bg-muted/50 rounded-lg backdrop-blur-lg ${className}`}>
        <p className="text-muted-foreground">Unable to load PDF</p>
      </div>
    )
  }

  return (
    <div className={`relative h-full ${className}`}>
      <iframe
        src={`${fileUrl}#toolbar=0&navpanes=0`}
        className="w-full h-full rounded-lg border border-border"
        title="Study Material"
        onError={() => setError('Failed to load PDF')}
      />
    </div>
  )
}

// Placeholder component when no PDF is provided
export function PdfPlaceholder({ topic }: { topic: string }) {
  return (
    <div className="h-full flex flex-col items-center justify-center bg-muted/30 rounded-lg border border-border p-8 backdrop-blur-lg">
      <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4 backdrop-blur-lg">
        <HugeiconsIcon icon={Book02Icon} size={24} color="currentColor" strokeWidth={1.5} className="w-6 h-6 text-primary" />
      </div>
      <h3 className="text-xl font-semibold text-foreground mb-2">Study Material</h3>
      <p className="text-muted-foreground text-center max-w-sm">
        Upload your syllabus, textbook, or notes to see them displayed here while you learn about <strong>{topic}</strong>.
      </p>
      <Button variant="premium" className="mt-6">
        Upload PDF
      </Button>
    </div>
  )
}
