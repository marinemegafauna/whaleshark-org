-- Method v0.1 (Section 4.1): the explicit zero. An `examined_clean` review lists the regions
-- actually inspected; `not_examined` records a photographed-but-not-inspected shark.
-- `site_id` / `individual_id` let the CSV export list zero rows per site with a shark id without a scar row.
-- SQLite cannot alter a CHECK constraint, so the table is rebuilt. `no_new_scars` rows are kept as-is (site/individual NULL).
CREATE TABLE encounter_review_v2 (
  encounter_id TEXT PRIMARY KEY,
  species_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('needs_record', 'recorded', 'no_new_scars', 'examined_clean', 'not_examined')),
  reviewed_by TEXT,
  reviewed_at TEXT,
  regions_examined TEXT,
  site_id TEXT,
  individual_id TEXT,
  individual_uuid TEXT
);
INSERT INTO encounter_review_v2 (encounter_id, species_id, status, reviewed_by, reviewed_at)
  SELECT encounter_id, species_id, status, reviewed_by, reviewed_at FROM encounter_review;
DROP TABLE encounter_review;
ALTER TABLE encounter_review_v2 RENAME TO encounter_review;
