/**
 * Shared TypeScript types for ExamMentor AI
 * Aligned with backend Pydantic schemas
 */

// ============================================================================
// Plan Types
// ============================================================================

export interface DailyPlan {
  day_number: number
  focus_topics: string[]
  estimated_hours: number
  rationale: string
}

export interface StudyPlan {
  exam_name: string
  total_days: number
  schedule: DailyPlan[]
  critical_topics: string[]
}

// ============================================================================
// Tutor Types
// ============================================================================

export interface ExplanationStep {
  step_title: string
  content: string
  analogy?: string
}

export interface TutorExplanation {
  topic: string
  intuition: string
  steps: ExplanationStep[]
  real_world_example: string
  common_pitfall: string
}

// ============================================================================
// Quiz Types
// ============================================================================

export type Difficulty = 'easy' | 'medium' | 'hard'

export interface Question {
  id: string
  text: string
  options: string[]
  correct_option_index: number
  explanation: string
  difficulty: Difficulty
  concept_tested?: string
}

export interface Quiz {
  topic: string
  questions: Question[]
}

export interface AnswerEvaluation {
  is_correct: boolean
  explanation?: string
  feedback?: string
  detected_misconception?: string
}

// ============================================================================
// Results / Analysis Types
// ============================================================================

export interface QuizAnswer {
  question_id: string
  question_text: string
  concept_tested: string
  student_answer: string
  correct_answer: string
  is_correct: boolean
}

export interface TopicMastery {
  topic: string
  score: number
  status: 'mastered' | 'learning' | 'weak' | 'pending'
  strength: string
  weakness: string
}

export interface Misconception {
  concept: string
  description: string
  correction: string
  suggested_review: string
  // Mapped for UI compatibility
  topic?: string
  issue?: string
  advice?: string
}

export interface StudyRecommendation {
  priority: number
  topic: string
  action: string
  time_estimate: string
}

export interface PerformanceAnalysis {
  overall_score: number
  summary: string
  topic_mastery: TopicMastery[]
  misconceptions: Misconception[]
  recommendations: StudyRecommendation[]
  encouragement: string
  // Legacy compatibility
  topic_performance?: Array<{
    name: string
    score: number
    status: 'mastered' | 'learning' | 'weak' | 'pending'
  }>
  strengths?: string[]
  weaknesses?: string[]
}

// ============================================================================
// User Stats
// ============================================================================

export interface UserStats {
  overall_score: number
  topics_mastered: number
  topics_total: number
  study_hours: number
  quizzes_taken: number
  streak_days: number
}
