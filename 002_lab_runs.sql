-- SocialPulse AI: Migration 002 - Memory Lab Runs Table
-- Run this migration in the Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS lab_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  task_label text NOT NULL,
  inputs jsonb NOT NULL,
  model text NOT NULL,
  temperature numeric NOT NULL,
  prompt_template_version text NOT NULL,
  memory_requested boolean NOT NULL DEFAULT true,
  memory_succeeded boolean NOT NULL DEFAULT false,
  recalled jsonb NOT NULL DEFAULT '[]'::jsonb,
  recalled_count integer NOT NULL DEFAULT 0,
  output_a jsonb NOT NULL DEFAULT '[]'::jsonb,
  output_b jsonb NOT NULL DEFAULT '[]'::jsonb,
  a_succeeded boolean NOT NULL DEFAULT false,
  b_succeeded boolean NOT NULL DEFAULT false,
  errors jsonb NOT NULL DEFAULT '{}'::jsonb,
  differences jsonb NOT NULL DEFAULT '{}'::jsonb,
  ratings jsonb,
  baseline_repeat jsonb
);

-- Index on (user_id, created_at desc) for fast per-user chronological listing and learning curve aggregation
CREATE INDEX IF NOT EXISTS lab_runs_user_created_idx
  ON lab_runs (user_id, created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE lab_runs ENABLE ROW LEVEL SECURITY;

-- 4 Policies for lab_runs using auth.uid() = user_id
CREATE POLICY "lab_runs_select_own"
  ON lab_runs FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "lab_runs_insert_own"
  ON lab_runs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "lab_runs_update_own"
  ON lab_runs FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "lab_runs_delete_own"
  ON lab_runs FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
