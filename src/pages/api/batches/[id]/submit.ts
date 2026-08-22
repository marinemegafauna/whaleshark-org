import type { APIRoute } from 'astro';
import { groupBatchItems } from '../../../../lib/batch-groups';
import { dataStore } from '../../../../lib/runtime';

export const POST: APIRoute = async ({ params, request, locals, redirect }) => {
  const store = dataStore(locals);
  const batch = await store.getBatch(params.id!);
  if (!batch) return new Response('Batch not found.', { status: 404 });
  const items = await store.listBatchItems(batch.id);
  const groups = groupBatchItems(items);
  const form = await request.formData();
  for (const group of groups) {
    const decision = String(form.get(`decision:${group.key}`) ?? 'not_sure');
    for (const item of group.items) {
      let match: Record<string, unknown> = {};
      try { match = JSON.parse(item.match_json ?? '{}') as Record<string, unknown>; } catch { /* retain a valid review envelope */ }
      await store.updateBatchItem(item.id, { match_json: JSON.stringify({ ...match, reviewDecision: decision }) });
    }
  }
  await store.updateBatch(batch.id, { status: 'submitted', updated_at: new Date().toISOString() });
  return redirect(`/bulk/${encodeURIComponent(batch.id)}/review?submitted=1`, 303);
};
