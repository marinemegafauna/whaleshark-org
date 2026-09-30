import { z } from 'zod';

const nullableText = z.string().nullable();
export const photoSchema = z.object({
  url: z.url(), w: z.number().positive().nullable(), h: z.number().positive().nullable(),
  box: z.tuple([z.number(), z.number(), z.number().positive(), z.number().positive()]).nullable(),
  view: z.enum(['left', 'right', 'other', 'no box', 'unknown']), fname: nullableText, enc: z.string(), date: nullableText,
});
export const sightingSchema = z.object({ enc: z.string(), date: nullableText, loc: nullableText, matched: z.boolean(), photos: z.array(photoSchema) });
export const candidateSchema = z.object({
  key: z.string().min(1), name: nullableText, label: z.string(), matched_enc: nullableText,
  s1: z.number(), margin: z.number().nullable(), tier: nullableText, flank: nullableText, loc: nullableText, date: nullableText,
  cls: z.string(), in_batch: z.boolean(), duplicate_suspected: z.boolean(), runner_up_only: z.boolean(),
});
export const cardSchema = z.object({
  index: z.number().int().positive(), query_enc: z.string().min(1), date: nullableText,
  cls: z.enum(['likely', 'possible', 'weak', 'none', 'no_fingerprint']), note: nullableText, duplicate_suspected: z.boolean(),
  best: z.object({ s1: z.number(), margin: z.number().nullable(), label: z.string() }).nullable(),
  candidates: z.array(candidateSchema).max(5),
  embedded: z.object({ photos: z.array(photoSchema), candidates: z.record(z.string(), z.object({ sightings: z.array(sightingSchema) })), source: z.string() }).nullable(),
});
export const batchSchema = z.object({
  schema: z.literal('whaleshark.match-batch/v1'), id: z.string().regex(/^[A-Za-z0-9_-]+$/), title: z.string().min(1), site: nullableText,
  created_at: z.string(), source: z.object({ report_file: z.string(), report_generated: nullableText, method_version: nullableText }),
  rule: z.object({ likely_score: z.number(), likely_margin: z.number(), possible_score: z.number(), possible_margin: z.number(), duplicate_suspect: z.number() }),
  cards: z.array(cardSchema),
}).superRefine((batch, ctx) => {
  const ids = new Set(), indices = new Set();
  for (const card of batch.cards) {
    if (ids.has(card.query_enc) || indices.has(card.index)) ctx.addIssue({ code: 'custom', message: 'Duplicate card encounter or index' });
    ids.add(card.query_enc); indices.add(card.index);
    if (new Set(card.candidates.map(c => c.key)).size !== card.candidates.length) ctx.addIssue({ code: 'custom', message: 'Duplicate candidate key' });
  }
  if (batch.cards.some(c => c.index > batch.cards.length)) ctx.addIssue({ code: 'custom', message: 'Card indices must be contiguous' });
});
export function parseMatchBatch(json) { return batchSchema.parse(typeof json === 'string' ? JSON.parse(json) : json); }
const ranks = { likely: 0, possible: 1, weak: 2, none: 3, no_fingerprint: 4 };
const rank = cls => ranks[cls] ?? 3;
const compare = (a, b) => rank(a.cls) - rank(b.cls) || b.s1 - a.s1 || a.key.localeCompare(b.key);
const label = (name, enc, key) => name ?? (enc ? `unassigned ${enc.slice(0, 8)}` : key);

/** Build a deterministic review batch without catalogue reads. */
export function buildBatchFromCascadeReport(report, options) {
  const rows = new Map();
  for (const row of report.results ?? []) {
    if (!rows.has(row.query_enc)) rows.set(row.query_enc, []);
    rows.get(row.query_enc).push(row);
  }
  for (const id of report.no_annotation_encounters ?? []) if (!rows.has(id)) rows.set(id, []);
  const notes = new Map();
  for (const row of options.notes ?? []) {
    if (!row.note) continue;
    if (!notes.has(row.query_enc)) notes.set(row.query_enc, new Set());
    notes.get(row.query_enc).add(row.note);
  }
  const embedded = typeof options.photosFromPage === 'string' ? embeddedFromReviewPage(options.photosFromPage) : options.embedded ?? {};
  const cards = [...rows].map(([query_enc, entries]) => {
    const direct = new Map();
    for (const row of entries) {
      if (!row.cand_key || !Number.isFinite(row.s1) || ['no_likely_match', 'insufficient_competitors'].includes(row.class)) continue;
      const candidate = {
        key: row.cand_key, name: row.cand_name ?? null, label: label(row.cand_name, row.cand_enc, row.cand_key),
        matched_enc: row.cand_enc ?? null, s1: row.s1, margin: row.margin ?? null, tier: row.tier ?? null,
        flank: row.viewpoint ?? null, loc: row.cand_loc ?? null, date: row.cand_date ?? null, cls: row.class,
        in_batch: Boolean(row.cand_in_query_batch), duplicate_suspected: Boolean(row.duplicate_suspected), runner_up_only: false,
      };
      if (!direct.has(candidate.key) || direct.get(candidate.key).s1 < candidate.s1) direct.set(candidate.key, candidate);
    }
    const candidates = new Map(direct);
    for (const row of entries) {
      const r = row.runner_up;
      if (!r?.key || !Number.isFinite(r.score) || direct.has(r.key)) continue;
      const enc = r.key.startsWith('U:') ? r.key.slice(2) : null;
      const candidate = { key: r.key, name: r.name ?? null, label: label(r.name, enc, r.key), matched_enc: enc,
        s1: r.score, margin: null, tier: row.tier ?? null, flank: row.viewpoint ?? null, loc: r.loc ?? null, date: null,
        cls: 'runner_up', in_batch: rows.has(enc), duplicate_suspected: false, runner_up_only: true };
      if (!candidates.has(r.key) || candidates.get(r.key).s1 < r.score) candidates.set(r.key, candidate);
    }
    const ranked = [...candidates.values()].sort(compare).slice(0, 5);
    const bestRows = entries.filter(r => ['likely', 'possible', 'weak'].includes(r.class)).sort((a, b) => rank(a.class) - rank(b.class) || b.s1 - a.s1);
    const best = bestRows[0];
    const old = embedded[query_enc];
    const mapped = old ? Object.fromEntries(ranked.flatMap(c => {
      const data = old.candidates[c.key] ?? old.candidates[c.label];
      return data ? [[c.key, { sightings: data.sightings.map(s => ({ ...s, matched: s.enc === c.matched_enc })) }]] : [];
    })) : {};
    return { index: 1, query_enc, date: options.encounters?.[query_enc]?.date ?? null, cls: best?.class ?? (entries.length ? 'none' : 'no_fingerprint'),
      note: notes.has(query_enc) ? [...notes.get(query_enc)].join(' / ') : null,
      duplicate_suspected: entries.some(r => r.duplicate_suspected),
      best: best ? { s1: best.s1, margin: best.margin ?? null, label: label(best.cand_name, best.cand_enc, best.cand_key ?? '') } : null,
      candidates: ranked, embedded: old ? { photos: old.photos, candidates: mapped, source: old.source } : null };
  }).sort((a, b) => rank(a.cls) - rank(b.cls) || (b.best?.s1 ?? -Infinity) - (a.best?.s1 ?? -Infinity) || a.query_enc.localeCompare(b.query_enc));
  cards.forEach((c, i) => { c.index = i + 1; });
  return parseMatchBatch({ schema: 'whaleshark.match-batch/v1', id: options.id, title: options.title, site: options.site ?? null,
    created_at: options.created_at ?? new Date().toISOString(),
    source: { report_file: options.report_file ?? '', report_generated: report.generated ?? null, method_version: report.method_version ?? report.spec?.method_version ?? null },
    rule: report.thresholds, cards });
}

/** Legacy crop pages contain JSON, never executable code. Unparseable pages are optional.
 * @returns {Record<string, NonNullable<import('zod').infer<typeof cardSchema>['embedded']>>}
 */
export function embeddedFromReviewPage(html) {
  try {
    const match = html.match(/const CARDS\s*=\s*(\{.*?\});/s);
    if (!match) return {};
    const cards = JSON.parse(match[1].replaceAll('<\\/', '</'));
    const result = {};
    const encounterId = p => { try { return new URL(p.link).searchParams.get('number') ?? p.enc; } catch { return p.enc; } };
    const photo = p => ({ url: p.full, w: null, h: null, box: null, view: 'unknown', fname: null, enc: encounterId(p), date: p.date || null });
    for (const card of Object.values(cards)) {
      const panes = card.panes;
      const query_enc = panes?.[0]?.photos?.map(encounterId).find(Boolean);
      if (!query_enc) continue;
      const candidates = {};
      for (const pane of panes.slice(1)) {
        const key = pane.label.split(' · ')[0], groups = new Map();
        for (const p of pane.photos ?? []) {
          const enc = encounterId(p);
          if (!groups.has(enc)) groups.set(enc, { enc, date: p.date || null, loc: null, matched: false, photos: [] });
          groups.get(enc).photos.push(photo(p));
        }
        candidates[key] = { sightings: [...groups.values()] };
      }
      result[query_enc] = { photos: (panes[0].photos ?? []).map(photo), candidates, source: 'legacy review page' };
    }
    return result;
  } catch { return {}; }
}
