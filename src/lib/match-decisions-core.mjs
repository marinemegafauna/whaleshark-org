/** Shared interchange with the offline review_page.py apply tooling. */
export function buildMatchDecisions(batch, verdicts, scarRecords, reviews, exported_at = new Date().toISOString()) {
  const cards = new Map(batch.cards.map(c => [c.query_enc, c]));
  const reviewMap = new Map(reviews.map(r => [r.encounter_id, r]));
  const scars = Object.fromEntries(batch.cards.map(c => {
    const review = reviewMap.get(c.query_enc);
    return [c.query_enc, {
      review_status: review?.status ?? null, regions_examined: review?.regions_examined ? JSON.parse(review.regions_examined) : [],
      records: scarRecords.filter(r => r.encounter_id === c.query_enc).map(r => ({ fields: JSON.parse(r.fields_json), x: r.x, y: r.y, schema_version: r.schema_version, created_at: r.recorded_at })),
    }];
  }));
  return { schema: 'whaleshark.match-decisions/v1', batch_id: batch.id, title: batch.title, site: batch.site, exported_at,
    verdicts: Object.fromEntries(verdicts.filter(v => cards.has(v.query_enc)).map(v => {
      const candidate = cards.get(v.query_enc).candidates.find(c => c.key === v.candidate_key);
      return [v.query_enc, { verdict: v.verdict, candidate: v.candidate_label ?? candidate?.label ?? null, candidate_key: v.candidate_key,
        candidate_enc: candidate?.matched_enc ?? null, notes: v.notes, scars: v.scar_notes, reviewer: v.reviewer, at: v.updated_at }];
    })), scars };
}
