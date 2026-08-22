CREATE TABLE contributions (
  id TEXT PRIMARY KEY,
  github_issue_number INTEGER,
  github_url TEXT,
  username TEXT NOT NULL,
  created_at TEXT NOT NULL,
  kind TEXT NOT NULL CHECK(kind IN ('feature', 'problem')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  page_url TEXT
);

CREATE INDEX idx_contributions_username_created_at ON contributions(username, created_at DESC);
