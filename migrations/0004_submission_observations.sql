ALTER TABLE public_submissions ADD COLUMN observations_json TEXT;
ALTER TABLE batches ADD COLUMN observations_json TEXT;
ALTER TABLE batch_items ADD COLUMN observations_json TEXT;
