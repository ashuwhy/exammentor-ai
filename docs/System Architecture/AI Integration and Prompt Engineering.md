# AI Integration and Prompt Engineering

<cite>
**Referenced Files in This Document**
- [genai_service.py](file://backend/services/genai_service.py)
- [schemas.py](file://backend/agents/schemas.py)
- [router.py](file://backend/router.py)
- [plan_agent.py](file://backend/agents/plan_agent.py)
- [tutor_agent.py](file://backend/agents/tutor_agent.py)
- [quiz_agent.py](file://backend/agents/quiz_agent.py)
- [misconception_agent.py](file://backend/agents/misconception_agent.py)
- [evaluator_agent.py](file://backend/agents/evaluator_agent.py)
- [autopilot_agent.py](file://backend/agents/autopilot_agent.py)
- [state_machine.py](file://backend/agents/state_machine.py)
- [main.py](file://backend/main.py)
- [.env](file://backend/.env)
- [requirements.txt](file://backend/requirements.txt)
- [test_gemini.py](file://backend/tests/test_gemini.py)
</cite>

## Table of Contents
1. [Introduction](#introduction)
2. [Project Structure](#project-structure)
3. [Core Components](#core-components)
4. [Architecture Overview](#architecture-overview)
5. [Detailed Component Analysis](#detailed-component-analysis)
6. [Dependency Analysis](#dependency-analysis)
7. [Performance Considerations](#performance-considerations)
8. [Troubleshooting Guide](#troubleshooting-guide)
9. [Conclusion](#conclusion)

## Introduction
This document explains how Exammentor AI integrates Google’s Gemini 3.0 (and related preview models) to power a multi-agent tutoring system. It covers structured output schemas using Pydantic, prompt engineering patterns for different agent types, schema-based validation, error handling and retry strategies, multimodal capabilities, routing and syllabus scoping, authentication and cloud integrations, cost optimization, fallback mechanisms, model selection criteria, and performance monitoring.

## Project Structure
The backend is a FastAPI application that exposes REST endpoints for agents and orchestration. Agents encapsulate domain-specific logic and integrate with the GenAI service for model calls. A central router classifies user intents and scopes content to appropriate syllabi. State persistence is integrated with Supabase.

```mermaid
graph TB
subgraph "FastAPI Backend"
API["main.py<br/>REST Endpoints"]
Router["router.py<br/>Intent + Scope Routing"]
State["state_machine.py<br/>Session State + Persistence"]
end
subgraph "Agents"
Plan["plan_agent.py<br/>Study Plan Generation"]
Tutor["tutor_agent.py<br/>Explanation + Multimodal"]
Quiz["quiz_agent.py<br/>Quiz + Image Quiz"]
Misconception["misconception_agent.py<br/>Misconception Analysis"]
Evaluator["evaluator_agent.py<br/>Performance Analysis"]
Autopilot["autopilot_agent.py<br/>Orchestration + Retry"]
end
subgraph "Services"
Genai["services/genai_service.py<br/>GenAI Client"]
end
API --> Plan
API --> Tutor
API --> Quiz
API --> Misconception
API --> Evaluator
API --> Autopilot
API --> State
API --> Router
Plan --> Genai
Tutor --> Genai
Quiz --> Genai
Misconception --> Genai
Evaluator --> Genai
Autopilot --> Genai
Router --> Genai
```

**Diagram sources**
- [main.py](file://backend/main.py#L1-L843)
- [router.py](file://backend/router.py#L1-L129)
- [state_machine.py](file://backend/agents/state_machine.py#L1-L136)
- [plan_agent.py](file://backend/agents/plan_agent.py#L1-L524)
- [tutor_agent.py](file://backend/agents/tutor_agent.py#L1-L277)
- [quiz_agent.py](file://backend/agents/quiz_agent.py#L1-L283)
- [misconception_agent.py](file://backend/agents/misconception_agent.py#L1-L64)
- [evaluator_agent.py](file://backend/agents/evaluator_agent.py#L1-L198)
- [autopilot_agent.py](file://backend/agents/autopilot_agent.py#L1-L628)
- [genai_service.py](file://backend/services/genai_service.py#L1-L10)

**Section sources**
- [main.py](file://backend/main.py#L1-L843)
- [router.py](file://backend/router.py#L1-L129)
- [state_machine.py](file://backend/agents/state_machine.py#L1-L136)
- [genai_service.py](file://backend/services/genai_service.py#L1-L10)

## Core Components
- GenAI Service: Initializes the Google GenAI client and exposes a shared client for agents.
- Agent Schemas: Pydantic models define strict output schemas for reliable JSON responses.
- Router: Classifies intent, exam type, and subject scope; scopes syllabi safely.
- Agents:
  - Plan Agent: Generates and verifies study plans with self-correction.
  - Tutor Agent: Provides structured explanations and multimodal explanations.
  - Quiz Agent: Creates adaptive quizzes and evaluates answers.
  - Misconception Agent: Diagnoses conceptual errors and suggests remediation.
  - Evaluator Agent: Analyzes performance and generates recommendations.
  - Autopilot Agent: Orchestrates autonomous 30-minute learning sessions with retries and interactive quiz support.
- State Machine: Enforces valid workflow transitions and persists session state to Supabase.
- API Endpoints: FastAPI routes expose all agent capabilities and session management.

**Section sources**
- [genai_service.py](file://backend/services/genai_service.py#L1-L10)
- [schemas.py](file://backend/agents/schemas.py#L1-L106)
- [router.py](file://backend/router.py#L1-L129)
- [plan_agent.py](file://backend/agents/plan_agent.py#L1-L524)
- [tutor_agent.py](file://backend/agents/tutor_agent.py#L1-L277)
- [quiz_agent.py](file://backend/agents/quiz_agent.py#L1-L283)
- [misconception_agent.py](file://backend/agents/misconception_agent.py#L1-L64)
- [evaluator_agent.py](file://backend/agents/evaluator_agent.py#L1-L198)
- [autopilot_agent.py](file://backend/agents/autopilot_agent.py#L1-L628)
- [state_machine.py](file://backend/agents/state_machine.py#L1-L136)
- [main.py](file://backend/main.py#L1-L843)

## Architecture Overview
The system integrates Google Cloud GenAI with FastAPI endpoints. Agents use structured outputs to guarantee valid JSON, enabling robust downstream processing. The router scopes content to syllabi, and the state machine ensures coherent session progression. Supabase persists session state and user data.

```mermaid
sequenceDiagram
participant Client as "Frontend"
participant API as "FastAPI main.py"
participant Router as "router.py"
participant Plan as "plan_agent.py"
participant GenAI as "services/genai_service.py"
participant DB as "Supabase"
Client->>API : POST /api/plan/generate-verified-with-history
API->>Router : route_request(user_text, exam_context)
Router->>GenAI : generate_content(model="gemini-2.0-flash-exp", response_schema=RouteDecision)
GenAI-->>Router : RouteDecision
Router-->>API : RouteDecision
API->>Plan : generate_verified_plan_with_history(...)
Plan->>GenAI : generate_content(response_schema=StudyPlan)
GenAI-->>Plan : StudyPlan
Plan->>GenAI : generate_content(response_schema=PlanVerification)
GenAI-->>Plan : PlanVerification
Plan-->>API : PlanWithHistory
API->>DB : Save session state (optional)
API-->>Client : NDJSON stream or final plan
```

**Diagram sources**
- [main.py](file://backend/main.py#L162-L222)
- [router.py](file://backend/router.py#L64-L88)
- [plan_agent.py](file://backend/agents/plan_agent.py#L163-L304)
- [genai_service.py](file://backend/services/genai_service.py#L1-L10)

**Section sources**
- [main.py](file://backend/main.py#L162-L222)
- [router.py](file://backend/router.py#L64-L88)
- [plan_agent.py](file://backend/agents/plan_agent.py#L163-L304)
- [genai_service.py](file://backend/services/genai_service.py#L1-L10)

## Detailed Component Analysis

### GenAI Service and Authentication
- Initializes the GenAI client using the API key from environment variables.
- Exposes a shared client for agents to call model APIs asynchronously.

```mermaid
flowchart TD
Start(["Initialize GenAI Client"]) --> LoadEnv["Load .env variables"]
LoadEnv --> CreateClient["Create genai.Client(api_key=GEMINI_API_KEY)"]
CreateClient --> ExportClient["Export client for agents"]
ExportClient --> End(["Ready"])
```

**Diagram sources**
- [genai_service.py](file://backend/services/genai_service.py#L1-L10)
- [.env](file://backend/.env#L1-L5)

**Section sources**
- [genai_service.py](file://backend/services/genai_service.py#L1-L10)
- [.env](file://backend/.env#L1-L5)

### Structured Output Schemas with Pydantic
- Defines strict schemas for each agent’s output to enforce valid JSON.
- Provides a helper to configure response_mime_type and response_schema for Gemini.

```mermaid
classDiagram
class StudyDay {
+int day_number
+str[] focus_topics
+float estimated_hours
+str rationale
}
class PlanOutput {
+str exam_name
+int total_days
+StudyDay[] schedule
+str[] critical_topics
}
class ExplanationStep {
+int step_number
+str title
+str content
+str? analogy
}
class TutorOutput {
+str topic
+str intuition
+ExplanationStep[] steps
+str real_world_example
+str common_pitfall
}
class Question {
+str id
+str text
+str[] options
+int correct_option_index
+str explanation
+str difficulty
}
class QuizOutput {
+str topic
+Question[] questions
}
class Evaluation {
+bool is_correct
+int score
+str? detected_misconception
+str remediation_advice
}
```

**Diagram sources**
- [schemas.py](file://backend/agents/schemas.py#L16-L105)

**Section sources**
- [schemas.py](file://backend/agents/schemas.py#L1-L106)

### Router: Intent Classification and Syllabus Scoping
- Identifies intent (plan, explain, quiz, autopilot), exam type, and subject scope.
- Safely retrieves syllabus text based on scope and exam type.
- Uses a lightweight model for routing to reduce latency.

```mermaid
flowchart TD
A["User Input"] --> B["route_request()"]
B --> C["Generate RouteDecision (JSON)"]
C --> D{"needs_clarification?"}
D --> |Yes| E["Return clarifying_question"]
D --> |No| F["get_safe_syllabus(RouteDecision)"]
F --> G["Scoped Syllabus Text"]
G --> H["Pass to Plan Agent"]
```

**Diagram sources**
- [router.py](file://backend/router.py#L64-L88)
- [router.py](file://backend/router.py#L91-L129)

**Section sources**
- [router.py](file://backend/router.py#L1-L129)

### Plan Agent: Study Plan Generation and Self-Correction
- Generates a structured study plan using a schema-backed model call.
- Iteratively verifies and fixes the plan to meet coverage, feasibility, sequencing, and revision requirements.
- Streams the process with NDJSON for UI feedback.

```mermaid
sequenceDiagram
participant API as "main.py"
participant Plan as "plan_agent.py"
participant GenAI as "genai_service.py"
API->>Plan : generate_verified_plan_with_history(...)
Plan->>GenAI : generate_content(response_schema=StudyPlan)
GenAI-->>Plan : StudyPlan
Plan->>GenAI : generate_content(response_schema=PlanVerification)
GenAI-->>Plan : PlanVerification
alt Issues Found
Plan->>GenAI : generate_content(response_schema=StudyPlan)
GenAI-->>Plan : Fixed StudyPlan
end
Plan-->>API : PlanWithHistory
```

**Diagram sources**
- [plan_agent.py](file://backend/agents/plan_agent.py#L163-L304)
- [genai_service.py](file://backend/services/genai_service.py#L1-L10)

**Section sources**
- [plan_agent.py](file://backend/agents/plan_agent.py#L1-L524)

### Tutor Agent: Explanation Generation and Multimodal Grounding
- Generates structured explanations with steps, analogies, pitfalls, and practice questions.
- Streams explanations for real-time UI rendering.
- Supports multimodal explanations using images and image descriptions.

```mermaid
sequenceDiagram
participant API as "main.py"
participant Tutor as "tutor_agent.py"
participant GenAI as "genai_service.py"
API->>Tutor : stream_explanation(...) or generate_explanation(...)
Tutor->>GenAI : generate_content_stream(...) or generate_content(config with response_schema)
GenAI-->>Tutor : Text chunks or parsed TutorExplanation
Tutor-->>API : Streamed chunks or structured explanation
```

**Diagram sources**
- [tutor_agent.py](file://backend/agents/tutor_agent.py#L51-L186)
- [genai_service.py](file://backend/services/genai_service.py#L1-L10)

**Section sources**
- [tutor_agent.py](file://backend/agents/tutor_agent.py#L1-L277)

### Quiz Agent: Adaptive Quizzes and Multimodal Quiz Creation
- Generates adaptive quizzes with concept alignment and difficulty targeting.
- Evaluates answers and identifies misconceptions.
- Creates image-grounded quizzes with spatial references.

```mermaid
flowchart TD
Start(["Quiz Request"]) --> BuildPrompt["Build Prompt with Context + Difficulty + Previous Mistakes"]
BuildPrompt --> CallGenAI["Call generate_content with response_schema=Quiz"]
CallGenAI --> ReturnQuiz["Return Quiz with Questions"]
ReturnQuiz --> Evaluate["evaluate_answer()"]
Evaluate --> Misconception["analyze_and_bust_misconception()"]
Misconception --> End(["Feedback + Redemption Question"])
```

**Diagram sources**
- [quiz_agent.py](file://backend/agents/quiz_agent.py#L53-L111)
- [quiz_agent.py](file://backend/agents/quiz_agent.py#L206-L246)
- [misconception_agent.py](file://backend/agents/misconception_agent.py#L21-L63)

**Section sources**
- [quiz_agent.py](file://backend/agents/quiz_agent.py#L1-L283)
- [misconception_agent.py](file://backend/agents/misconception_agent.py#L1-L64)

### Evaluator Agent: Performance Analysis and Recommendations
- Analyzes quiz results to compute mastery, detect misconceptions, and suggest actionable recommendations.
- Can generate progress reports across sessions.

```mermaid
flowchart TD
A["Quiz Answers + Topic + Context"] --> B["analyze_performance()"]
B --> C["PerformanceAnalysis (Pydantic)"]
C --> D["Recommendations + Encouragement"]
```

**Diagram sources**
- [evaluator_agent.py](file://backend/agents/evaluator_agent.py#L59-L115)

**Section sources**
- [evaluator_agent.py](file://backend/agents/evaluator_agent.py#L1-L198)

### Autopilot Agent: Autonomous Learning Orchestration
- Orchestrates topic selection, micro-lessons, quizzes, and misconception analysis.
- Implements interactive quiz mode with user answer submission.
- Includes retry logic with exponential backoff for rate-limited or overloaded responses.
- Emits a run log with reasoning for each decision.

```mermaid
sequenceDiagram
participant API as "main.py"
participant Auto as "autopilot_agent.py"
participant GenAI as "genai_service.py"
API->>Auto : start_autopilot(session_id, study_plan, ...)
Auto->>GenAI : select_next_topic() with response_schema=TopicSelection
GenAI-->>Auto : TopicSelection
Auto->>Auto : teach_micro_lesson()
Auto->>GenAI : generate_explanation() with response_schema=TutorExplanation
GenAI-->>Auto : TutorExplanation
Auto->>Auto : run_quiz()
Auto->>GenAI : generate_quiz() with response_schema=Quiz
GenAI-->>Auto : Quiz
Auto->>Auto : analyze_quiz_results()
Auto->>GenAI : analyze_and_bust_misconception() with response_schema=MisconceptionAnalysis
GenAI-->>Auto : MisconceptionAnalysis
Auto-->>API : Run log + session state
```

**Diagram sources**
- [autopilot_agent.py](file://backend/agents/autopilot_agent.py#L182-L429)
- [genai_service.py](file://backend/services/genai_service.py#L1-L10)

**Section sources**
- [autopilot_agent.py](file://backend/agents/autopilot_agent.py#L1-L628)

### State Machine and Persistence
- Enforces valid transitions across study phases.
- Persists session state and logs actions to Supabase.
- Loads and resumes session state for continuity.

```mermaid
stateDiagram-v2
[*] --> INTAKE
INTAKE --> PLANNING : "generate_plan"
PLANNING --> LEARNING : "start_topic"
LEARNING --> QUIZZING : "take_quiz"
QUIZZING --> ANALYZING : "submit_answers"
ANALYZING --> PLANNING : "next_topic"
ANALYZING --> COMPLETED : "complete"
```

**Diagram sources**
- [state_machine.py](file://backend/agents/state_machine.py#L17-L78)

**Section sources**
- [state_machine.py](file://backend/agents/state_machine.py#L1-L136)
- [main.py](file://backend/main.py#L541-L571)

## Dependency Analysis
- External libraries include FastAPI, Pydantic, google-genai, supabase, uvicorn, pypdf, tenacity (retries), and python-dotenv.
- The GenAI client is centralized and reused across agents.
- Supabase is used for session persistence and user data.

```mermaid
graph LR
FastAPI["FastAPI"] --> Agents["Agents"]
Agents --> GenAI["google-genai"]
Agents --> Pydantic["pydantic"]
FastAPI --> Supabase["supabase"]
FastAPI --> Uvicorn["uvicorn"]
FastAPI --> PyPDF["pypdf"]
Agents --> Tenacity["tenacity (retries)"]
```

**Diagram sources**
- [requirements.txt](file://backend/requirements.txt#L1-L32)
- [genai_service.py](file://backend/services/genai_service.py#L1-L10)

**Section sources**
- [requirements.txt](file://backend/requirements.txt#L1-L32)
- [genai_service.py](file://backend/services/genai_service.py#L1-L10)

## Performance Considerations
- Structured outputs reduce parsing overhead and improve reliability.
- Streaming explanations improve perceived latency and UX.
- Asynchronous model calls enable concurrency and responsiveness.
- Exponential backoff reduces retry storms under rate limits.
- Model selection:
  - Use lighter models for routing and quick decisions.
  - Use Gemini 3 Flash for fast, cost-effective generation.
  - Use Gemini 3 Pro for higher accuracy when needed.
- Cost optimization:
  - Prefer streaming and smaller models for frequent operations.
  - Limit PDF extraction to a capped number of pages.
  - Cache syllabus-scoped prompts where feasible.
- Monitoring:
  - Track session run logs and step durations in Autopilot.
  - Capture endpoint latencies and error rates.
  - Monitor Supabase write/read throughput.

[No sources needed since this section provides general guidance]

## Troubleshooting Guide
- Authentication failures:
  - Verify GEMINI_API_KEY and GEMINI_MODEL in environment variables.
  - Confirm the GenAI client initialization and endpoint availability.
- Rate limiting and overloads:
  - The Autopilot engine retries with exponential backoff on 503/429 or overloaded signals.
  - Consider adding jitter and circuit breaker patterns for resilience.
- Schema mismatches:
  - Ensure response_schema matches the Pydantic model exactly.
  - Validate JSON output with the helper configuration.
- PDF extraction issues:
  - Limit pages and handle empty text gracefully.
- State persistence:
  - Confirm SUPABASE_URL and SUPABASE_KEY are configured.
  - Inspect Supabase table permissions and network connectivity.

**Section sources**
- [.env](file://backend/.env#L1-L5)
- [test_gemini.py](file://backend/tests/test_gemini.py#L1-L18)
- [autopilot_agent.py](file://backend/agents/autopilot_agent.py#L142-L161)
- [main.py](file://backend/main.py#L267-L284)
- [state_machine.py](file://backend/agents/state_machine.py#L56-L63)

## Conclusion
Exammentor AI leverages Gemini 3.0 and preview models through a centralized GenAI service, enforcing reliable, schema-backed outputs with Pydantic. The system integrates intent classification, syllabus scoping, multimodal processing, and autonomous orchestration. Robust retry logic, streaming responses, and Supabase persistence deliver a responsive, scalable tutoring experience. By applying model selection criteria, cost-conscious design, and comprehensive monitoring, the platform supports both experimentation and production-grade performance.