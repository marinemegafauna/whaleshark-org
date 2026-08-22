import type { APIRoute } from 'astro';
import siteConfig from '../../../../../site.config';
import type { BatchItem } from '../../../../lib/db';
import { isMockMode, publicWriteMode } from '../../../../lib/mode';
import { dataStore, runtimeValue } from '../../../../lib/runtime';
import { login, startBulkImport, uploadResumableFile } from '../../../../lib/wildbook';

export const POST: APIRoute = async ({ params, request, locals }) => {
  const store = dataStore(locals);
  const batch = await store.getBatch(params.id!);
  if (!batch) return Response.json({ error: 'batch_not_found' }, { status: 404 });
  const form = await request.formData();
  const files = [...form.getAll('files'), ...form.getAll('image')].filter((entry): entry is File => entry instanceof File && entry.size > 0);
  if (!files.length) return Response.json({ error: 'photos_required' }, { status: 400 });

  const items: BatchItem[] = [];
  for (const [index, file] of files.entries()) {
    const item: BatchItem = {
      id: crypto.randomUUID(), batch_id: batch.id, created_at: new Date(Date.now() + index).toISOString(), filename: file.name,
      mime_type: file.type || 'application/octet-stream', size_bytes: file.size, image_key: `/mock/whale-shark-${(index % 6) + 1}.svg`,
      status: 'queued', match_json: null, wildbook_task_id: null,
    };
    await store.createBatchItem(item);
    items.push(item);
  }
  await store.updateBatch(batch.id, { status: 'processing', updated_at: new Date().toISOString() });

  if (!isMockMode() && publicWriteMode() === 'live') {
    const user = runtimeValue(locals, 'WILDBOOK_SERVICE_USER');
    const password = runtimeValue(locals, 'WILDBOOK_SERVICE_PASSWORD');
    if (!user || !password) return Response.json({ error: 'public_write_unavailable' }, { status: 503 });
    const authenticated = await login(user, password);
    const uploads = await Promise.all(files.map((file, index) => uploadResumableFile(authenticated.cookie, file, items[index]!.id)));
    const site = siteConfig.sites.find((candidate) => candidate.id === batch.site_id) ?? siteConfig.sites[0];
    const task = await startBulkImport(authenticated.cookie, {
      uploads, locationId: site.locationIds[0]!, encounterDate: batch.observed_at,
      photographerName: batch.photographer_name, photographerEmail: batch.photographer_email,
    });
    await store.updateBatch(batch.id, { wildbook_task_id: task.taskId, updated_at: new Date().toISOString() });
    await Promise.all(items.map((item) => store.updateBatchItem(item.id, { wildbook_task_id: task.taskId })));
  }

  return Response.json({ items }, { status: 201 });
};
