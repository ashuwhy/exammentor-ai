'use client'

import { cn } from "@/lib/utils"
import { CSSProperties } from "react"

interface SkeletonProps {
  className?: string
  style?: CSSProperties
}

export function Skeleton({ className, style }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-lg bg-muted",
        className
      )}
      style={style}
    />
  )
}

export function CardSkeleton({ className }: SkeletonProps) {
  return (
    <div className={cn("card-elevated p-6 space-y-4", className)}>
      <Skeleton className="h-6 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  )
}

export function TextSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton 
          key={i} 
          className="h-4" 
          style={{ width: `${100 - (i * 10)}%` }}
        />
      ))}
    </div>
  )
}

export function QuizSkeleton() {
  return (
    <div className="max-w-2xl mx-auto pt-8 space-y-6 animate-fade-in">
      {/* Progress bar */}
      <div className="flex justify-between mb-8">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
      
      {/* Progress bar */}
      <Skeleton className="h-2 w-full rounded-full" />
      
      {/* Question card */}
      <div className="card-elevated p-8">
        <Skeleton className="h-7 w-full mb-6" />
        <Skeleton className="h-5 w-3/4 mb-6" />
        
        {/* Options */}
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      </div>
      
      {/* Submit button */}
      <Skeleton className="h-14 w-full rounded-lg" />
    </div>
  )
}

export function PlanSkeleton() {
  return (
    <div className="max-w-5xl mx-auto pt-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex justify-between mb-8">
        <div>
          <Skeleton className="h-9 w-64 mb-2" />
          <Skeleton className="h-5 w-32" />
        </div>
        <Skeleton className="h-12 w-36 rounded-lg" />
      </div>
      
      {/* Alert */}
      <Skeleton className="h-14 w-full rounded-lg" />
      
      {/* Day cards */}
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="card-elevated p-5">
          <div className="flex items-center gap-6">
            <Skeleton className="w-14 h-14 rounded-lg flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="flex gap-2">
                <Skeleton className="h-7 w-24 rounded-full" />
                <Skeleton className="h-7 w-28 rounded-full" />
              </div>
            </div>
            <Skeleton className="w-16 h-5" />
            <Skeleton className="w-32 h-2 rounded-full" />
            <Skeleton className="w-5 h-5" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function ResultsSkeleton() {
  return (
    <div className="max-w-5xl mx-auto pt-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex justify-between mb-8">
        <div>
          <Skeleton className="h-9 w-48 mb-2" />
          <Skeleton className="h-5 w-24" />
        </div>
        <Skeleton className="h-12 w-40 rounded-lg" />
      </div>
      
      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="card-elevated p-5">
            <Skeleton className="w-6 h-6 mb-2" />
            <Skeleton className="h-8 w-16 mb-1" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
      
      {/* Two column grid */}
      <div className="grid md:grid-cols-2 gap-6">
        <CardSkeleton />
        <CardSkeleton />
      </div>
      
      {/* Chart */}
      <div className="card-elevated p-6">
        <Skeleton className="h-7 w-40 mb-4" />
        <Skeleton className="h-48 w-full" />
      </div>
    </div>
  )
}

export function LearnSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Skeleton className="w-4 h-4 rounded-full" />
        <Skeleton className="h-4 w-32" />
      </div>
      <TextSkeleton lines={4} />
      <Skeleton className="h-px w-full my-4" />
      <TextSkeleton lines={5} />
      <Skeleton className="h-px w-full my-4" />
      <TextSkeleton lines={3} />
    </div>
  )
}

export function OnboardingSkeleton() {
  return (
    <div className="text-center space-y-6 max-w-md mx-auto animate-fade-in">
      {/* Spinner */}
      <div className="relative">
        <div className="w-24 h-24 border-4 border-primary/30 rounded-full animate-spin border-t-primary mx-auto" />
      </div>
      
      {/* Status text */}
      <Skeleton className="h-6 w-48 mx-auto" />
      
      {/* Progress steps */}
      <div className="space-y-3 pt-4">
        {["Analyzing syllabus structure...", "Identifying key topics...", "Generating plan..."].map((_, i) => (
          <div key={i} className="flex items-center gap-3 justify-center">
            <Skeleton className="w-4 h-4 rounded-full" />
            <Skeleton className="h-4 w-40" />
          </div>
        ))}
      </div>
    </div>
  )
}
