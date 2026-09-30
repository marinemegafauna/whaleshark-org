import { parseMatchBatch } from './match-batch-core.mjs';
export function requireLocal(args) {
  if (args.some(a => a === '--remote' || a.startsWith('--remote='))) throw new Error('Matching is local-only; --remote is refused.');
}
export function sqlString(value) { return value == null ? 'NULL' : `'${String(value).replaceAll("'", "''")}'`; }
export function importBatchSql(input, at = new Date().toISOString()) {
  const batch = parseMatchBatch(input), {cards,...metadata} = batch;
  const b = sqlString(batch.id);
  return [
    `INSERT OR REPLACE INTO match_batches (id,title,site_id,batch_json,imported_at) VALUES (${[batch.id,batch.title,batch.site,JSON.stringify(metadata),at].map(sqlString).join(',')});`,
    `DELETE FROM match_cards WHERE batch_id=${b}${cards.length ? ` AND query_enc NOT IN (${cards.map(c=>sqlString(c.query_enc)).join(',')})` : ''};`,
    ...cards.map(c=>`INSERT OR REPLACE INTO match_cards (batch_id,query_enc,card_index,cls,card_json) VALUES (${b},${sqlString(c.query_enc)},${c.index},${sqlString(c.cls)},${sqlString(JSON.stringify(c))});`),
  ].join('\n');
}
