import { mockBatchItems, mockBatches, mockReviewStatuses, mockScarRecords, mockSubmissions } from '../mock/data';

export type ReviewStatus = 'needs_record' | 'recorded' | 'no_new_scars';
export type BatchStatus = 'draft' | 'processing' | 'review' | 'submitted' | 'error';
export type BatchItemStatus = 'queued' | 'uploading' | 'detecting' | 'matching' | 'matched' | 'likely_new' | 'no_shark' | 'error';
export type ScarSyncStatus = 'pending' | 'synced' | 'failed' | 'disabled';

export interface Batch {
  id: string;
  created_at: string;
  updated_at: string;
  site_id: string;
  observed_at: string;
  photographer_name: string;
  photographer_email: string;
  observations_json: string | null;
  status: BatchStatus;
  wildbook_task_id: string | null;
}

export interface BatchItem {
  id: string;
  batch_id: string;
  created_at: string;
  filename: string;
  mime_type: string;
  size_bytes: number;
  image_key: string;
  status: BatchItemStatus;
  match_json: string | null;
  observations_json: string | null;
  wildbook_task_id: string | null;
  provenance_json: string | null;
  sha256: string | null;
}

export interface ScarRecord {
  id: string;
  species_id: string;
  schema_version: string;
  encounter_id: string;
  individual_id: string | null;
  individual_uuid: string | null;
  site_id: string;
  observer: string;
  recorded_at: string;
  photo_asset_id: string | null;
  x: number | null;
  y: number | null;
  fields_json: string;
  notes: string | null;
  first_seen_encounter_id: string | null;
  synced_at: string | null;
  sync_status: ScarSyncStatus;
  sync_error: string | null;
}

export interface EncounterReview {
  encounter_id: string;
  species_id: string;
  status: ReviewStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
}

export interface PublicSubmission {
  id: string;
  created_at: string;
  photographer_name: string;
  photographer_email: string;
  site_id: string;
  observed_at: string;
  image_key: string;
  wildbook_encounter_id: string | null;
  status: string;
  match_json: string | null;
  observations_json: string | null;
  provenance_json: string | null;
  sha256: string | null;
}

export interface ImageHashMatch {
  source: 'submission' | 'batch_item';
  id: string;
  batch_id: string | null;
}

export interface SessionRecord {
  id: string;
  wildbook_cookie: string;
  username: string;
  created_at: string;
  expires_at: string;
}

export interface CatalogueStats {
  whale_shark_individuals: number;
  whale_shark_encounters: number;
  whale_shark_encounters_ytd: number;
  all_individuals: number;
  fetched_at: string;
}

export type ContributionKind = 'feature' | 'problem';

export interface Contribution {
  id: string;
  github_issue_number: number | null;
  github_url: string | null;
  username: string;
  created_at: string;
  kind: ContributionKind;
  title: string;
  description: string;
  page_url: string | null;
}

export interface DataStore {
  listScarRecords(filter?: { encounterId?: string; individualId?: string }): Promise<ScarRecord[]>;
  createScarRecord(record: ScarRecord): Promise<ScarRecord>;
  updateScarRecord(id: string, patch: Partial<ScarRecord>): Promise<ScarRecord>;
  getReviewStatus(encounterId: string): Promise<EncounterReview | null>;
  listReviewStatuses(): Promise<EncounterReview[]>;
  setReviewStatus(encounterId: string, speciesId: string, status: ReviewStatus, reviewedBy: string): Promise<EncounterReview>;
  createSubmission(submission: PublicSubmission): Promise<PublicSubmission>;
  getSubmission(id: string): Promise<PublicSubmission | null>;
  listSubmissions(): Promise<PublicSubmission[]>;
  updateSubmission(id: string, patch: Partial<PublicSubmission>): Promise<PublicSubmission>;
  createBatch(batch: Batch): Promise<Batch>;
  getBatch(id: string): Promise<Batch | null>;
  listBatches(filter?: { status?: BatchStatus }): Promise<Batch[]>;
  updateBatch(id: string, patch: Partial<Batch>): Promise<Batch>;
  createBatchItem(item: BatchItem): Promise<BatchItem>;
  listBatchItems(batchId: string): Promise<BatchItem[]>;
  updateBatchItem(id: string, patch: Partial<BatchItem>): Promise<BatchItem>;
  findBySha256(hash: string): Promise<ImageHashMatch[]>;
  createSession(session: SessionRecord): Promise<SessionRecord>;
  getSession(id: string): Promise<SessionRecord | null>;
  saveCatalogueStats(stats: CatalogueStats): Promise<CatalogueStats>;
  getCatalogueStats(): Promise<CatalogueStats | null>;
  createContributionIfAllowed(contribution: Contribution, notBefore: string): Promise<boolean>;
  updateContributionIssue(id: string, issueNumber: number, issueUrl: string): Promise<Contribution>;
  listContributions(): Promise<Contribution[]>;
}

class MemoryStore implements DataStore {
  private scars: ScarRecord[] = [];
  private reviews: EncounterReview[] = [];
  private submissions: PublicSubmission[] = [];
  private batches: Batch[] = [];
  private batchItems: BatchItem[] = [];
  private sessions: SessionRecord[] = [];
  private contributions: Contribution[] = [];
  private catalogueStats: CatalogueStats | null = null;

  constructor() {
    this.reset();
  }

  reset() {
    this.scars = structuredClone(mockScarRecords);
    this.reviews = structuredClone(mockReviewStatuses);
    this.submissions = structuredClone(mockSubmissions);
    this.batches = structuredClone(mockBatches);
    this.batchItems = structuredClone(mockBatchItems);
    this.sessions = [];
    this.contributions = [];
    this.catalogueStats = null;
    return this;
  }

  async listScarRecords(filter: { encounterId?: string; individualId?: string } = {}) {
    return this.scars.filter(
      (record) => (!filter.encounterId || record.encounter_id === filter.encounterId) && (!filter.individualId || record.individual_id === filter.individualId),
    );
  }

  async createScarRecord(record: ScarRecord) {
    this.scars.push(structuredClone(record));
    return record;
  }

  async updateScarRecord(id: string, patch: Partial<ScarRecord>) {
    const index = this.scars.findIndex((record) => record.id === id);
    if (index < 0) throw new Error(`Scar record not found: ${id}`);
    const updated = { ...this.scars[index]!, ...patch, id };
    this.scars[index] = updated;
    return updated;
  }

  async getReviewStatus(encounterId: string) {
    return this.reviews.find((review) => review.encounter_id === encounterId) ?? null;
  }

  async listReviewStatuses() {
    return this.reviews;
  }

  async setReviewStatus(encounterId: string, speciesId: string, status: ReviewStatus, reviewedBy: string) {
    const review: EncounterReview = { encounter_id: encounterId, species_id: speciesId, status, reviewed_by: reviewedBy, reviewed_at: new Date().toISOString() };
    const index = this.reviews.findIndex((candidate) => candidate.encounter_id === encounterId);
    if (index >= 0) this.reviews[index] = review;
    else this.reviews.push(review);
    return review;
  }

  async createSubmission(submission: PublicSubmission) {
    this.submissions.push(structuredClone(submission));
    return submission;
  }

  async getSubmission(id: string) {
    return this.submissions.find((submission) => submission.id === id) ?? null;
  }

  async listSubmissions() {
    return structuredClone(this.submissions);
  }

  async updateSubmission(id: string, patch: Partial<PublicSubmission>) {
    const index = this.submissions.findIndex((submission) => submission.id === id);
    if (index < 0) throw new Error(`Submission not found: ${id}`);
    const updated = { ...this.submissions[index]!, ...patch, id };
    this.submissions[index] = updated;
    return updated;
  }

  async createBatch(batch: Batch) {
    this.batches.push(structuredClone(batch));
    return batch;
  }

  async getBatch(id: string) {
    return this.batches.find((batch) => batch.id === id) ?? null;
  }

  async listBatches(filter: { status?: BatchStatus } = {}) {
    return this.batches.filter((batch) => !filter.status || batch.status === filter.status);
  }

  async updateBatch(id: string, patch: Partial<Batch>) {
    const index = this.batches.findIndex((batch) => batch.id === id);
    if (index < 0) throw new Error(`Batch not found: ${id}`);
    const updated = { ...this.batches[index]!, ...patch, id };
    this.batches[index] = updated;
    return updated;
  }

  async createBatchItem(item: BatchItem) {
    this.batchItems.push(structuredClone(item));
    return item;
  }

  async listBatchItems(batchId: string) {
    return this.batchItems.filter((item) => item.batch_id === batchId);
  }

  async updateBatchItem(id: string, patch: Partial<BatchItem>) {
    const index = this.batchItems.findIndex((item) => item.id === id);
    if (index < 0) throw new Error(`Batch item not found: ${id}`);
    const updated = { ...this.batchItems[index]!, ...patch, id };
    this.batchItems[index] = updated;
    return updated;
  }

  async findBySha256(hash: string): Promise<ImageHashMatch[]> {
    return [
      ...this.submissions.filter((submission) => submission.sha256 === hash).map((submission) => ({ source: 'submission' as const, id: submission.id, batch_id: null })),
      ...this.batchItems.filter((item) => item.sha256 === hash).map((item) => ({ source: 'batch_item' as const, id: item.id, batch_id: item.batch_id })),
    ];
  }

  async createSession(session: SessionRecord) {
    this.sessions.push(structuredClone(session));
    return session;
  }

  async getSession(id: string) {
    const session = this.sessions.find((candidate) => candidate.id === id);
    return session && new Date(session.expires_at) > new Date() ? session : null;
  }

  async saveCatalogueStats(stats: CatalogueStats) {
    this.catalogueStats = structuredClone(stats);
    return stats;
  }

  async getCatalogueStats() {
    return this.catalogueStats ? structuredClone(this.catalogueStats) : null;
  }

  async createContributionIfAllowed(contribution: Contribution, notBefore: string) {
    const tooRecent = this.contributions.some(
      (candidate) => candidate.username === contribution.username && candidate.created_at > notBefore,
    );
    if (tooRecent) return false;
    this.contributions.push(structuredClone(contribution));
    return true;
  }

  async updateContributionIssue(id: string, issueNumber: number, issueUrl: string) {
    const index = this.contributions.findIndex((contribution) => contribution.id === id);
    if (index < 0) throw new Error(`Contribution not found: ${id}`);
    const updated = { ...this.contributions[index]!, github_issue_number: issueNumber, github_url: issueUrl };
    this.contributions[index] = updated;
    return structuredClone(updated);
  }

  async listContributions() {
    return structuredClone(this.contributions);
  }
}

const memoryStore = new MemoryStore();
export function createMemoryStore(): MemoryStore {
  return memoryStore;
}

class D1Store implements DataStore {
  constructor(private readonly db: D1Database) {}

  async listScarRecords(filter: { encounterId?: string; individualId?: string } = {}) {
    let query = 'SELECT * FROM scar_records WHERE 1=1';
    const values: unknown[] = [];
    if (filter.encounterId) { query += ' AND encounter_id = ?'; values.push(filter.encounterId); }
    if (filter.individualId) { query += ' AND individual_id = ?'; values.push(filter.individualId); }
    const result = await this.db.prepare(`${query} ORDER BY recorded_at`).bind(...values).all<ScarRecord>();
    return result.results;
  }

  async createScarRecord(record: ScarRecord) {
    await this.db.prepare(`INSERT INTO scar_records (id, species_id, schema_version, encounter_id, individual_id, individual_uuid, site_id, observer, recorded_at, photo_asset_id, x, y, fields_json, notes, first_seen_encounter_id, synced_at, sync_status, sync_error) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(record.id, record.species_id, record.schema_version, record.encounter_id, record.individual_id, record.individual_uuid, record.site_id, record.observer, record.recorded_at, record.photo_asset_id, record.x, record.y, record.fields_json, record.notes, record.first_seen_encounter_id, record.synced_at, record.sync_status, record.sync_error).run();
    return record;
  }

  async updateScarRecord(id: string, patch: Partial<ScarRecord>) {
    const current = (await this.db.prepare('SELECT * FROM scar_records WHERE id = ?').bind(id).first<ScarRecord>());
    if (!current) throw new Error(`Scar record not found: ${id}`);
    const record = { ...current, ...patch, id };
    await this.db.prepare(`UPDATE scar_records SET species_id=?, schema_version=?, encounter_id=?, individual_id=?, individual_uuid=?, site_id=?, observer=?, recorded_at=?, photo_asset_id=?, x=?, y=?, fields_json=?, notes=?, first_seen_encounter_id=?, synced_at=?, sync_status=?, sync_error=? WHERE id=?`)
      .bind(record.species_id, record.schema_version, record.encounter_id, record.individual_id, record.individual_uuid, record.site_id, record.observer, record.recorded_at, record.photo_asset_id, record.x, record.y, record.fields_json, record.notes, record.first_seen_encounter_id, record.synced_at, record.sync_status, record.sync_error, id).run();
    return record;
  }

  getReviewStatus(encounterId: string) {
    return this.db.prepare('SELECT * FROM encounter_review WHERE encounter_id = ?').bind(encounterId).first<EncounterReview>();
  }

  async listReviewStatuses() {
    return (await this.db.prepare('SELECT * FROM encounter_review').all<EncounterReview>()).results;
  }

  async setReviewStatus(encounterId: string, speciesId: string, status: ReviewStatus, reviewedBy: string) {
    const review: EncounterReview = { encounter_id: encounterId, species_id: speciesId, status, reviewed_by: reviewedBy, reviewed_at: new Date().toISOString() };
    await this.db.prepare(`INSERT INTO encounter_review (encounter_id, species_id, status, reviewed_by, reviewed_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(encounter_id) DO UPDATE SET species_id=excluded.species_id, status=excluded.status, reviewed_by=excluded.reviewed_by, reviewed_at=excluded.reviewed_at`)
      .bind(review.encounter_id, review.species_id, review.status, review.reviewed_by, review.reviewed_at).run();
    return review;
  }

  async createSubmission(submission: PublicSubmission) {
    await this.db.prepare(`INSERT INTO public_submissions (id, created_at, photographer_name, photographer_email, site_id, observed_at, image_key, wildbook_encounter_id, status, match_json, observations_json, provenance_json, sha256) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(submission.id, submission.created_at, submission.photographer_name, submission.photographer_email, submission.site_id, submission.observed_at, submission.image_key, submission.wildbook_encounter_id, submission.status, submission.match_json, submission.observations_json, submission.provenance_json, submission.sha256).run();
    return submission;
  }

  getSubmission(id: string) {
    return this.db.prepare('SELECT * FROM public_submissions WHERE id = ?').bind(id).first<PublicSubmission>();
  }

  async listSubmissions() {
    return (await this.db.prepare('SELECT * FROM public_submissions ORDER BY created_at DESC').all<PublicSubmission>()).results;
  }

  async updateSubmission(id: string, patch: Partial<PublicSubmission>) {
    const current = await this.getSubmission(id);
    if (!current) throw new Error(`Submission not found: ${id}`);
    const record = { ...current, ...patch, id };
    await this.db.prepare(`UPDATE public_submissions SET created_at=?, photographer_name=?, photographer_email=?, site_id=?, observed_at=?, image_key=?, wildbook_encounter_id=?, status=?, match_json=?, observations_json=?, provenance_json=?, sha256=? WHERE id=?`)
      .bind(record.created_at, record.photographer_name, record.photographer_email, record.site_id, record.observed_at, record.image_key, record.wildbook_encounter_id, record.status, record.match_json, record.observations_json, record.provenance_json, record.sha256, id).run();
    return record;
  }

  async createBatch(batch: Batch) {
    await this.db.prepare(`INSERT INTO batches (id, created_at, updated_at, site_id, observed_at, photographer_name, photographer_email, observations_json, status, wildbook_task_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(batch.id, batch.created_at, batch.updated_at, batch.site_id, batch.observed_at, batch.photographer_name, batch.photographer_email, batch.observations_json, batch.status, batch.wildbook_task_id).run();
    return batch;
  }

  getBatch(id: string) {
    return this.db.prepare('SELECT * FROM batches WHERE id = ?').bind(id).first<Batch>();
  }

  async listBatches(filter: { status?: BatchStatus } = {}) {
    const statement = filter.status
      ? this.db.prepare('SELECT * FROM batches WHERE status = ? ORDER BY created_at DESC').bind(filter.status)
      : this.db.prepare('SELECT * FROM batches ORDER BY created_at DESC');
    return (await statement.all<Batch>()).results;
  }

  async updateBatch(id: string, patch: Partial<Batch>) {
    const current = await this.getBatch(id);
    if (!current) throw new Error(`Batch not found: ${id}`);
    const record = { ...current, ...patch, id };
    await this.db.prepare(`UPDATE batches SET created_at=?, updated_at=?, site_id=?, observed_at=?, photographer_name=?, photographer_email=?, observations_json=?, status=?, wildbook_task_id=? WHERE id=?`)
      .bind(record.created_at, record.updated_at, record.site_id, record.observed_at, record.photographer_name, record.photographer_email, record.observations_json, record.status, record.wildbook_task_id, id).run();
    return record;
  }

  async createBatchItem(item: BatchItem) {
    await this.db.prepare(`INSERT INTO batch_items (id, batch_id, created_at, filename, mime_type, size_bytes, image_key, status, match_json, observations_json, wildbook_task_id, provenance_json, sha256) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(item.id, item.batch_id, item.created_at, item.filename, item.mime_type, item.size_bytes, item.image_key, item.status, item.match_json, item.observations_json, item.wildbook_task_id, item.provenance_json, item.sha256).run();
    return item;
  }

  async listBatchItems(batchId: string) {
    return (await this.db.prepare('SELECT * FROM batch_items WHERE batch_id = ? ORDER BY created_at, id').bind(batchId).all<BatchItem>()).results;
  }

  async updateBatchItem(id: string, patch: Partial<BatchItem>) {
    const current = await this.db.prepare('SELECT * FROM batch_items WHERE id = ?').bind(id).first<BatchItem>();
    if (!current) throw new Error(`Batch item not found: ${id}`);
    const record = { ...current, ...patch, id };
    await this.db.prepare(`UPDATE batch_items SET batch_id=?, created_at=?, filename=?, mime_type=?, size_bytes=?, image_key=?, status=?, match_json=?, observations_json=?, wildbook_task_id=?, provenance_json=?, sha256=? WHERE id=?`)
      .bind(record.batch_id, record.created_at, record.filename, record.mime_type, record.size_bytes, record.image_key, record.status, record.match_json, record.observations_json, record.wildbook_task_id, record.provenance_json, record.sha256, id).run();
    return record;
  }

  async findBySha256(hash: string): Promise<ImageHashMatch[]> {
    const result = await this.db.prepare(`SELECT 'submission' AS source, id, NULL AS batch_id FROM public_submissions WHERE sha256 = ? UNION ALL SELECT 'batch_item' AS source, id, batch_id FROM batch_items WHERE sha256 = ?`)
      .bind(hash, hash).all<ImageHashMatch>();
    return result.results;
  }

  async createSession(session: SessionRecord) {
    await this.db.prepare('INSERT INTO sessions (id, wildbook_cookie, username, created_at, expires_at) VALUES (?, ?, ?, ?, ?)').bind(session.id, session.wildbook_cookie, session.username, session.created_at, session.expires_at).run();
    return session;
  }

  getSession(id: string) {
    return this.db.prepare('SELECT * FROM sessions WHERE id = ? AND expires_at > ?').bind(id, new Date().toISOString()).first<SessionRecord>();
  }

  async saveCatalogueStats(stats: CatalogueStats) {
    await this.db.prepare(`INSERT INTO catalogue_stats (id, whale_shark_individuals, whale_shark_encounters, whale_shark_encounters_ytd, all_individuals, fetched_at) VALUES (1, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET whale_shark_individuals=excluded.whale_shark_individuals, whale_shark_encounters=excluded.whale_shark_encounters, whale_shark_encounters_ytd=excluded.whale_shark_encounters_ytd, all_individuals=excluded.all_individuals, fetched_at=excluded.fetched_at`)
      .bind(stats.whale_shark_individuals, stats.whale_shark_encounters, stats.whale_shark_encounters_ytd, stats.all_individuals, stats.fetched_at).run();
    return stats;
  }

  getCatalogueStats() {
    return this.db.prepare('SELECT whale_shark_individuals, whale_shark_encounters, whale_shark_encounters_ytd, all_individuals, fetched_at FROM catalogue_stats WHERE id = 1').first<CatalogueStats>();
  }

  async createContributionIfAllowed(contribution: Contribution, notBefore: string) {
    const result = await this.db.prepare(`INSERT INTO contributions (id, github_issue_number, github_url, username, created_at, kind, title, description, page_url)
      SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?
      WHERE NOT EXISTS (SELECT 1 FROM contributions WHERE username = ? AND created_at > ?)`)
      .bind(
        contribution.id,
        contribution.github_issue_number,
        contribution.github_url,
        contribution.username,
        contribution.created_at,
        contribution.kind,
        contribution.title,
        contribution.description,
        contribution.page_url,
        contribution.username,
        notBefore,
      ).run();
    return (result.meta.changes ?? 0) > 0;
  }

  async updateContributionIssue(id: string, issueNumber: number, issueUrl: string) {
    await this.db.prepare('UPDATE contributions SET github_issue_number = ?, github_url = ? WHERE id = ?')
      .bind(issueNumber, issueUrl, id).run();
    const updated = await this.db.prepare('SELECT * FROM contributions WHERE id = ?').bind(id).first<Contribution>();
    if (!updated) throw new Error(`Contribution not found: ${id}`);
    return updated;
  }

  async listContributions() {
    return (await this.db.prepare('SELECT * FROM contributions ORDER BY created_at DESC').all<Contribution>()).results;
  }
}

export function createDataStore(db?: D1Database, mock = false): DataStore {
  if (mock) return memoryStore;
  if (!db) throw new Error('DB D1 binding is required outside mock mode');
  return new D1Store(db);
}

export function createCatalogueDataStore(db?: D1Database): DataStore {
  return db ? new D1Store(db) : memoryStore;
}
