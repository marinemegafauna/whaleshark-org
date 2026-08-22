import type { APIRoute } from 'astro';
import { dataStore } from '../../../lib/runtime';
import type { Batch, BatchItem } from '../../../lib/db';

export const POST: APIRoute = async ({ request, locals, redirect }) => {
  const isJson = request.headers.get('content-type')?.includes('application/json');
  const input = isJson ? await request.json() as Record<string, unknown> : await request.formData();
  const value = (name: string) => input instanceof FormData ? String(input.get(name) ?? '') : String(input[name] ?? '');
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const batch: Batch = {
    id,
    created_at: now,
    updated_at: now,
    site_id: value('site_id') || 'tofo',
    observed_at: value('observed_at') || now.slice(0, 10),
    photographer_name: value('photographer_name') || 'Community photographer',
    photographer_email: value('photographer_email') || 'pending@example.org',
    status: 'draft',
    wildbook_task_id: null,
  };
  const store = dataStore(locals);
  await store.createBatch(batch);

  if (input instanceof FormData) {
    const files = [...input.getAll('files'), ...input.getAll('image')].filter((entry): entry is File => entry instanceof File && entry.size > 0);
    for (const [index, file] of files.entries()) {
      const item: BatchItem = {
        id: crypto.randomUUID(), batch_id: id, created_at: new Date(Date.now() + index).toISOString(), filename: file.name,
        mime_type: file.type || 'application/octet-stream', size_bytes: file.size, image_key: `/mock/whale-shark-${(index % 6) + 1}.svg`,
        status: 'queued', match_json: null, wildbook_task_id: null,
      };
      await store.createBatchItem(item);
    }
    if (files.length) await store.updateBatch(id, { status: 'processing', updated_at: new Date().toISOString() });
    return redirect(`/bulk?batch=${encodeURIComponent(id)}`, 303);
  }

  return Response.json({ batch }, { status: 201 });
};
