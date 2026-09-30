import { safeMatchingReturn } from '../../lib/match-return';
import type { APIRoute } from 'astro';
import siteConfig from '../../../site.config';
import { getSpecies } from '../../lib/species';
import { isMockAppMode } from '../../lib/mode';
import { mockEncounters } from '../../mock/data';
import { appDataStore } from '../../lib/runtime';
import { isWildbookUnauthorized, searchEncounters } from '../../lib/wildbook';

export const POST: APIRoute = async ({ request, cookies, locals, redirect }) => {
  const form = await request.formData();
  const matchingReturn = safeMatchingReturn(form.get('return'));
  const encounterId = String(form.get('encounter_id') ?? '');
  const siteId = String(form.get('site_id') ?? 'tofo');
  const status = String(form.get('status') ?? 'recorded');
  if (status !== 'recorded' && status !== 'examined_clean' && status !== 'not_examined') return Response.json({ error: 'invalid_status' }, { status: 400 });
  const species = getSpecies('whale-shark');
  const validRegions = new Set((species.fields.find((field) => field.id === 'body_region')?.options ?? []).map((option) => option.id));
  const requestedRegions = form.getAll('regions_examined').map(String);
  if (requestedRegions.some((region) => !validRegions.has(region))) return Response.json({ error: 'invalid_region' }, { status: 400 });
  const regionsExamined = [...new Set(requestedRegions)];
  if (status === 'examined_clean' && !regionsExamined.length) {
    return redirect(`/app/encounters/${encounterId}/scars?site=${encodeURIComponent(siteId)}&error=regions${matchingReturn ? `&return=${encodeURIComponent(matchingReturn)}` : ''}`, 303);
  }
  const store = appDataStore(locals);
  await store.setReviewStatus(encounterId, species.id, status, locals.session?.username ?? 'mock-researcher', {
    regionsExamined: status === 'examined_clean' ? regionsExamined : undefined, siteId, individualId: String(form.get('individual_id') || '') || null, individualUuid: String(form.get('individual_uuid') || '') || null,
  });
  if (matchingReturn) return redirect(matchingReturn, 303);
  let nextId: string | undefined;
  if (isMockAppMode()) {
    const currentIndex = mockEncounters.findIndex((encounter) => encounter.id === encounterId);
    nextId = mockEncounters.slice(currentIndex + 1).find((encounter) => ['b3453961', '4935bac7'].includes(encounter.id))?.id;
  } else {
    const site = siteConfig.sites.find((candidate) => candidate.id === siteId) ?? siteConfig.sites[0];
    let result;
    try {
      result = await searchEncounters(locals.session!.wildbook_cookie, { locationIds: [...site.locationIds], taxonomy: species.wildbook_taxonomy, from: 0, size: 100 });
    } catch (error) {
      if (!isWildbookUnauthorized(error)) throw error;
      cookies.delete('whaleshark_session', { path: '/' });
      return redirect('/signin?error=expired', 303);
    }
    const reviewed = new Set((await store.listReviewStatuses()).map((review) => review.encounter_id));
    const currentIndex = result.hits.findIndex((encounter) => encounter.id === encounterId);
    nextId = result.hits.slice(currentIndex + 1).find((encounter) => !reviewed.has(encounter.id))?.id;
  }
  return redirect(nextId ? `/app/encounters/${nextId}/scars?site=${encodeURIComponent(siteId)}` : `/app?site=${encodeURIComponent(siteId)}`, 303);
};
