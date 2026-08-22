import type { APIRoute } from 'astro';
import { dataStore } from '../../../../lib/runtime';

export const POST: APIRoute = async ({ params, request, locals, redirect }) => {
  const id = params.id!;
  const submission = await dataStore(locals).getSubmission(id);
  if (!submission) return new Response('Submission not found.', { status: 404 });
  const form = await request.formData();
  const decision = String(form.get('decision') ?? 'confirm');
  const patch = decision === 'confirm'
    ? { status: 'confirmed' }
    : { status: decision === 'none' ? 'no_match' : 'needs_review' };
  await dataStore(locals).updateSubmission(id, patch);
  return redirect(`/match/${id}?decision=${decision}`, 303);
};
