import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { parseMatchBatch } from '../../src/lib/match-batch-core.mjs';
import { requireLocal, importBatchSql } from '../../src/lib/match-sql.mjs';
import { wrangler } from './local-d1.mjs';
const args = process.argv.slice(2);
try { requireLocal(args); } catch (error) { console.error(error.message); process.exit(2); }
if (args.length !== 1) { console.error('Usage: matching:import <batch.json> (local only)'); process.exit(2); }
const batch = parseMatchBatch(await readFile(args[0],'utf8'));
await mkdir('local-data/matching',{recursive:true});
const sqlFile = `local-data/matching/import-${batch.id}.sql`;
await writeFile(sqlFile,importBatchSql(batch)+'\n');
wrangler(['migrations','apply','whaleshark-org','--local']);
wrangler(['execute','whaleshark-org','--local','--file',sqlFile]);
console.log(`Imported ${batch.cards.length} cards into local D1; verdicts preserved.`);
