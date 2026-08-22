import type { APIRoute } from 'astro';
import siteConfig from '../../../../../site.config';
import { groupBatchItems } from '../../../../lib/batch-groups';
import { dataStore } from '../../../../lib/runtime';
import { getSpecies } from '../../../../lib/species';
import { mergePublicObservations, parsePublicObservationForm, parseStoredPublicObservations, validatePublicObservations } from '../../../../lib/public-observations';
import { buildWildbookRow } from '../../../../lib/wildbook';

export const POST: APIRoute = async ({ params, request, locals, redirect }) => {
  const store = dataStore(locals);
  const batch = await store.getBatch(params.id!);
  if (!batch) return Response.json({ error: 'batch_not_found' }, { status: 404 });
  const items = await store.listBatchItems(batch.id);
  const groups = groupBatchItems(items);
  const form = await request.formData();
  const species = getSpecies('whale-shark');
  const shared = parseStoredPublicObservations(batch.observations_json) ?? { behavior: [], injuries: { regions: [], types: [] }, inform_other: [] };
  const animalGroups = ['about_shark', 'injuries'];
  const animalFieldIds = ['sex','life_stage','length','behavior','living_status','injury_severity','injury_regions','injury_types','injury_description'];
  const sharedGroups = ['when_where', 'about_shark', 'water', 'about_you'];
  const sharedFieldIds = species.public_report.groups.flatMap((group) => group.fields).map((field) => field.id).filter((id) => !animalFieldIds.includes(id));
  if (validatePublicObservations(shared, species, sharedGroups, sharedFieldIds).length) {
    return redirect(`/bulk?batch=${encodeURIComponent(batch.id)}&observation_error=1`, 303);
  }
  for (const group of groups) {
    const decision = String(form.get(`decision:${group.key}`) ?? 'not_sure');
    if (!['confirm', 'not_sure', 'none'].includes(decision)) return Response.json({ error: 'invalid_decision' }, { status: 400 });
    const animal = parsePublicObservationForm(form, species, new Date(), { prefix: `observation:${group.key}:`, groups: animalGroups, fieldIds: animalFieldIds });
    if (validatePublicObservations(animal, species, animalGroups, animalFieldIds).length) {
      return redirect(`/bulk/${encodeURIComponent(batch.id)}/review?observation_error=1`, 303);
    }
    const observations = mergePublicObservations(shared, {
      ...animal,
      living_status: animal.living_status ?? 'alive',
    });
    if (validatePublicObservations(observations, species).length) {
      return redirect(`/bulk/${encodeURIComponent(batch.id)}/review?observation_error=1`, 303);
    }
    const location = siteConfig.sites.find((candidate) => candidate.id === observations.site_id)?.locationIds[0] ?? '';
    const wildbookRow = buildWildbookRow({
      species,
      observations,
      locationId: location,
      sightingId: batch.id,
      mediaFilenames: group.items.map((item) => item.filename),
    });
    for (const item of group.items) {
      let match: Record<string, unknown> = {};
      try { match = JSON.parse(item.match_json ?? '{}') as Record<string, unknown>; } catch { /* retain a valid review envelope */ }
      await store.updateBatchItem(item.id, { match_json: JSON.stringify({ ...match, reviewDecision: decision, wildbookRow }), observations_json: JSON.stringify(observations) });
    }
  }
  await store.updateBatch(batch.id, { status: 'submitted', updated_at: new Date().toISOString() });
  return redirect(`/bulk/${encodeURIComponent(batch.id)}/review?submitted=1`, 303);
};
