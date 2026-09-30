import { parseMatchBatch, type MatchBatch, type MatchCard } from './match-batch';
import type { HydratedCard } from './match-live';
export type Verdict = 'new' | 'same' | 'cant_tell';
export interface MatchVerdict {
  batch_id: string; query_enc: string; verdict: Verdict; candidate_key: string | null; candidate_label: string | null;
  notes: string | null; scar_notes: string | null; reviewer: string | null; updated_at: string;
}
export type VerdictInput = Omit<MatchVerdict, 'batch_id' | 'query_enc' | 'updated_at'>;
export type StoredCard = MatchCard & { verdict: MatchVerdict | null };
export type BatchSummary = Omit<MatchBatch, 'cards'> & { imported_at: string; cards: number; decided: number; by_cls: Record<string, number> };
export interface MatchingStore {
  importBatch(batch: MatchBatch): Promise<void>;
  listBatches(): Promise<BatchSummary[]>;
  getBatch(id: string): Promise<MatchBatch | null>;
  listCards(batchId: string): Promise<StoredCard[]>;
  getCard(batchId: string, queryEnc: string): Promise<StoredCard | null>;
  getCache(batchId: string, queryEnc: string): Promise<HydratedCard | null>;
  putCache(batchId: string, queryEnc: string, hydrated: HydratedCard): Promise<void>;
  setVerdict(batchId: string, queryEnc: string, verdict: VerdictInput | null, reviewer?: string): Promise<MatchVerdict | null>;
  getVerdicts(batchId: string): Promise<MatchVerdict[]>;
}
function summary(batch: MatchBatch, imported_at: string, cards: StoredCard[]): BatchSummary {
  const { cards: _, ...metadata } = batch;
  const by_cls: Record<string, number> = {};
  cards.forEach(c => { by_cls[c.cls] = (by_cls[c.cls] ?? 0) + 1; });
  return { ...metadata, imported_at, cards: cards.length, decided: cards.filter(c => c.verdict).length, by_cls };
}
const key = (b: string, q: string) => JSON.stringify([b,q]);
export class MemoryMatchingStore implements MatchingStore {
  private batches = new Map<string, { batch: MatchBatch; imported: string }>();
  private verdicts = new Map<string, MatchVerdict>();
  private cache = new Map<string, HydratedCard>();
  readonly log: { batch_id: string; query_enc: string; verdict: Verdict | null; candidate_key: string | null; notes: string | null; scar_notes: string | null; reviewer: string | null; at: string }[] = [];
  async importBatch(input: MatchBatch) {
    const batch = parseMatchBatch(input);
    this.batches.set(batch.id, { batch: structuredClone(batch), imported: new Date().toISOString() });
  }
  async listBatches() {
    return Promise.all([...this.batches.values()].sort((a,b) => b.imported.localeCompare(a.imported)).map(async b => summary(b.batch, b.imported, await this.listCards(b.batch.id))));
  }
  async getBatch(id: string) { return structuredClone(this.batches.get(id)?.batch ?? null); }
  async listCards(batchId: string): Promise<StoredCard[]> {
    return (this.batches.get(batchId)?.batch.cards ?? []).map(c => ({ ...structuredClone(c), verdict: structuredClone(this.verdicts.get(key(batchId,c.query_enc)) ?? null) })).sort((a,b) => a.index-b.index);
  }
  async getCard(b: string, q: string) { return (await this.listCards(b)).find(c => c.query_enc === q) ?? null; }
  async getCache(b: string, q: string) { return structuredClone(this.cache.get(key(b,q)) ?? null); }
  async putCache(b: string, q: string, h: HydratedCard) { this.cache.set(key(b,q),structuredClone(h)); }
  async setVerdict(b: string, q: string, input: VerdictInput | null, reviewer?: string) {
    const at = new Date().toISOString();
    const verdict = input ? { ...input, batch_id:b, query_enc:q, updated_at:at } : null;
    if (verdict) this.verdicts.set(key(b,q),verdict); else this.verdicts.delete(key(b,q));
    this.log.push({ batch_id:b, query_enc:q, verdict:input?.verdict ?? null, candidate_key:input?.candidate_key ?? null, notes:input?.notes ?? null, scar_notes:input?.scar_notes ?? null, reviewer:input?.reviewer ?? reviewer ?? null, at });
    return verdict;
  }
  async getVerdicts(b: string) { return structuredClone([...this.verdicts.values()].filter(v => v.batch_id === b)); }
}
export class D1MatchingStore implements MatchingStore {
  constructor(private db: D1Database) {}
  async importBatch(input: MatchBatch) {
    const batch = parseMatchBatch(input), { cards, ...meta } = batch;
    const statements = [this.db.prepare('INSERT OR REPLACE INTO match_batches (id,title,site_id,batch_json,imported_at) VALUES (?,?,?,?,?)').bind(batch.id,batch.title,batch.site,JSON.stringify(meta),new Date().toISOString())];
    statements.push(this.db.prepare(`DELETE FROM match_cards WHERE batch_id=?${cards.length ? ` AND query_enc NOT IN (${cards.map(()=>'?').join(',')})` : ''}`).bind(batch.id,...cards.map(c=>c.query_enc)));
    for (const c of cards) statements.push(this.db.prepare('INSERT OR REPLACE INTO match_cards (batch_id,query_enc,card_index,cls,card_json) VALUES (?,?,?,?,?)').bind(batch.id,c.query_enc,c.index,c.cls,JSON.stringify(c)));
    // Atomic imports leave current verdicts and the append-only audit log untouched.
    await this.db.batch(statements);
  }
  async listBatches() {
    const { results } = await this.db.prepare('SELECT id,batch_json,imported_at FROM match_batches ORDER BY imported_at DESC').all<{id:string;batch_json:string;imported_at:string}>();
    return Promise.all(results.map(async r => summary({...JSON.parse(r.batch_json),cards:[]}, r.imported_at, await this.listCards(r.id))));
  }
  async getBatch(id: string) {
    const r = await this.db.prepare('SELECT batch_json FROM match_batches WHERE id=?').bind(id).first<{batch_json:string}>();
    if (!r) return null;
    const cards = (await this.listCards(id)).map(({verdict:_,...c})=>c);
    return parseMatchBatch({...JSON.parse(r.batch_json),cards});
  }
  async listCards(b: string): Promise<StoredCard[]> {
    const { results } = await this.db.prepare('SELECT card_json FROM match_cards WHERE batch_id=? ORDER BY card_index').bind(b).all<{card_json:string}>();
    const verdicts = new Map((await this.getVerdicts(b)).map(v=>[v.query_enc,v]));
    return results.map(r=>{ const c: MatchCard = JSON.parse(r.card_json); return {...c,verdict:verdicts.get(c.query_enc) ?? null}; });
  }
  async getCard(b: string,q: string) { return (await this.listCards(b)).find(c=>c.query_enc===q) ?? null; }
  async getCache(b: string,q: string) {
    const r = await this.db.prepare('SELECT hydrated_json FROM match_card_cache WHERE batch_id=? AND query_enc=?').bind(b,q).first<{hydrated_json:string}>();
    return r ? JSON.parse(r.hydrated_json) as HydratedCard : null;
  }
  async putCache(b: string,q: string,h: HydratedCard) {
    await this.db.prepare('INSERT OR REPLACE INTO match_card_cache (batch_id,query_enc,hydrated_json,fetched_at) VALUES (?,?,?,?)').bind(b,q,JSON.stringify(h),h.fetched_at).run();
  }
  async setVerdict(b: string,q: string,input: VerdictInput | null,reviewer?: string) {
    const at = new Date().toISOString();
    const current = input ? this.db.prepare('INSERT OR REPLACE INTO match_verdicts (batch_id,query_enc,verdict,candidate_key,candidate_label,notes,scar_notes,reviewer,updated_at) VALUES (?,?,?,?,?,?,?,?,?)').bind(b,q,input.verdict,input.candidate_key,input.candidate_label,input.notes,input.scar_notes,input.reviewer,at) : this.db.prepare('DELETE FROM match_verdicts WHERE batch_id=? AND query_enc=?').bind(b,q);
    const log = this.db.prepare('INSERT INTO match_verdict_log (batch_id,query_enc,verdict,candidate_key,notes,scar_notes,reviewer,at) VALUES (?,?,?,?,?,?,?,?)').bind(b,q,input?.verdict ?? null,input?.candidate_key ?? null,input?.notes ?? null,input?.scar_notes ?? null,input?.reviewer ?? reviewer ?? null,at);
    await this.db.batch([current,log]);
    return input ? {...input,batch_id:b,query_enc:q,updated_at:at} : null;
  }
  async getVerdicts(b: string) { const {results} = await this.db.prepare('SELECT * FROM match_verdicts WHERE batch_id=? ORDER BY query_enc').bind(b).all<MatchVerdict>(); return results; }
}
const memory = new MemoryMatchingStore();
export function createMatchingStore(db?: D1Database): MatchingStore { return db ? new D1MatchingStore(db) : memory; }
