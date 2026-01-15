'use client'

import { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

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
            <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Something went wrong
            </h2>
            <p className="text-muted-foreground mb-6">
              {this.state.error?.message || "An unexpected error occurred. Please try again."}
            </p>
            <div className="flex gap-3">
              {this.props.fallbackPath && (
                <Link
                  href={this.props.fallbackPath}
                  className="flex-1 bg-secondary hover:bg-secondary/80 text-secondary-foreground px-4 py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-all"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Go Back
                </Link>
              )}
              <button
                onClick={this.handleRetry}
                className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-all"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>
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
    <div className={`card-soft bg-destructive/10 border-destructive/30 p-6 ${className}`}>
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-destructive font-medium mb-1">Error</p>
          <p className="text-foreground/80 text-sm mb-4">{error}</p>
          <div className="flex gap-2">
            {fallbackPath && (
              <Link
                href={fallbackPath}
                className="text-sm px-3 py-1.5 border border-border rounded-lg hover:bg-secondary transition-all"
              >
                Go Back
              </Link>
            )}
            {onRetry && (
              <button
                onClick={onRetry}
                className="text-sm px-3 py-1.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                Retry
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
