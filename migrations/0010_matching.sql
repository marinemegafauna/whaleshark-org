CREATE TABLE match_batches (
  id TEXT PRIMARY KEY, title TEXT NOT NULL, site_id TEXT,
  batch_json TEXT NOT NULL, imported_at TEXT NOT NULL
);
CREATE TABLE match_cards (
  batch_id TEXT NOT NULL, query_enc TEXT NOT NULL, card_index INTEGER NOT NULL,
  cls TEXT NOT NULL, card_json TEXT NOT NULL, PRIMARY KEY (batch_id, query_enc)
);
CREATE TABLE match_card_cache (
  batch_id TEXT NOT NULL, query_enc TEXT NOT NULL, hydrated_json TEXT NOT NULL,
  fetched_at TEXT NOT NULL, PRIMARY KEY (batch_id, query_enc)
);
CREATE TABLE match_verdicts (
  batch_id TEXT NOT NULL, query_enc TEXT NOT NULL,
  verdict TEXT NOT NULL CHECK (verdict IN ('new','same','cant_tell')),
  candidate_key TEXT, candidate_label TEXT, notes TEXT, scar_notes TEXT,
  reviewer TEXT, updated_at TEXT NOT NULL, PRIMARY KEY (batch_id, query_enc)
);
CREATE TABLE match_verdict_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT, batch_id TEXT NOT NULL, query_enc TEXT NOT NULL,
  verdict TEXT, candidate_key TEXT, notes TEXT, scar_notes TEXT, reviewer TEXT, at TEXT NOT NULL
);
