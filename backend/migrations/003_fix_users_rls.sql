-- Migration 003: Fix users table and add RLS policies

-- Add name column to users table (make email nullable since we're using name-based login)
ALTER TABLE users ALTER COLUMN email DROP NOT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS name TEXT UNIQUE;

-- Enable RLS (if not already enabled)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow public read access to users" ON users;
DROP POLICY IF EXISTS "Allow public insert to users" ON users;
DROP POLICY IF EXISTS "Allow public select to users" ON users;

-- Create policies for public access (needed for anon login)
CREATE POLICY "Allow public select to users"
  ON users FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert to users"
  ON users FOR INSERT
  WITH CHECK (true);

-- Also enable RLS and add policies for related tables
ALTER TABLE tutor_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;

-- Policies for tutor_chats
DROP POLICY IF EXISTS "Allow all access to tutor_chats" ON tutor_chats;
CREATE POLICY "Allow all access to tutor_chats"
  ON tutor_chats
  USING (true)
  WITH CHECK (true);

-- Policies for quizzes
DROP POLICY IF EXISTS "Allow all access to quizzes" ON quizzes;
CREATE POLICY "Allow all access to quizzes"
  ON quizzes
  USING (true)
  WITH CHECK (true);
