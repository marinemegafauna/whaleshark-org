import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { buildBatchFromCascadeReport } from '../../src/lib/match-batch-core.mjs';
const args = process.argv.slice(2), options = {};
for (let i=0;i<args.length;i+=2) {
  if (!args[i].startsWith('--') || !args[i+1]) throw new Error('Expected --option value pairs');
  options[args[i].slice(2)] = args[i+1];
}
for (const k of ['report','id','title','site']) if (!options[k]) throw new Error(`Missing --${k}`);
const json = async p => JSON.parse(await readFile(p,'utf8'));
const batch = buildBatchFromCascadeReport(await json(options.report), {
  id:options.id,title:options.title,site:options.site,report_file:options.report,
  notes:options.notes ? await json(options.notes) : [], encounters:options.encounters ? await json(options.encounters) : {},
  photosFromPage:options['photos-from-page'] ? await readFile(options['photos-from-page'],'utf8') : undefined,
});
const out = options.out ?? `local-data/matching/batches/${batch.id}.json`;
await mkdir(dirname(out),{recursive:true});
await writeFile(out,JSON.stringify(batch,null,2)+'\n');
const counts = {};
for (const c of batch.cards) counts[c.cls] = (counts[c.cls] ?? 0)+1;
console.log(JSON.stringify({out,cards:batch.cards.length,by_cls:counts,notes:batch.cards.filter(c=>c.note).length,embedded:batch.cards.filter(c=>c.embedded?.photos.length).length}));
