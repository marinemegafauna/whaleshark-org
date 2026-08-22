ALTER TABLE scar_records ADD COLUMN individual_uuid TEXT;

CREATE INDEX idx_scar_records_individual_uuid ON scar_records(individual_uuid);
