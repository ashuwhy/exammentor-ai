-- ExamMentor AI Database Schema
-- Run this in Supabase SQL Editor

-- Enable vector extension for semantic search (future proofing)
create extension if not exists vector;

-- 1. Users & Sessions
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  created_at timestamp with time zone default now()
);

create table if not exists study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  exam_type text not null,
  current_state text not null default 'INTAKE',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  metadata jsonb
);

-- 2. Content & Mastery
create table if not exists topics (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references study_sessions(id) on delete cascade,
  name text not null,
  status text default 'pending',
  mastery_score int default 0
);

-- 3. Analytics (The "Impact" data)
create table if not exists misconceptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  topic_id uuid references topics(id) on delete cascade,
  description text,
  detected_at timestamp with time zone default now()
);

-- Indexes for performance
create index if not exists idx_study_sessions_user_id on study_sessions(user_id);
create index if not exists idx_topics_session_id on topics(session_id);
create index if not exists idx_misconceptions_user_id on misconceptions(user_id);
