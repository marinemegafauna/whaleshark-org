ALTER TABLE public_submissions ADD COLUMN provenance_json TEXT;
ALTER TABLE public_submissions ADD COLUMN sha256 TEXT;
ALTER TABLE batch_items ADD COLUMN provenance_json TEXT;
ALTER TABLE batch_items ADD COLUMN sha256 TEXT;

CREATE INDEX idx_public_submissions_sha256 ON public_submissions(sha256);
CREATE INDEX idx_batch_items_sha256 ON batch_items(sha256);
