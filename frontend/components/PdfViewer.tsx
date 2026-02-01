'use client'

import { useRef, useState } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { Book, Upload } from '@hugeicons/core-free-icons'
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

// Display an uploaded image in the study material panel
export function ImageMaterialViewer({ src, className = '' }: { src: string; className?: string }) {
  return (
    <div className={`relative h-full flex items-start justify-center overflow-auto ${className}`}>
      <img
        src={src}
        alt="Study material"
        className="max-w-full h-auto rounded-lg border border-border object-contain"
        style={{ maxHeight: '100%' }}
      />
    </div>
  )
}

export type MaterialType = 'pdf' | 'image'

// Placeholder component when no PDF is provided — supports upload
export function PdfPlaceholder({
  topic,
  onUpload,
}: {
  topic: string
  onUpload?: (url: string, type: MaterialType) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !onUpload) return
    const url = URL.createObjectURL(file)
    const isPdf = file.type === 'application/pdf'
    const type: MaterialType = isPdf ? 'pdf' : 'image'
    onUpload(url, type)
    e.target.value = ''
  }

  return (
    <div className="h-full flex flex-col items-center justify-center bg-muted/30 rounded-lg border border-border p-8 backdrop-blur-lg">
      <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4 backdrop-blur-lg">
        <HugeiconsIcon icon={Book} size={24} color="currentColor" strokeWidth={1.5} className="w-6 h-6 text-primary" />
      </div>
      <h3 className="text-xl font-semibold text-foreground mb-2">Study Material</h3>
      <p className="text-muted-foreground text-center max-w-sm mb-6">
        Upload your syllabus, textbook, or notes to see them displayed here while you learn about <strong>{topic}</strong>.
      </p>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,image/*"
        className="hidden"
        aria-label="Upload study material"
        onChange={handleFileChange}
      />
      <Button
        variant="premium"
        className="mt-2"
        onClick={() => inputRef.current?.click()}
      >
        <HugeiconsIcon icon={Upload} size={18} color="currentColor" strokeWidth={1.5} className="w-4 h-4 mr-2" />
        Upload PDF or image
      </Button>
    </div>
  )
}
