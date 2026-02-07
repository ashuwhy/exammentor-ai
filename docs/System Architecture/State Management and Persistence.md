# State Management and Persistence

<cite>
**Referenced Files in This Document**
- [state_machine.py](file://backend/agents/state_machine.py)
- [schemas.py](file://backend/agents/schemas.py)
- [main.py](file://backend/main.py)
- [001_create_core_schema.sql](file://backend/migrations/001_create_core_schema.sql)
- [002_add_session_context.sql](file://backend/migrations/002_add_session_context.sql)
- [004_create_persistence_tables.sql](file://backend/migrations/004_create_persistence_tables.sql)
- [actions.ts](file://frontend/app/actions.ts)
- [router.py](file://backend/router.py)
- [autopilot_agent.py](file://backend/agents/autopilot_agent.py)
- [backend/.env](file://backend/.env)
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
This document explains Exammentor AI’s state management and persistence architecture. It focuses on the StateMachine class implementing the state pattern to manage study session workflows across phases (INTAKE, PLANNING, LEARNING, QUIZZING, ANALYZING, COMPLETED). It documents the StudentContext model for maintaining session state, the integration with Supabase for persistent storage, session lifecycle management, state transitions, and data persistence strategies. It also covers serialization and deserialization of state, recovery mechanisms, concurrency considerations, validation, and error recovery patterns. Practical examples illustrate state manipulation and session management operations, and how state persistence enables resumable learning experiences coordinated by agents.

## Project Structure
The state management and persistence logic spans backend Python modules and frontend TypeScript actions:
- Backend Python defines the state machine, session routes, and database migrations.
- Frontend TypeScript provides session state retrieval and manual save operations.
- Router and agent modules coordinate session orchestration and state transitions.

```mermaid
graph TB
subgraph "Backend"
SM["StateMachine<br/>state_machine.py"]
CTX["StudentContext<br/>state_machine.py"]
API["FastAPI Routes<br/>main.py"]
DB["Supabase Tables<br/>migrations/*.sql"]
AG["Agents<br/>router.py, autopilot_agent.py"]
end
subgraph "Frontend"
FE_ACT["Session Actions<br/>frontend/app/actions.ts"]
end
FE_ACT --> API
API --> SM
SM --> CTX
SM --> DB
AG --> API
```

**Diagram sources**
- [state_machine.py](file://backend/agents/state_machine.py#L38-L135)
- [main.py](file://backend/main.py#L516-L571)
- [001_create_core_schema.sql](file://backend/migrations/001_create_core_schema.sql#L14-L22)
- [002_add_session_context.sql](file://backend/migrations/002_add_session_context.sql#L2-L4)
- [004_create_persistence_tables.sql](file://backend/migrations/004_create_persistence_tables.sql#L3-L26)
- [actions.ts](file://frontend/app/actions.ts#L434-L461)
- [router.py](file://backend/router.py#L64-L88)
- [autopilot_agent.py](file://backend/agents/autopilot_agent.py#L57-L87)

**Section sources**
- [state_machine.py](file://backend/agents/state_machine.py#L1-L135)
- [main.py](file://backend/main.py#L516-L571)
- [001_create_core_schema.sql](file://backend/migrations/001_create_core_schema.sql#L14-L22)
- [002_add_session_context.sql](file://backend/migrations/002_add_session_context.sql#L2-L4)
- [004_create_persistence_tables.sql](file://backend/migrations/004_create_persistence_tables.sql#L3-L26)
- [actions.ts](file://frontend/app/actions.ts#L434-L461)
- [router.py](file://backend/router.py#L64-L88)
- [autopilot_agent.py](file://backend/agents/autopilot_agent.py#L57-L87)

## Core Components
- StateMachine: Implements the state pattern with explicit transitions between study phases and integrates with Supabase for persistence and audit logging.
- StudentContext: Pydantic model encapsulating session state (user_id, session_id, current_topic, last_quiz_score, misconceptions, plan_cache_key, extra_data).
- Session lifecycle endpoints: Create sessions, load persisted state, and manually save state.
- Database schema: study_sessions with current_state, current_context, agent_history; plan_cache for semantic caching; tutor_chats and quizzes for related persistence.

Key responsibilities:
- Enforce valid state transitions.
- Persist and hydrate session state to/from Supabase.
- Log agent actions to the session history.
- Support resumable sessions and agent coordination.

**Section sources**
- [state_machine.py](file://backend/agents/state_machine.py#L17-L36)
- [state_machine.py](file://backend/agents/state_machine.py#L38-L78)
- [state_machine.py](file://backend/agents/state_machine.py#L80-L135)
- [main.py](file://backend/main.py#L523-L556)
- [001_create_core_schema.sql](file://backend/migrations/001_create_core_schema.sql#L14-L22)
- [002_add_session_context.sql](file://backend/migrations/002_add_session_context.sql#L2-L4)
- [004_create_persistence_tables.sql](file://backend/migrations/004_create_persistence_tables.sql#L3-L26)

## Architecture Overview
The state management architecture combines a finite-state machine with persistent storage to enable resumable, agent-coordinated learning sessions.

```mermaid
sequenceDiagram
participant FE as "Frontend"
participant API as "FastAPI main.py"
participant SM as "StateMachine state_machine.py"
participant DB as "Supabase"
FE->>API : POST /api/session/start
API->>DB : Insert study_sessions row
API-->>FE : {session_id}
FE->>API : GET /api/session/{session_id}/state
API->>SM : load_state()
SM->>DB : SELECT current_state, current_context
DB-->>SM : Stored state
SM-->>API : Phase + context
API-->>FE : {phase, context}
FE->>API : POST /api/session/{session_id}/save
API->>SM : save_state(phase)
SM->>DB : UPDATE study_sessions
DB-->>SM : OK
SM-->>API : None
API-->>FE : {ok : True}
```

**Diagram sources**
- [main.py](file://backend/main.py#L523-L556)
- [state_machine.py](file://backend/agents/state_machine.py#L96-L113)
- [state_machine.py](file://backend/agents/state_machine.py#L80-L94)

## Detailed Component Analysis

### StateMachine Class
The StateMachine enforces a strict workflow using a transition map and supports persistence and action logging.

```mermaid
classDiagram
class StudyPhase {
<<enum>>
INTAKE
PLANNING
LEARNING
QUIZZING
ANALYZING
COMPLETED
}
class StudentContext {
+string user_id
+string session_id
+string current_topic
+number last_quiz_score
+string[] misconceptions
+string plan_cache_key
+map extra_data
}
class StateMachine {
+context : StudentContext
+transition(current_phase, action) StudyPhase
+get_valid_actions(current_phase) string[]
+save_state(current_phase) void
+load_state() StudyPhase
+log_action(action, metadata) void
}
StateMachine --> StudentContext : "owns"
StateMachine --> StudyPhase : "transitions"
```

- Transition rules: A tuple of (current_phase, action) maps to the next StudyPhase. Invalid transitions return the current phase.
- Persistence: save_state writes current_state and current_context to study_sessions; load_state reads and reconstructs StudentContext.
- Audit logging: log_action appends entries to agent_history.

Operational notes:
- Supabase client initialization depends on environment variables; missing credentials disable persistence.
- Serialization uses Pydantic’s model_dump for context and enum value for phase.

**Diagram sources**
- [state_machine.py](file://backend/agents/state_machine.py#L17-L36)
- [state_machine.py](file://backend/agents/state_machine.py#L38-L78)
- [state_machine.py](file://backend/agents/state_machine.py#L80-L135)

**Section sources**
- [state_machine.py](file://backend/agents/state_machine.py#L38-L78)
- [state_machine.py](file://backend/agents/state_machine.py#L80-L135)

### StudentContext Model
StudentContext captures session state for cross-agent coordination and persistence.

Fields:
- user_id: Identifies the learner.
- session_id: Links state to a study_sessions row.
- current_topic: Tracks the active topic.
- last_quiz_score: Stores recent quiz performance.
- misconceptions: Accumulates identified conceptual errors.
- plan_cache_key: Enables semantic caching of plans.
- extra_data: Extensible storage for agent-specific metadata.

Validation:
- Pydantic BaseModel ensures type safety and defaults for optional fields.

**Section sources**
- [state_machine.py](file://backend/agents/state_machine.py#L27-L36)

### Session Lifecycle Management
Endpoints support creating sessions, loading persisted state, and manual saves.

- POST /api/session/start: Creates a study_sessions row with initial current_state set to INTAKE.
- GET /api/session/{session_id}/state: Loads current_state and current_context from Supabase.
- POST /api/session/{session_id}/save: Manually persists a given phase and context.

Frontend actions mirror backend endpoints:
- getSessionStateAction: Calls GET /api/session/{session_id}/state.
- saveSessionStateAction: Calls POST /api/session/{session_id}/save.

```mermaid
flowchart TD
Start(["Start Session"]) --> Create["POST /api/session/start"]
Create --> Ready["Study session ready"]
Ready --> Load["GET /api/session/{session_id}/state"]
Load --> Resume["Resume with phase + context"]
Resume --> Save["POST /api/session/{session_id}/save"]
Save --> Persisted["State persisted to Supabase"]
Persisted --> End(["End"])
```

**Diagram sources**
- [main.py](file://backend/main.py#L523-L556)
- [actions.ts](file://frontend/app/actions.ts#L434-L461)

**Section sources**
- [main.py](file://backend/main.py#L523-L556)
- [actions.ts](file://frontend/app/actions.ts#L434-L461)

### Data Persistence Strategies
- study_sessions: Stores current_state, current_context (JSONB), agent_history (JSONB array), and timestamps.
- plan_cache: Stores cached plans keyed by a hash of exam_type and syllabus summary with TTL.
- tutor_chats and quizzes: Persist tutoring conversations and generated quizzes for reuse.

Migrations:
- 001_create_core_schema.sql: Defines users, study_sessions, topics, misconceptions tables and indexes.
- 002_add_session_context.sql: Adds current_context and agent_history columns; creates plan_cache.
- 004_create_persistence_tables.sql: Creates tutor_chats and quizzes with indexes and RLS policies.

```mermaid
erDiagram
USERS {
uuid id PK
text email UK
timestamptz created_at
}
STUDY_SESSIONS {
uuid id PK
uuid user_id FK
text exam_type
text current_state
timestamptz created_at
timestamptz updated_at
jsonb metadata
jsonb current_context
jsonb agent_history
}
TOPICS {
uuid id PK
uuid session_id FK
text name
text status
int mastery_score
}
MISCONCEPTIONS {
uuid id PK
uuid user_id FK
uuid topic_id FK
text description
timestamptz detected_at
}
PLAN_CACHE {
uuid id PK
text cache_key UK
jsonb plan
timestamptz created_at
timestamptz expires_at
}
TUTOR_CHATS {
uuid id PK
text user_id
text topic_id
jsonb messages
text explanation
timestamptz last_updated
}
QUIZZES {
uuid id PK
text user_id
text topic_id
jsonb questions
timestamptz created_at
}
USERS ||--o{ STUDY_SESSIONS : "has"
STUDY_SESSIONS ||--o{ TOPICS : "contains"
USERS ||--o{ MISCONCEPTIONS : "has"
TOPICS ||--o{ MISCONCEPTIONS : "has"
TUTOR_CHATS ||--|| USERS : "user"
QUIZZES ||--|| USERS : "user"
```

**Diagram sources**
- [001_create_core_schema.sql](file://backend/migrations/001_create_core_schema.sql#L8-L45)
- [002_add_session_context.sql](file://backend/migrations/002_add_session_context.sql#L7-L15)
- [004_create_persistence_tables.sql](file://backend/migrations/004_create_persistence_tables.sql#L4-L26)

**Section sources**
- [001_create_core_schema.sql](file://backend/migrations/001_create_core_schema.sql#L14-L22)
- [002_add_session_context.sql](file://backend/migrations/002_add_session_context.sql#L2-L4)
- [004_create_persistence_tables.sql](file://backend/migrations/004_create_persistence_tables.sql#L3-L26)

### State Transitions and Validation
Transitions are validated against a deterministic map. The StateMachine exposes get_valid_actions to enumerate allowed actions from a given phase.

```mermaid
flowchart LR
INTAKE["INTAKE"] --> |"generate_plan"| PLANNING["PLANNING"]
PLANNING --> |"start_topic"| LEARNING["LEARNING"]
LEARNING --> |"take_quiz"| QUIZZING["QUIZZING"]
QUIZZING --> |"submit_answers"| ANALYZING["ANALYZING"]
ANALYZING --> |"next_topic"| PLANNING
ANALYZING --> |"complete"| COMPLETED["COMPLETED"]
```

Validation:
- Invalid actions remain in the current phase.
- Valid actions advance the workflow predictably.

**Diagram sources**
- [state_machine.py](file://backend/agents/state_machine.py#L44-L52)

**Section sources**
- [state_machine.py](file://backend/agents/state_machine.py#L65-L78)
- [state_machine.py](file://backend/agents/state_machine.py#L44-L52)

### Serialization, Deserialization, and Recovery
- Serialization: StudentContext is serialized to JSONB via model_dump; StudyPhase is serialized as a string value.
- Deserialization: On load, current_context is reconstructed into StudentContext; current_state is converted back to StudyPhase.
- Recovery: If Supabase is unavailable, persistence is disabled and warnings are printed; state remains in-memory.

```mermaid
sequenceDiagram
participant SM as "StateMachine"
participant DB as "Supabase"
SM->>DB : SELECT current_state, current_context FROM study_sessions WHERE id = session_id
DB-->>SM : Row with JSON fields
SM->>SM : Deserialize current_context to StudentContext
SM->>SM : Deserialize current_state to StudyPhase
SM-->>SM : Return phase and updated context
```

**Diagram sources**
- [state_machine.py](file://backend/agents/state_machine.py#L96-L113)

**Section sources**
- [state_machine.py](file://backend/agents/state_machine.py#L80-L94)
- [state_machine.py](file://backend/agents/state_machine.py#L96-L113)

### Relationship Between Session State and Agent Coordination
Agents operate within the session lifecycle:
- Router and plan_agent.py use the routing layer to scope content and generate plans.
- Autopilot orchestrates topic selection, tutoring, quizzing, and analysis, logging decisions to the session steps.
- StateMachine coordinates transitions and persists state for resumability.

```mermaid
graph TB
Router["Router (router.py)"]
Plan["Plan Agent (plan_agent.py)"]
Auto["Autopilot Engine (autopilot_agent.py)"]
SM["StateMachine (state_machine.py)"]
Router --> Plan
Plan --> Auto
Auto --> SM
```

**Diagram sources**
- [router.py](file://backend/router.py#L64-L88)
- [plan_agent.py](file://backend/agents/plan_agent.py#L182-L200)
- [autopilot_agent.py](file://backend/agents/autopilot_agent.py#L182-L200)
- [state_machine.py](file://backend/agents/state_machine.py#L38-L78)

**Section sources**
- [router.py](file://backend/router.py#L64-L88)
- [plan_agent.py](file://backend/agents/plan_agent.py#L182-L200)
- [autopilot_agent.py](file://backend/agents/autopilot_agent.py#L182-L200)
- [state_machine.py](file://backend/agents/state_machine.py#L38-L78)

### Practical Examples
- Starting a session: Call POST /api/session/start to create a study_sessions row and receive a session_id.
- Resuming state: Call GET /api/session/{session_id}/state to retrieve current_state and current_context.
- Manual save: Call POST /api/session/{session_id}/save with context_data and phase to persist state.
- Frontend integration: Use getSessionStateAction and saveSessionStateAction helpers.

**Section sources**
- [main.py](file://backend/main.py#L523-L556)
- [actions.ts](file://frontend/app/actions.ts#L434-L461)

## Dependency Analysis
- StateMachine depends on:
  - StudentContext for state representation.
  - Supabase client for persistence and audit logging.
  - Environment variables for Supabase credentials.
- FastAPI routes depend on StateMachine for session state operations.
- Frontend actions depend on backend routes for session state retrieval and persistence.
- Agents depend on router and plan schemas for structured outputs.

```mermaid
graph LR
ENV[".env"]
SM["state_machine.py"]
API["main.py"]
FE["frontend/app/actions.ts"]
MIG["migrations/*.sql"]
ENV --> SM
API --> SM
FE --> API
SM --> MIG
```

**Diagram sources**
- [backend/.env](file://backend/.env#L3-L5)
- [state_machine.py](file://backend/agents/state_machine.py#L54-L63)
- [main.py](file://backend/main.py#L523-L556)
- [actions.ts](file://frontend/app/actions.ts#L434-L461)
- [001_create_core_schema.sql](file://backend/migrations/001_create_core_schema.sql#L14-L22)

**Section sources**
- [backend/.env](file://backend/.env#L3-L5)
- [state_machine.py](file://backend/agents/state_machine.py#L54-L63)
- [main.py](file://backend/main.py#L523-L556)
- [actions.ts](file://frontend/app/actions.ts#L434-L461)
- [001_create_core_schema.sql](file://backend/migrations/001_create_core_schema.sql#L14-L22)

## Performance Considerations
- JSONB fields (current_context, agent_history) enable flexible schema evolution but require careful indexing for large histories.
- plan_cache uses a unique cache_key and TTL to reduce repeated plan generation costs.
- Frontend fetchWithRetry applies exponential backoff to mitigate transient failures.
- Consider adding indexes on study_sessions(user_id) and study_sessions(updated_at) for frequent queries.

[No sources needed since this section provides general guidance]

## Troubleshooting Guide
Common issues and resolutions:
- Missing Supabase credentials: StateMachine prints a warning and disables persistence. Ensure SUPABASE_URL and SUPABASE_KEY are configured.
- Supabase connectivity errors: save_state and load_state catch exceptions and print error messages; verify network and credentials.
- Invalid transitions: get_valid_actions returns allowed actions; ensure actions align with the current phase.
- Frontend state retrieval failures: getSessionStateAction returns null on error; confirm session_id validity and API availability.

**Section sources**
- [state_machine.py](file://backend/agents/state_machine.py#L57-L63)
- [state_machine.py](file://backend/agents/state_machine.py#L91-L94)
- [state_machine.py](file://backend/agents/state_machine.py#L111-L113)
- [actions.ts](file://frontend/app/actions.ts#L436-L443)

## Conclusion
Exammentor AI’s state management leverages a state pattern implemented by StateMachine to enforce a predictable learning workflow. StudentContext encapsulates session state for agent coordination, while Supabase provides durable persistence and audit logging. The session lifecycle endpoints enable resumable experiences, and the database schema supports caching and related content. Together, these components deliver robust, recoverable, and agent-driven study sessions.