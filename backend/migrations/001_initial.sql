CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS schema_migrations (
  version text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  display_name text,
  native_language text NOT NULL DEFAULT 'ru',
  target_language text NOT NULL DEFAULT 'de',
  preferences jsonb NOT NULL DEFAULT '{
    "minCefr":"A1",
    "maxCefr":"C1",
    "practiceSize":12,
    "includeVerbs":true,
    "includePhrases":true,
    "includeAntonyms":true
  }'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS webs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  icon text,
  color text,
  generated boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, slug)
);

CREATE TABLE IF NOT EXISTS nodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  web_id uuid REFERENCES webs(id) ON DELETE SET NULL,
  canonical_key text NOT NULL,
  label text NOT NULL,
  type text NOT NULL CHECK (type IN ('topic','word','verb','phrase','concept')),
  lang text NOT NULL DEFAULT 'de',
  article text,
  plural text,
  cefr text CHECK (cefr IS NULL OR cefr IN ('A1','A2','B1','B2','C1')),
  translation_ru text,
  explanation_ru text,
  collocations jsonb NOT NULL DEFAULT '[]'::jsonb,
  examples jsonb NOT NULL DEFAULT '[]'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  generated_from_node_id uuid REFERENCES nodes(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, canonical_key)
);

CREATE TABLE IF NOT EXISTS edges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_node_id uuid NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  target_node_id uuid NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('parent_of','related_to','verb_for','collocation','prerequisite','opposite_of')),
  label_ru text,
  weight real NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, source_node_id, target_node_id, type)
);

CREATE TABLE IF NOT EXISTS knowledge (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  node_id uuid NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  recognition_score real NOT NULL DEFAULT 0,
  recall_score real NOT NULL DEFAULT 0,
  context_score real NOT NULL DEFAULT 0,
  production_score real NOT NULL DEFAULT 0,
  aggregate_score real NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'unknown' CHECK (status IN ('known','boundary','unknown')),
  seen_count integer NOT NULL DEFAULT 0,
  correct_count integer NOT NULL DEFAULT 0,
  error_count integer NOT NULL DEFAULT 0,
  last_seen_at timestamptz,
  next_review_at timestamptz NOT NULL DEFAULT now(),
  interval_days real NOT NULL DEFAULT 0,
  ease_factor real NOT NULL DEFAULT 2.5,
  repetitions integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(user_id, node_id)
);

CREATE TABLE IF NOT EXISTS review_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  node_id uuid NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  mode text NOT NULL CHECK (mode IN ('recognition','recall','context','production')),
  rating smallint NOT NULL CHECK (rating BETWEEN 0 AND 3),
  answer text,
  error_tags jsonb NOT NULL DEFAULT '[]'::jsonb,
  score_before real,
  score_after real,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title text,
  type text NOT NULL CHECK (type IN ('text','image','document')),
  storage_key text,
  source_text text,
  analysis jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','ready','failed')),
  error_message text,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type text NOT NULL,
  idempotency_key text NOT NULL,
  payload jsonb NOT NULL,
  result jsonb,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','active','completed','failed')),
  attempts integer NOT NULL DEFAULT 0,
  error_message text,
  model text,
  input_tokens integer,
  output_tokens integer,
  estimated_cost_usd numeric(12,6),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_webs_user ON webs(user_id);
CREATE INDEX IF NOT EXISTS idx_nodes_user_web ON nodes(user_id, web_id);
CREATE INDEX IF NOT EXISTS idx_nodes_user_cefr ON nodes(user_id, cefr);
CREATE INDEX IF NOT EXISTS idx_edges_user_source ON edges(user_id, source_node_id);
CREATE INDEX IF NOT EXISTS idx_edges_user_target ON edges(user_id, target_node_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_due ON knowledge(user_id, next_review_at);
CREATE INDEX IF NOT EXISTS idx_review_events_node ON review_events(user_id, node_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_materials_user_created ON materials(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_jobs_user_status ON ai_jobs(user_id, status, created_at DESC);
