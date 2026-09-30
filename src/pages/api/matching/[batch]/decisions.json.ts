import type { APIRoute } from 'astro';
import { matchingStore, appDataStore } from '../../../../lib/runtime';
import { buildMatchDecisions } from '../../../../lib/match-decisions';
export const GET: APIRoute = async ({params,locals}) => {
  const store = matchingStore(locals), batch = await store.getBatch(params.batch!);
  if (!batch) return Response.json({error:'not_found'},{status:404});
  const app = appDataStore(locals);
  const [verdicts,records,reviews] = await Promise.all([store.getVerdicts(batch.id),Promise.all(batch.cards.map(c=>app.listScarRecords({encounterId:c.query_enc}))).then(groups=>groups.flat()),app.listReviewStatuses()]);
  return Response.json(buildMatchDecisions(batch,verdicts,records,reviews),{headers:{'Content-Disposition':`attachment; filename="${batch.id}.decisions.json"`}});
};
