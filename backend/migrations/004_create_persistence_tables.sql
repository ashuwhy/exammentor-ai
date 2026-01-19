-- Migration 004: Create user persistence tables

-- Create tutor_chats table for saving chat history and explanations
CREATE TABLE IF NOT EXISTS tutor_chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  topic_id TEXT NOT NULL,
  messages JSONB DEFAULT '[]'::jsonb,
  explanation TEXT,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, topic_id)
);

-- Create quizzes table for saving generated quizzes
CREATE TABLE IF NOT EXISTS quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  topic_id TEXT NOT NULL,
  questions JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tutor_chats_user_topic ON tutor_chats(user_id, topic_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_user_topic ON quizzes(user_id, topic_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_created_at ON quizzes(created_at DESC);

-- Enable RLS
ALTER TABLE tutor_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;

-- Add policies for public access (since we're using simple name-based auth)
CREATE POLICY "Allow all access to tutor_chats"
  ON tutor_chats
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all access to quizzes"
  ON quizzes
  FOR ALL
  USING (true)
  WITH CHECK (true);
