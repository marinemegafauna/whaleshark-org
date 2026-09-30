import { mkdir, writeFile } from 'node:fs/promises';
import { buildMatchDecisions } from '../../src/lib/match-decisions-core.mjs';
import { parseMatchBatch } from '../../src/lib/match-batch-core.mjs';
import { requireLocal, sqlString } from '../../src/lib/match-sql.mjs';
import { query } from './local-d1.mjs';
const args = process.argv.slice(2);
try { requireLocal(args); } catch (error) { console.error(error.message); process.exit(2); }
const [id] = args;
if (args.length !== 1 || !/^[A-Za-z0-9_-]+$/.test(id)) { console.error('Usage: matching:export <batch id> (local only)'); process.exit(2); }
const b = sqlString(id);
const rows = query(`SELECT batch_json FROM match_batches WHERE id=${b}`);
if (!rows.length) throw new Error('Batch not found');
const batch = parseMatchBatch({...JSON.parse(rows[0].batch_json),cards:query(`SELECT card_json FROM match_cards WHERE batch_id=${b} ORDER BY card_index`).map(r=>JSON.parse(r.card_json))});
const encounters = `SELECT query_enc FROM match_cards WHERE batch_id=${b}`;
const decisions = buildMatchDecisions(batch,query(`SELECT * FROM match_verdicts WHERE batch_id=${b}`),query(`SELECT * FROM scar_records WHERE encounter_id IN (${encounters})`),query(`SELECT * FROM encounter_review WHERE encounter_id IN (${encounters})`));
await mkdir('local-data/matching/decisions',{recursive:true});
const out = `local-data/matching/decisions/${id}.decisions.json`;
await writeFile(out,JSON.stringify(decisions,null,2)+'\n');
console.log(out);
