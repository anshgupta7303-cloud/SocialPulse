-- SocialPulse AI: Initial Database Schema with Row Level Security (RLS)
-- Run this migration in the Supabase SQL Editor.

-- 1. Helper function for automated updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Profiles table (one per creator user)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_name text DEFAULT '',
  instagram_handle text DEFAULT '',
  niche text DEFAULT '',
  target_audience text DEFAULT '',
  preferred_formats text[] DEFAULT ARRAY[]::text[],
  tone text DEFAULT '',
  goals text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT profiles_user_id_key UNIQUE (user_id)
);

-- 3. Posts table (CSV imported historical metrics and creator posts)
CREATE TABLE IF NOT EXISTS posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  external_post_id text,
  published_on date NOT NULL,
  caption text NOT NULL,
  topic text,
  format text NOT NULL CHECK (format IN ('reel', 'carousel', 'static_image', 'story')),
  status text NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'planned', 'published', 'rejected')),
  hook text,
  call_to_action text,
  -- All metric columns nullable integers with CHECK >= 0 (never fake zero when missing)
  reach integer CHECK (reach IS NULL OR reach >= 0),
  impressions integer CHECK (impressions IS NULL OR impressions >= 0),
  views integer CHECK (views IS NULL OR views >= 0),
  likes integer CHECK (likes IS NULL OR likes >= 0),
  comments integer CHECK (comments IS NULL OR comments >= 0),
  shares integer CHECK (shares IS NULL OR shares >= 0),
  saves integer CHECK (saves IS NULL OR saves >= 0),
  profile_visits integer CHECK (profile_visits IS NULL OR profile_visits >= 0),
  follows integer CHECK (follows IS NULL OR follows >= 0),
  metrics_collected_on timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT posts_user_published_caption_key UNIQUE (user_id, published_on, caption)
);

-- Partial unique index on external_post_id per user (allows multiple NULL external_post_ids)
CREATE UNIQUE INDEX IF NOT EXISTS posts_user_external_id_idx
  ON posts (user_id, external_post_id)
  WHERE external_post_id IS NOT NULL;

-- 4. Content Ideas table (synthesized concepts, scripts, and status changes)
CREATE TABLE IF NOT EXISTS content_ideas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic text NOT NULL,
  format text NOT NULL CHECK (format IN ('reel', 'carousel', 'static_image', 'story')),
  hook text NOT NULL,
  caption text NOT NULL,
  call_to_action text NOT NULL,
  hashtags text[] DEFAULT ARRAY[]::text[],
  script_outline text[] DEFAULT ARRAY[]::text[],
  why_recommended text DEFAULT '',
  memories_used jsonb DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'planned', 'published', 'rejected')),
  model text DEFAULT '',
  generated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 5. Campaigns table (hypotheses, experiments, and post-flight feedback)
CREATE TABLE IF NOT EXISTS campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  objective text DEFAULT '',
  hypothesis text DEFAULT '',
  format text NOT NULL CHECK (format IN ('reel', 'carousel', 'static_image', 'story')),
  topic text NOT NULL,
  planned_date date,
  actual_date date,
  expected_outcome text DEFAULT '',
  status text NOT NULL DEFAULT 'planning' CHECK (status IN ('planning', 'in_progress', 'completed', 'abandoned')),
  actual_results text DEFAULT '',
  creator_feedback text DEFAULT '',
  lessons_learned text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 6. Memory Events table (audit trail for retain/recall actions per user)
CREATE TABLE IF NOT EXISTS memory_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  operation text NOT NULL CHECK (operation IN ('retain', 'recall')),
  status text NOT NULL CHECK (status IN ('success', 'failed')),
  scope text NOT NULL,
  preview text NOT NULL,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS profiles_user_id_idx ON profiles (user_id);
CREATE INDEX IF NOT EXISTS posts_user_id_idx ON posts (user_id);
CREATE INDEX IF NOT EXISTS posts_published_on_idx ON posts (published_on DESC);
CREATE INDEX IF NOT EXISTS posts_format_idx ON posts (format);
CREATE INDEX IF NOT EXISTS content_ideas_user_id_idx ON content_ideas (user_id);
CREATE INDEX IF NOT EXISTS content_ideas_created_at_idx ON content_ideas (created_at DESC);
CREATE INDEX IF NOT EXISTS campaigns_user_id_idx ON campaigns (user_id);
CREATE INDEX IF NOT EXISTS campaigns_status_idx ON campaigns (status);
CREATE INDEX IF NOT EXISTS memory_events_user_id_idx ON memory_events (user_id);
CREATE INDEX IF NOT EXISTS memory_events_created_at_idx ON memory_events (created_at DESC);

-- Attach updated_at triggers
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_profiles_updated_at') THEN
    CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_posts_updated_at') THEN
    CREATE TRIGGER trg_posts_updated_at BEFORE UPDATE ON posts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_content_ideas_updated_at') THEN
    CREATE TRIGGER trg_content_ideas_updated_at BEFORE UPDATE ON content_ideas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_campaigns_updated_at') THEN
    CREATE TRIGGER trg_campaigns_updated_at BEFORE UPDATE ON campaigns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_memory_events_updated_at') THEN
    CREATE TRIGGER trg_memory_events_updated_at BEFORE UPDATE ON memory_events FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- 7. Enable Row Level Security (RLS) on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE memory_events ENABLE ROW LEVEL SECURITY;

-- 8. RLS Policies: Exactly 4 per table (SELECT, INSERT, UPDATE, DELETE) using auth.uid() = user_id

-- Profiles RLS
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "profiles_delete_own" ON profiles FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Posts RLS
CREATE POLICY "posts_select_own" ON posts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "posts_insert_own" ON posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "posts_update_own" ON posts FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "posts_delete_own" ON posts FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Content Ideas RLS
CREATE POLICY "content_ideas_select_own" ON content_ideas FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "content_ideas_insert_own" ON content_ideas FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "content_ideas_update_own" ON content_ideas FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "content_ideas_delete_own" ON content_ideas FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Campaigns RLS
CREATE POLICY "campaigns_select_own" ON campaigns FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "campaigns_insert_own" ON campaigns FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "campaigns_update_own" ON campaigns FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "campaigns_delete_own" ON campaigns FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Memory Events RLS
CREATE POLICY "memory_events_select_own" ON memory_events FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "memory_events_insert_own" ON memory_events FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "memory_events_update_own" ON memory_events FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "memory_events_delete_own" ON memory_events FOR DELETE TO authenticated USING (auth.uid() = user_id);
