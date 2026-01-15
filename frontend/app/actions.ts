'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'

// --- Retry Logic ---

interface FetchOptions extends RequestInit {
  retries?: number
  retryDelay?: number
}

async function fetchWithRetry(
  url: string,
  options: FetchOptions = {}
): Promise<Response> {
  const { retries = 3, retryDelay = 1000, ...fetchOptions } = options
  
  let lastError: Error | null = null
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, fetchOptions)
      
      if (!response.ok) {
        // Don't retry on 4xx client errors (except 429 rate limit)
        if (response.status >= 400 && response.status < 500 && response.status !== 429) {
          throw new Error(`Request failed: ${response.status} ${response.statusText}`)
        }
        throw new Error(`Server error: ${response.status}`)
      }
      
      return response
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      
      if (attempt < retries) {
        // Exponential backoff
        const delay = retryDelay * Math.pow(2, attempt)
        console.log(`Retry ${attempt + 1}/${retries} after ${delay}ms...`)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }
  
  throw lastError || new Error('Request failed after retries')
}

// --- Plan Actions ---

export interface PlanFormData {
  examType: string
  goal: string
  days: number
  syllabusText?: string
}

export async function createPlanAction(data: PlanFormData) {
  try {
    const res = await fetchWithRetry(`${API_BASE}/api/plan/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        syllabus_text: data.syllabusText || getDefaultSyllabus(data.examType),
        exam_type: data.examType,
        goal: data.goal,
        days: data.days,
      }),
      retries: 2,
    })

    const plan = await res.json()
    
    // TODO: Save to Supabase
    // const { data: saved } = await supabase.from('study_plans').insert(plan)
    
    return { success: true, plan }
  } catch (error) {
    console.error('Plan generation error:', error)
    return { success: false, error: String(error) }
  }
}

// --- Tutor Actions ---

export async function getExplanationAction(topic: string, context: string, difficulty: string = 'medium') {
  try {
    const res = await fetchWithRetry(`${API_BASE}/api/tutor/explain`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, context, difficulty }),
      retries: 2,
    })

    return await res.json()
  } catch (error) {
    console.error('Tutor error:', error)
    return null
  }
}

// --- Quiz Actions ---

export async function generateQuizAction(
  topic: string,
  context: string,
  numQuestions: number = 5,
  difficulty: string = 'medium'
) {
  try {
    const res = await fetchWithRetry(`${API_BASE}/api/quiz/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        topic,
        context,
        num_questions: numQuestions,
        difficulty,
      }),
      retries: 2,
    })

    return await res.json()
  } catch (error) {
    console.error('Quiz error:', error)
    return null
  }
}

export async function submitAnswerAction(
  questionId: string,
  questionText: string,
  options: string[],
  correctIndex: number,
  studentIndex: number,
  conceptTested: string,
  topicContext: string
) {
  try {
    const res = await fetchWithRetry(`${API_BASE}/api/quiz/evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question_id: questionId,
        question_text: questionText,
        options,
        correct_option_index: correctIndex,
        student_answer_index: studentIndex,
        concept_tested: conceptTested,
        topic_context: topicContext,
      }),
      retries: 2,
    })

    return await res.json()
  } catch (error) {
    console.error('Evaluation error:', error)
    return null
  }
}

// --- Analysis Actions ---

export async function analyzePerformanceAction(
  quizAnswers: Array<{
    question_id: string
    question_text: string
    concept_tested: string
    student_answer: string
    correct_answer: string
    is_correct: boolean
  }>,
  topic: string,
  context: string
) {
  try {
    const res = await fetchWithRetry(`${API_BASE}/api/analyze/performance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quiz_answers: quizAnswers,
        topic,
        context,
      }),
      retries: 2,
    })

    return await res.json()
  } catch (error) {
    console.error('Analysis error:', error)
    return null
  }
}

// --- Helper: Default syllabus by exam type ---

function getDefaultSyllabus(examType: string): string {
  const syllabi: Record<string, string> = {
    neet: `
NEET Biology Syllabus:
1. Cell Biology - Cell structure, cell organelles, cell division (mitosis, meiosis)
2. Genetics - Mendelian genetics, molecular biology, DNA replication, transcription, translation
3. Human Physiology - Digestion, Circulation, Respiration, Excretion, Neural control
4. Plant Physiology - Photosynthesis, Respiration, Plant hormones, Mineral nutrition
5. Ecology - Ecosystems, Biodiversity, Environmental issues, Population dynamics
6. Evolution - Origin of life, Theories of evolution, Human evolution
7. Biotechnology - Recombinant DNA, Applications in medicine and agriculture
8. Reproduction - Human reproduction, Plant reproduction, Reproductive health
    `,
    jee: `
JEE Physics & Chemistry Syllabus:
Physics:
1. Mechanics - Laws of motion, Work-Energy, Rotational dynamics
2. Electromagnetism - Electrostatics, Magnetism, Electromagnetic induction
3. Optics - Ray optics, Wave optics, Modern physics
4. Thermodynamics - Heat, Kinetic theory, Laws of thermodynamics

Chemistry:
1. Physical Chemistry - Atomic structure, Chemical bonding, Thermodynamics
2. Organic Chemistry - Hydrocarbons, Functional groups, Reaction mechanisms
3. Inorganic Chemistry - Periodic table, Coordination compounds, Metallurgy
    `,
    upsc: `
UPSC Civil Services Syllabus:
1. History - Ancient, Medieval, Modern India, World History
2. Geography - Physical, Indian, World Geography
3. Polity - Constitution, Governance, International Relations
4. Economy - Indian Economy, Economic Development
5. Environment - Ecology, Biodiversity, Climate Change
6. Science & Technology - Current developments, Space, IT
7. Ethics - Aptitude, Integrity, Case Studies
    `,
    cat: `
CAT MBA Entrance Syllabus:
1. Quantitative Ability - Arithmetic, Algebra, Geometry, Number Systems
2. Verbal Ability - Reading Comprehension, Grammar, Vocabulary
3. Data Interpretation - Tables, Graphs, Charts, Caselets
4. Logical Reasoning - Puzzles, Arrangements, Logical Deductions
    `,
  }

  return syllabi[examType.toLowerCase()] || syllabi.neet
}
