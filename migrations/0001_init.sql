CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  wildbook_cookie TEXT NOT NULL,
  username TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE TABLE scar_records (
  id TEXT PRIMARY KEY,
  species_id TEXT NOT NULL,
  schema_version TEXT NOT NULL,
  encounter_id TEXT NOT NULL,
  individual_id TEXT,
  site_id TEXT NOT NULL,
  observer TEXT NOT NULL,
  recorded_at TEXT NOT NULL,
  photo_asset_id TEXT,
  x REAL,
  y REAL,
  fields_json TEXT NOT NULL,
  notes TEXT,
  first_seen_encounter_id TEXT
);
CREATE INDEX idx_scar_records_encounter ON scar_records(encounter_id);
CREATE INDEX idx_scar_records_individual ON scar_records(individual_id);

CREATE TABLE encounter_review (
  encounter_id TEXT PRIMARY KEY,
  species_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('needs_record', 'recorded', 'no_new_scars')),
  reviewed_by TEXT,
  reviewed_at TEXT
);

CREATE TABLE public_submissions (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  photographer_name TEXT NOT NULL,
  photographer_email TEXT NOT NULL,
  site_id TEXT NOT NULL,
  observed_at TEXT NOT NULL,
  image_key TEXT NOT NULL,
  wildbook_encounter_id TEXT,
  status TEXT NOT NULL,
  match_json TEXT
);
