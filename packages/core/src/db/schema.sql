CREATE TABLE IF NOT EXISTS schema_version (version INTEGER PRIMARY KEY);
INSERT OR IGNORE INTO schema_version VALUES (1);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  adapter TEXT NOT NULL,
  cwd TEXT NOT NULL,
  started_at INTEGER NOT NULL,
  ended_at INTEGER,
  model TEXT NOT NULL,
  status TEXT NOT NULL,
  meta TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS turns (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(id),
  idx INTEGER NOT NULL,
  role TEXT NOT NULL,
  started_at INTEGER NOT NULL,
  ended_at INTEGER NOT NULL,
  text TEXT,
  tokens_input INTEGER NOT NULL DEFAULT 0,
  tokens_output INTEGER NOT NULL DEFAULT 0,
  tokens_cache_read INTEGER NOT NULL DEFAULT 0,
  tokens_cache_create INTEGER NOT NULL DEFAULT 0,
  parent_turn_id TEXT
);
CREATE INDEX IF NOT EXISTS idx_turns_session ON turns(session_id, idx);

CREATE TABLE IF NOT EXISTS tool_calls (
  id TEXT PRIMARY KEY,
  turn_id TEXT NOT NULL,
  session_id TEXT NOT NULL REFERENCES sessions(id),
  idx INTEGER NOT NULL,
  name TEXT NOT NULL,
  input TEXT,
  output TEXT,
  status TEXT NOT NULL,
  started_at INTEGER NOT NULL,
  ended_at INTEGER,
  duration_ms INTEGER,
  error_message TEXT,
  file_path TEXT
);
CREATE INDEX IF NOT EXISTS idx_tool_calls_session ON tool_calls(session_id, started_at);
CREATE INDEX IF NOT EXISTS idx_tool_calls_file ON tool_calls(file_path);

CREATE TABLE IF NOT EXISTS file_offsets (
  file_path TEXT PRIMARY KEY,
  offset_bytes INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS hook_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT,
  event TEXT NOT NULL,
  payload TEXT NOT NULL,
  ts INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_hook_events_session ON hook_events(session_id, ts);
CREATE INDEX IF NOT EXISTS idx_hook_events_ts ON hook_events(ts);
