ALTER TABLE scar_records ADD COLUMN synced_at TEXT;
ALTER TABLE scar_records ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'disabled' CHECK(sync_status IN ('pending', 'synced', 'failed', 'disabled'));
ALTER TABLE scar_records ADD COLUMN sync_error TEXT;
