'use client'

import { useState, useEffect } from 'react'

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
      <div className={`flex items-center justify-center h-full bg-muted/50 rounded-lg ${className}`}>
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
    <div className="h-full flex flex-col items-center justify-center bg-muted/30 rounded-lg border border-border p-8">
      <div className="text-6xl mb-4">📚</div>
      <h3 className="text-xl font-semibold text-foreground mb-2">Study Material</h3>
      <p className="text-muted-foreground text-center max-w-sm">
        Upload your syllabus, textbook, or notes to see them displayed here while you learn about <strong>{topic}</strong>.
      </p>
      <button className="mt-6 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-all">
        Upload PDF
      </button>
    </div>
  )
}
