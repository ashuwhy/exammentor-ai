-- Add persistence columns for session state
ALTER TABLE study_sessions 
ADD COLUMN IF NOT EXISTS current_context jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS agent_history jsonb[] DEFAULT ARRAY[]::jsonb[];

-- Plan cache for semantic caching
CREATE TABLE IF NOT EXISTS plan_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key text UNIQUE NOT NULL,  -- Hash of exam_type + syllabus summary
  plan jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone DEFAULT (now() + interval '24 hours')
);

CREATE INDEX IF NOT EXISTS idx_plan_cache_key ON plan_cache(cache_key);
