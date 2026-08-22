import type { APIRoute } from 'astro';
import siteConfig from '../../../../../site.config';
import { fillTemplate, getPageCopy } from '../../../../lib/content';
import { parsePublicObservationForm, parseStoredPublicObservations, preserveConsentTimestamp, validatePublicObservations } from '../../../../lib/public-observations';
import { dataStore } from '../../../../lib/runtime';
import { getSpecies } from '../../../../lib/species';
import { buildWildbookRow } from '../../../../lib/wildbook';

export const POST: APIRoute = async ({ params, request, locals, redirect }) => {
  const id = params.id!;
  const store = dataStore(locals);
  const submission = await store.getSubmission(id);
  if (!submission) return Response.json({ error: 'submission_not_found' }, { status: 404 });

  const form = await request.formData();
  const species = getSpecies('whale-shark');
  const observations = preserveConsentTimestamp(
    parsePublicObservationForm(form, species),
    parseStoredPublicObservations(submission.observations_json),
  );
  const missing = validatePublicObservations(observations, species);
  if (missing.length) {
    const copy = (await getPageCopy('match')).report;
    const message = fillTemplate(copy.missing, { fields: missing.join(', ') });
    return redirect(`/match/${encodeURIComponent(id)}?observation_error=${encodeURIComponent(message)}#sighting`, 303);
  }

  let rawMatch: unknown = [];
  try { rawMatch = JSON.parse(submission.match_json ?? '[]'); } catch { /* retain a valid diagnostic envelope */ }
  const envelope = rawMatch && typeof rawMatch === 'object' && !Array.isArray(rawMatch)
    ? rawMatch as Record<string, unknown>
    : { candidates: Array.isArray(rawMatch) ? rawMatch : [] };
  const mediaFilename = typeof envelope.mediaFilename === 'string'
    ? envelope.mediaFilename
    : submission.image_key.split('/').at(-1) ?? submission.image_key;
  const location = siteConfig.sites.find((candidate) => candidate.id === observations.site_id)?.locationIds[0] ?? '';
  const wildbookRow = buildWildbookRow({
    species,
    observations,
    locationId: location,
    sightingId: submission.id,
    mediaFilenames: [mediaFilename],
  });

  const patch = {
    observed_at: observations.observed_date ?? submission.observed_at,
    site_id: observations.site_id ?? submission.site_id,
    photographer_name: observations.photographer_name ?? observations.submitter_name ?? submission.photographer_name,
    photographer_email: observations.photographer_email ?? observations.submitter_email ?? submission.photographer_email,
    observations_json: JSON.stringify(observations),
    match_json: JSON.stringify({ ...envelope, mediaFilename, wildbookRow }),
    status: submission.status === 'awaiting_report' ? 'ready_for_review' : submission.status,
  };
  await store.updateSubmission(id, patch);
  return redirect(`/match/${encodeURIComponent(id)}?observations=saved#sighting`, 303);
};
