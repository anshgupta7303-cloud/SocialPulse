-- SocialPulse AI: Migration 003 - Campaign "Close the Loop" Schema Additions
-- Run this migration in the Supabase SQL Editor.

ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS linked_post_id uuid REFERENCES posts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS linked_idea_id uuid REFERENCES content_ideas(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS target_metric text CHECK (target_metric IS NULL OR target_metric IN ('save_rate', 'engagement_rate', 'share_rate')),
  ADD COLUMN IF NOT EXISTS target_direction text CHECK (target_direction IS NULL OR target_direction IN ('above_baseline', 'below_baseline')),
  ADD COLUMN IF NOT EXISTS baseline_value numeric,
  ADD COLUMN IF NOT EXISTS baseline_n integer CHECK (baseline_n IS NULL OR baseline_n >= 0),
  ADD COLUMN IF NOT EXISTS outcome jsonb,
  ADD COLUMN IF NOT EXISTS lesson_draft text,
  ADD COLUMN IF NOT EXISTS lesson_retained_at timestamptz,
  ADD COLUMN IF NOT EXISTS lesson_memory_event_id uuid REFERENCES memory_events(id) ON DELETE SET NULL;

-- Indexes for efficient lookups on foreign keys
CREATE INDEX IF NOT EXISTS campaigns_linked_post_idx ON campaigns (linked_post_id);
CREATE INDEX IF NOT EXISTS campaigns_linked_idea_idx ON campaigns (linked_idea_id);

-- Note on Row Level Security (RLS):
-- RLS was already enabled on the `campaigns` table in Migration 001 with row-level policies:
-- (USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)).
-- In PostgreSQL, table-level RLS policies automatically cover all newly added columns,
-- so NO changes or additions to RLS policies are needed.
