import type { APIRoute } from 'astro';
import { dataStore } from '../../../lib/runtime';
import type { Batch, BatchItem } from '../../../lib/db';
import { publicSubmissionDefaults } from '../../../mock/data';
import { parsePublicObservationForm, validatePublicObservations } from '../../../lib/public-observations';
import { getSpecies } from '../../../lib/species';

export const POST: APIRoute = async ({ request, locals, redirect }) => {
  const isJson = request.headers.get('content-type')?.includes('application/json');
  const input = isJson ? await request.json() as Record<string, unknown> : await request.formData();
  const value = (name: string) => input instanceof FormData ? String(input.get(name) ?? '') : String(input[name] ?? '');
  const reportForm = input instanceof FormData ? input : new FormData();
  if (!(input instanceof FormData)) Object.entries(input).forEach(([name, candidate]) => {
    if (Array.isArray(candidate)) candidate.forEach((item) => reportForm.append(name, String(item)));
    else if (candidate !== undefined && candidate !== null) reportForm.set(name, String(candidate));
  });
  if (!reportForm.has('submitter_name') && value('photographer_name')) reportForm.set('submitter_name', value('photographer_name'));
  if (!reportForm.has('submitter_email') && value('photographer_email')) reportForm.set('submitter_email', value('photographer_email'));
  const species = getSpecies('whale-shark');
  const groups = ['when_where', 'about_shark', 'water', 'about_you'];
  const animalFieldIds = ['sex','life_stage','length','behavior','living_status','injury_severity','injury_regions','injury_types','injury_description'];
  const sharedFieldIds = species.public_report.groups.flatMap((group) => group.fields).map((field) => field.id).filter((id) => !animalFieldIds.includes(id));
  const observations = parsePublicObservationForm(reportForm, species, new Date(), { groups, excludeFieldIds: animalFieldIds });
  const missing = validatePublicObservations(observations, species, groups, sharedFieldIds);
  if (reportForm.has('consent') && missing.length) return Response.json({ error: 'required_fields', fields: missing }, { status: 400 });
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const batch: Batch = {
    id,
    created_at: now,
    updated_at: now,
    site_id: observations.site_id || value('site_id') || publicSubmissionDefaults.site_id,
    observed_at: observations.observed_date || value('observed_at') || now.slice(0, 10),
    photographer_name: observations.photographer_name || observations.submitter_name || value('photographer_name') || publicSubmissionDefaults.photographer_name,
    photographer_email: observations.photographer_email || observations.submitter_email || value('photographer_email') || publicSubmissionDefaults.photographer_email,
    observations_json: JSON.stringify(observations),
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
        status: 'queued', match_json: null, observations_json: null, wildbook_task_id: null,
      };
      await store.createBatchItem(item);
    }
    if (files.length) await store.updateBatch(id, { status: 'processing', updated_at: new Date().toISOString() });
    return redirect(`/bulk?batch=${encodeURIComponent(id)}`, 303);
  }

  return Response.json({ batch }, { status: 201 });
};
