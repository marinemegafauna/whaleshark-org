import type { APIRoute } from 'astro';
import { advanceMockBatch } from '../../../../lib/batches';
import { isMockMode, publicWriteMode } from '../../../../lib/mode';
import { dataStore, runtimeValue } from '../../../../lib/runtime';
import { getBulkImportStatus, getMatchResults, login } from '../../../../lib/wildbook';
import { parsePublicObservationForm, parseStoredPublicObservations, preserveConsentTimestamp, validatePublicObservations } from '../../../../lib/public-observations';
import { getSpecies } from '../../../../lib/species';

export const PATCH: APIRoute = async ({ params, request, locals }) => {
  const store = dataStore(locals);
  const batch = await store.getBatch(params.id!);
  if (!batch) return Response.json({ error: 'batch_not_found' }, { status: 404 });
  const input = await request.json() as Record<string, unknown>;
  const form = new FormData();
  Object.entries(input).forEach(([name, value]) => {
    if (Array.isArray(value)) value.forEach((item) => form.append(name, String(item)));
    else if (value !== undefined && value !== null) form.set(name, String(value));
  });
  const species = getSpecies('whale-shark');
  const groups = ['when_where', 'about_shark', 'water', 'about_you'];
  const animalFieldIds = ['sex','life_stage','length','behavior','living_status','injury_severity','injury_regions','injury_types','injury_description'];
  const sharedFieldIds = species.public_report.groups.flatMap((group) => group.fields).map((field) => field.id).filter((id) => !animalFieldIds.includes(id));
  const observations = preserveConsentTimestamp(
    parsePublicObservationForm(form, species, new Date(), { groups, excludeFieldIds: animalFieldIds }),
    parseStoredPublicObservations(batch.observations_json),
  );
  const missing = validatePublicObservations(observations, species, groups, sharedFieldIds);
  if (missing.length) return Response.json({ error: 'required_fields', fields: missing }, { status: 400 });
  const updated = await store.updateBatch(batch.id, {
    site_id: observations.site_id ?? batch.site_id,
    observed_at: observations.observed_date ?? batch.observed_at,
    photographer_name: observations.photographer_name ?? observations.submitter_name ?? batch.photographer_name,
    photographer_email: observations.photographer_email ?? observations.submitter_email ?? batch.photographer_email,
    observations_json: JSON.stringify(observations),
    updated_at: new Date().toISOString(),
  });
  return Response.json({ batch: updated });
};

export const GET: APIRoute = async ({ params, locals }) => {
  const store = dataStore(locals);
  let batch = await store.getBatch(params.id!);
  if (!batch) return Response.json({ error: 'batch_not_found' }, { status: 404 });
  let items = await store.listBatchItems(batch.id);

  if ((isMockMode() || publicWriteMode() === 'dry-run') && (batch.status === 'draft' || batch.status === 'processing')) {
    const advanced = advanceMockBatch(batch, items);
    batch = await store.updateBatch(batch.id, advanced.batch);
    items = await Promise.all(advanced.items.map((item) => store.updateBatchItem(item.id, item)));
  } else if (!isMockMode() && publicWriteMode() === 'live' && batch.wildbook_task_id && batch.status === 'processing') {
    const user = runtimeValue(locals, 'WILDBOOK_SERVICE_USER');
    const password = runtimeValue(locals, 'WILDBOOK_SERVICE_PASSWORD');
    if (!user || !password) return Response.json({ error: 'public_write_unavailable' }, { status: 503 });
    const authenticated = await login(user, password);
    const task = await getBulkImportStatus(authenticated.cookie, batch.wildbook_task_id);
    if (task.status === 'failed') batch = await store.updateBatch(batch.id, { status: 'error', updated_at: new Date().toISOString() });
    if (task.status === 'complete') {
      const payload = await getMatchResults(authenticated.cookie, task.taskId);
      const results = Array.isArray(payload.items) ? payload.items as Record<string, unknown>[] : Array.isArray(payload.results) ? payload.results as Record<string, unknown>[] : [];
      items = await Promise.all(items.map(async (item, index) => {
        const result = results.find((candidate) => candidate.filename === item.filename) ?? results[index] ?? {};
        const candidates = Array.isArray(result.candidates) ? result.candidates : Array.isArray(result.matches) ? result.matches : [];
        const status = result.status === 'no_shark' ? 'no_shark' : candidates.length ? 'matched' : 'likely_new';
        return store.updateBatchItem(item.id, { status, match_json: JSON.stringify({ ...result, candidates }) });
      }));
      batch = await store.updateBatch(batch.id, { status: 'review', updated_at: new Date().toISOString() });
    }
  }

  return Response.json({ batch, items });
};
