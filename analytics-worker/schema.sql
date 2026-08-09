CREATE TABLE IF NOT EXISTS page_stats (
  site_id TEXT NOT NULL,
  path TEXT NOT NULL,
  views INTEGER NOT NULL DEFAULT 0,
  active_seconds INTEGER NOT NULL DEFAULT 0,
  reading_sessions INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (site_id, path)
);

CREATE INDEX IF NOT EXISTS idx_page_stats_site_views ON page_stats (site_id, views DESC);
