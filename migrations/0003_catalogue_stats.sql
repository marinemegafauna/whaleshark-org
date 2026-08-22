CREATE TABLE catalogue_stats (
  id INTEGER PRIMARY KEY CHECK(id = 1),
  whale_shark_individuals INTEGER NOT NULL,
  whale_shark_encounters INTEGER NOT NULL,
  whale_shark_encounters_ytd INTEGER NOT NULL,
  all_individuals INTEGER NOT NULL,
  fetched_at TEXT NOT NULL
);
