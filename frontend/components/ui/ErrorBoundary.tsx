'use client'

import { Component, ErrorInfo, ReactNode } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  AlertTriangle,
  Refresh,
  ArrowLeft,
} from '@hugeicons/core-free-icons'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

interface Props {
  children: ReactNode
  fallbackPath?: string
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-6">
          <div className="max-w-md w-full card-elevated p-8 text-center animate-fade-in">
            <HugeiconsIcon icon={AlertTriangle} size={48} color="currentColor" strokeWidth={1.5} className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Something went wrong
            </h2>
            <p className="text-muted-foreground mb-6">
              {this.state.error?.message || "An unexpected error occurred. Please try again."}
            </p>
            <div className="flex gap-3">
              {this.props.fallbackPath && (
                <Button
                  asChild
                  variant="secondary"
                  className="flex-1"
                >
                  <Link href={this.props.fallbackPath}>
                    <HugeiconsIcon icon={ArrowLeft} size={16} color="currentColor" strokeWidth={1.5} className="w-4 h-4" />
                    Go Back
                  </Link>
                </Button>
              )}
              <Button
                variant="premium"
                className="flex-1"
                onClick={this.handleRetry}
              >
                <HugeiconsIcon icon={Refresh} size={16} color="currentColor" strokeWidth={1.5} className="w-4 h-4" />
                Try Again
              </Button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

// Reusable error display component for async operations
interface ErrorDisplayProps {
  error: string
  onRetry?: () => void
  fallbackPath?: string
  className?: string
}

export function ErrorDisplay({ error, onRetry, fallbackPath, className = '' }: ErrorDisplayProps) {
  return (
    <div className={`card-soft bg-destructive/10 border-destructive/30 p-6 backdrop-blur-lg ${className}`}>
      <div className="flex items-start gap-3">
        <HugeiconsIcon icon={AlertTriangle} size={20} color="currentColor" strokeWidth={1.5} className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-destructive font-medium mb-1">Error</p>
          <p className="text-foreground/80 text-sm mb-4">{error}</p>
          <div className="flex gap-2">
            {fallbackPath && (
              <Button
                asChild
                size="sm"
                variant="outline"
              >
                <Link href={fallbackPath}>
                  Go Back
                </Link>
              </Button>
            )}
            {onRetry && (
              <Button
                size="sm"
                variant="premium"
                onClick={onRetry}
                className="gap-1"
              >
                <HugeiconsIcon icon={Refresh} size={12} color="currentColor" strokeWidth={1.5} className="w-3 h-3" />
                Retry
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
