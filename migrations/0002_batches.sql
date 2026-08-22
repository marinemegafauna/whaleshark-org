CREATE TABLE batches (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  site_id TEXT NOT NULL,
  observed_at TEXT NOT NULL,
  photographer_name TEXT NOT NULL,
  photographer_email TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('draft', 'processing', 'review', 'submitted', 'error')),
  wildbook_task_id TEXT
);

CREATE INDEX idx_batches_status ON batches(status);

CREATE TABLE batch_items (
  id TEXT PRIMARY KEY,
  batch_id TEXT NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  image_key TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('queued', 'uploading', 'detecting', 'matching', 'matched', 'likely_new', 'no_shark', 'error')),
  match_json TEXT,
  wildbook_task_id TEXT
);

CREATE INDEX idx_batch_items_batch ON batch_items(batch_id);
CREATE INDEX idx_batch_items_status ON batch_items(status);
