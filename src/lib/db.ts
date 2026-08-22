import { mockReviewStatuses, mockScarRecords, mockSubmissions } from '../mock/data';

export type ReviewStatus = 'needs_record' | 'recorded' | 'no_new_scars';

export interface ScarRecord {
  id: string;
  species_id: string;
  schema_version: string;
  encounter_id: string;
  individual_id: string | null;
  site_id: string;
  observer: string;
  recorded_at: string;
  photo_asset_id: string | null;
  x: number | null;
  y: number | null;
  fields_json: string;
  notes: string | null;
  first_seen_encounter_id: string | null;
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
}

export interface SessionRecord {
  id: string;
  wildbook_cookie: string;
  username: string;
  created_at: string;
  expires_at: string;
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
  updateSubmission(id: string, patch: Partial<PublicSubmission>): Promise<PublicSubmission>;
  createSession(session: SessionRecord): Promise<SessionRecord>;
  getSession(id: string): Promise<SessionRecord | null>;
}

class MemoryStore implements DataStore {
  private scars: ScarRecord[] = [];
  private reviews: EncounterReview[] = [];
  private submissions: PublicSubmission[] = [];
  private sessions: SessionRecord[] = [];

  constructor() {
    this.reset();
  }

  reset() {
    this.scars = structuredClone(mockScarRecords);
    this.reviews = structuredClone(mockReviewStatuses);
    this.submissions = structuredClone(mockSubmissions);
    this.sessions = [];
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

  async updateSubmission(id: string, patch: Partial<PublicSubmission>) {
    const index = this.submissions.findIndex((submission) => submission.id === id);
    if (index < 0) throw new Error(`Submission not found: ${id}`);
    const updated = { ...this.submissions[index]!, ...patch, id };
    this.submissions[index] = updated;
    return updated;
  }

  async createSession(session: SessionRecord) {
    this.sessions.push(structuredClone(session));
    return session;
  }

  async getSession(id: string) {
    const session = this.sessions.find((candidate) => candidate.id === id);
    return session && new Date(session.expires_at) > new Date() ? session : null;
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
    await this.db.prepare(`INSERT INTO scar_records (id, species_id, schema_version, encounter_id, individual_id, site_id, observer, recorded_at, photo_asset_id, x, y, fields_json, notes, first_seen_encounter_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(record.id, record.species_id, record.schema_version, record.encounter_id, record.individual_id, record.site_id, record.observer, record.recorded_at, record.photo_asset_id, record.x, record.y, record.fields_json, record.notes, record.first_seen_encounter_id).run();
    return record;
  }

  async updateScarRecord(id: string, patch: Partial<ScarRecord>) {
    const current = (await this.db.prepare('SELECT * FROM scar_records WHERE id = ?').bind(id).first<ScarRecord>());
    if (!current) throw new Error(`Scar record not found: ${id}`);
    const record = { ...current, ...patch, id };
    await this.db.prepare(`UPDATE scar_records SET species_id=?, schema_version=?, encounter_id=?, individual_id=?, site_id=?, observer=?, recorded_at=?, photo_asset_id=?, x=?, y=?, fields_json=?, notes=?, first_seen_encounter_id=? WHERE id=?`)
      .bind(record.species_id, record.schema_version, record.encounter_id, record.individual_id, record.site_id, record.observer, record.recorded_at, record.photo_asset_id, record.x, record.y, record.fields_json, record.notes, record.first_seen_encounter_id, id).run();
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
    await this.db.prepare(`INSERT INTO public_submissions (id, created_at, photographer_name, photographer_email, site_id, observed_at, image_key, wildbook_encounter_id, status, match_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(submission.id, submission.created_at, submission.photographer_name, submission.photographer_email, submission.site_id, submission.observed_at, submission.image_key, submission.wildbook_encounter_id, submission.status, submission.match_json).run();
    return submission;
  }

  getSubmission(id: string) {
    return this.db.prepare('SELECT * FROM public_submissions WHERE id = ?').bind(id).first<PublicSubmission>();
  }

  async updateSubmission(id: string, patch: Partial<PublicSubmission>) {
    const current = await this.getSubmission(id);
    if (!current) throw new Error(`Submission not found: ${id}`);
    const record = { ...current, ...patch, id };
    await this.db.prepare(`UPDATE public_submissions SET created_at=?, photographer_name=?, photographer_email=?, site_id=?, observed_at=?, image_key=?, wildbook_encounter_id=?, status=?, match_json=? WHERE id=?`)
      .bind(record.created_at, record.photographer_name, record.photographer_email, record.site_id, record.observed_at, record.image_key, record.wildbook_encounter_id, record.status, record.match_json, id).run();
    return record;
  }

  async createSession(session: SessionRecord) {
    await this.db.prepare('INSERT INTO sessions (id, wildbook_cookie, username, created_at, expires_at) VALUES (?, ?, ?, ?, ?)').bind(session.id, session.wildbook_cookie, session.username, session.created_at, session.expires_at).run();
    return session;
  }

  getSession(id: string) {
    return this.db.prepare('SELECT * FROM sessions WHERE id = ? AND expires_at > ?').bind(id, new Date().toISOString()).first<SessionRecord>();
  }
}

export function createDataStore(db?: D1Database, mock = false): DataStore {
  if (mock) return memoryStore;
  if (!db) throw new Error('DB D1 binding is required outside mock mode');
  return new D1Store(db);
}
