import type { APIRoute } from 'astro';
import { mockSubmissions, publicSubmissionDefaults } from '../../mock/data';
import { isMockMode } from '../../lib/mode';
import { dataStore } from '../../lib/runtime';

export const POST: APIRoute = async ({ request, locals, redirect }) => {
  try {
    const form = await request.formData();
    const image = form.get('image');
    if (!(image instanceof File) || image.size === 0) return redirect('/?upload_error=missing#drop-photo', 303);

    const id = crypto.randomUUID();
    const mock = isMockMode();
    const demoMatches = mock ? JSON.parse(mockSubmissions[0]!.match_json ?? '[]') as unknown[] : [];
    const matchEnvelope: Record<string, unknown> = { candidates: demoMatches, mediaFilename: image.name };
    const submission = {
      id,
      created_at: new Date().toISOString(),
      photographer_name: String(form.get('photographer_name') || publicSubmissionDefaults.photographer_name),
      photographer_email: String(form.get('photographer_email') || publicSubmissionDefaults.photographer_email),
      site_id: String(form.get('site_id') || publicSubmissionDefaults.site_id),
      observed_at: String(form.get('observed_at') || new Date().toISOString().slice(0, 10)),
      image_key: '/mock/whale-shark-1.svg',
      wildbook_encounter_id: null as string | null,
      status: mock ? 'matched' : 'awaiting_report',
      match_json: JSON.stringify(matchEnvelope),
      observations_json: null,
    };

    await dataStore(locals).createSubmission(submission);
    return redirect(`/match/${id}`, 303);
  } catch {
    return redirect('/?upload_error=unavailable#drop-photo', 303);
  }
};
