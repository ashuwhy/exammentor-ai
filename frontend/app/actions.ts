"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

// --- Retry Logic ---

interface FetchOptions extends RequestInit {
  retries?: number;
  retryDelay?: number;
}

async function fetchWithRetry(
  url: string,
  options: FetchOptions = {},
): Promise<Response> {
  const { retries = 3, retryDelay = 1000, ...fetchOptions } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, fetchOptions);

      if (!response.ok) {
        let errorMsg = `Server error: ${response.status}`;
        try {
          const body = await response.text();
          errorMsg += ` - ${body}`;
        } catch (e) {
          // ignore body read error
        }

        // Don't retry on 4xx client errors (except 429 rate limit)
        if (
          response.status >= 400 &&
          response.status < 500 &&
          response.status !== 429
        ) {
          throw new Error(
            `Request failed: ${response.status} ${response.statusText} - ${errorMsg}`,
          );
        }
        throw new Error(errorMsg);
      }

      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < retries) {
        // Exponential backoff
        const delay = retryDelay * Math.pow(2, attempt);
        console.log(`Retry ${attempt + 1}/${retries} after ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error("Request failed after retries");
}

// --- Semantic Caching ---

async function getCachedPlan(cacheKey: string) {
  try {
    const { data } = await supabase
      .from("plan_cache")
      .select("plan")
      .eq("cache_key", cacheKey)
      .gt("expires_at", new Date().toISOString())
      .single();
    return data?.plan;
  } catch (error) {
    return null;
  }
}

async function saveToCache(cacheKey: string, plan: any) {
  try {
    await supabase.from("plan_cache").upsert({
      cache_key: cacheKey,
      plan,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });
  } catch (error) {
    console.error("Cache save error:", error);
  }
}

function hashPlanRequest(data: PlanFormData): string {
  // Simple deterministic hash for demo purposes
  const str = `${data.examType}-${data.days}-${(data.syllabusText || "").substring(0, 100)}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `plan-${Math.abs(hash)}`;
}

// --- Plan Actions ---

export interface PlanFormData {
  examType: string;
  goal: string;
  days: number;
  syllabusText?: string;
}

export async function createPlanAction(data: PlanFormData) {
  try {
    // 1. Check Cache
    const cacheKey = hashPlanRequest(data);
    const cached = await getCachedPlan(cacheKey);
    if (cached) {
      console.log("🚀 Serving plan from semantic cache");
      return { success: true, plan: cached, fromCache: true };
    }

    // 2. Generate Verified Plan
    const res = await fetchWithRetry(`${API_BASE}/api/plan/generate-verified`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        syllabus_text: data.syllabusText || getDefaultSyllabus(data.examType),
        exam_type: data.examType,
        goal: data.goal,
        days: data.days,
      }),
      retries: 2,
    });

    const plan = await res.json();

    // 3. Save to Cache
    await saveToCache(cacheKey, plan);

    return { success: true, plan };
  } catch (error) {
    console.error("Plan generation error:", error);
    return { success: false, error: String(error) };
  }
}

export async function createPlanWithHistoryAction(data: PlanFormData) {
  /**
   * Generate a plan WITH full self-correction history.
   * Returns version history for the PlanDiff component.
   */
  try {
    const res = await fetchWithRetry(
      `${API_BASE}/api/plan/generate-verified-with-history`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          syllabus_text: data.syllabusText || getDefaultSyllabus(data.examType),
          exam_type: data.examType,
          goal: data.goal,
          days: data.days,
        }),
        retries: 2,
      },
    );

    const result = await res.json();

    return {
      success: true,
      plan: result.final_plan,
      versions: result.versions,
      totalIterations: result.total_iterations,
      selfCorrectionApplied: result.self_correction_applied,
      verificationSummary: result.verification_summary,
    };
  } catch (error) {
    console.error("Plan generation with history error:", error);
    return { success: false, error: String(error) };
  }
}

// --- Tutor Actions ---

export async function getExplanationAction(
  topic: string,
  context: string,
  difficulty: string = "medium",
  history: any[] = [],
) {
  try {
    const res = await fetchWithRetry(`${API_BASE}/api/tutor/explain`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic, context, difficulty, history }),
      retries: 2,
    });

    return await res.json();
  } catch (error) {
    console.error("Tutor error:", error);
    return null;
  }
}

// --- Quiz Actions ---

export async function generateQuizAction(
  topic: string,
  context: string,
  numQuestions: number = 5,
  difficulty: string = "medium",
) {
  try {
    const res = await fetchWithRetry(`${API_BASE}/api/quiz/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topic,
        context,
        num_questions: numQuestions,
        difficulty,
      }),
      retries: 2,
    });

    return await res.json();
  } catch (error) {
    console.error("Quiz error:", error);
    return null;
  }
}

export async function submitAnswerAction(
  questionId: string,
  questionText: string,
  options: string[],
  correctIndex: number,
  studentIndex: number,
  conceptTested: string,
  topicContext: string,
) {
  try {
    const res = await fetchWithRetry(`${API_BASE}/api/quiz/evaluate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
    });

    return await res.json();
  } catch (error) {
    console.error("Evaluation error:", error);
    return null;
  }
}

// --- Session Start (persists study_sessions) ---

export async function startStudySessionAction(
  userId: string,
  examType: string = "NEET",
): Promise<{ session_id: string } | null> {
  try {
    const res = await fetch(`${API_BASE}/api/session/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, exam_type: examType }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.error("Session start error:", error);
    return null;
  }
}

// --- Analysis Actions ---

export async function analyzePerformanceAction(
  quizAnswers: Array<{
    question_id: string;
    question_text: string;
    concept_tested: string;
    student_answer: string;
    correct_answer: string;
    is_correct: boolean;
  }>,
  topic: string,
  context: string,
  options?: { userId?: string; topicId?: string },
) {
  try {
    const body: Record<string, unknown> = {
      quiz_answers: quizAnswers,
      topic,
      context,
    };
    if (options?.userId) body.user_id = options.userId;
    if (options?.topicId) body.topic_id = options.topicId;

    const res = await fetchWithRetry(`${API_BASE}/api/analyze/performance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      retries: 2,
    });

    return await res.json();
  } catch (error) {
    console.error("Analysis error:", error);
    return null;
  }
}

// --- Multimodal & Misconception Actions ---

export async function explainImageAction(
  topic: string,
  base64Image: string,
  mimeType: string = "image/jpeg",
) {
  try {
    const res = await fetchWithRetry(`${API_BASE}/api/tutor/explain-image`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topic,
        image_base64: base64Image,
        mime_type: mimeType,
      }),
      retries: 1,
    });

    return await res.json();
  } catch (error) {
    console.error("Image tutorial error:", error);
    return null;
  }
}

export async function bustMisconceptionAction(data: {
  question_id: string;
  question_text: string;
  options: string[];
  correct_option_index: number;
  student_answer_index: number;
  concept_tested: string;
  topic_context: string;
  session_id?: string;
  user_id?: string;
}) {
  try {
    const res = await fetchWithRetry(`${API_BASE}/api/quiz/misconception`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
      retries: 1,
    });

    return await res.json();
  } catch (error) {
    console.error("Misconception buster error:", error);
    return null;
  }
}

// --- Session Persistence Actions ---

export async function getSessionStateAction(sessionId: string) {
  try {
    const res = await fetch(`${API_BASE}/api/session/${sessionId}/state`);
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    return null;
  }
}

export async function saveSessionStateAction(
  sessionId: string,
  contextData: any,
  phase: string,
) {
  try {
    await fetch(`${API_BASE}/api/session/${sessionId}/save`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ context_data: contextData, phase }),
    });
    return true;
  } catch (err) {
    return false;
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
  };

  return syllabi[examType.toLowerCase()] || syllabi.neet;
}
