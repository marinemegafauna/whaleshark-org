import type { APIRoute } from 'astro';
import { fillTemplate, getPageCopy } from '../../../../lib/content';
import { parseStoredPublicObservations, validatePublicObservations } from '../../../../lib/public-observations';
import { dataStore } from '../../../../lib/runtime';
import { getSpecies } from '../../../../lib/species';

export const POST: APIRoute = async ({ params, request, locals, redirect }) => {
  const id = params.id!;
  const submission = await dataStore(locals).getSubmission(id);
  if (!submission) return Response.json({ error: 'submission_not_found' }, { status: 404 });
  const form = await request.formData();
  const decision = String(form.get('decision') ?? 'confirm');
  const observations = parseStoredPublicObservations(submission.observations_json);
  const missing = validatePublicObservations(
    observations ?? { behavior: [], injuries: { regions: [], types: [] }, inform_other: [] },
    getSpecies('whale-shark'),
  );
  if (missing.length) {
    const copy = (await getPageCopy('match')).report;
    const message = fillTemplate(copy.missing, { fields: missing.join(', ') });
    return redirect(`/match/${encodeURIComponent(id)}?observation_error=${encodeURIComponent(message)}#sighting`, 303);
  }
  const patch = decision === 'confirm'
    ? { status: 'confirmed' }
    : { status: decision === 'none' ? 'no_match' : 'needs_review' };
  await dataStore(locals).updateSubmission(id, patch);
  return redirect(`/match/${id}?decision=${decision}`, 303);
};
