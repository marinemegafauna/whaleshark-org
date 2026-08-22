import type { APIRoute } from 'astro';
import { mockSubmissions } from '../../mock/data';
import { isMockMode, publicWriteMode } from '../../lib/mode';
import { dataStore, runtimeValue } from '../../lib/runtime';
import { createEncounter, login } from '../../lib/wildbook';

export const POST: APIRoute = async ({ request, locals, redirect }) => {
  const form = await request.formData();
  const image = form.get('image');
  if (!(image instanceof File) || image.size === 0) return new Response('Choose a photo to continue.', { status: 400 });

  const id = crypto.randomUUID();
  const demoMatches = mockSubmissions[0]!.match_json;
  const submission = {
    id,
    created_at: new Date().toISOString(),
    photographer_name: String(form.get('photographer_name') || 'Community photographer'),
    photographer_email: String(form.get('photographer_email') || 'pending@example.org'),
    site_id: String(form.get('site_id') || 'tofo'),
    observed_at: String(form.get('observed_at') || new Date().toISOString().slice(0, 10)),
    image_key: '/mock/whale-shark-1.svg',
    wildbook_encounter_id: null as string | null,
    status: 'matched',
    match_json: demoMatches,
  };

  if (!isMockMode() && publicWriteMode() === 'live') {
    const serviceUser = runtimeValue(locals, 'WILDBOOK_SERVICE_USER');
    const servicePassword = runtimeValue(locals, 'WILDBOOK_SERVICE_PASSWORD');
    if (!serviceUser || !servicePassword) return new Response('Public write credentials are not configured.', { status: 503 });
    const authenticated = await login(serviceUser, servicePassword);
    const encounter = await createEncounter(authenticated.cookie, {
      photographerName: submission.photographer_name,
      photographerEmail: submission.photographer_email,
      locationId: submission.site_id,
      encounterDate: submission.observed_at,
      sourceSubmissionId: submission.id,
    });
    submission.wildbook_encounter_id = encounter.id;
    submission.status = 'submitted';
  }

  await dataStore(locals).createSubmission(submission);
  return redirect(`/match/${id}`, 303);
};
