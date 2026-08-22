import type { APIRoute } from 'astro';
import siteConfig from '../../../site.config';
import { getSpecies } from '../../lib/species';
import { isMockAppMode } from '../../lib/mode';
import { mockEncounters } from '../../mock/data';
import { appDataStore } from '../../lib/runtime';
import { isWildbookUnauthorized, searchEncounters } from '../../lib/wildbook';

export const POST: APIRoute = async ({ request, cookies, locals, redirect }) => {
  const form = await request.formData();
  const encounterId = String(form.get('encounter_id') ?? '');
  const siteId = String(form.get('site_id') ?? 'tofo');
  const status = form.get('status') === 'no_new_scars' ? 'no_new_scars' : 'recorded';
  const store = appDataStore(locals);
  await store.setReviewStatus(encounterId, 'whale-shark', status, locals.session?.username ?? 'mock-researcher');
  let nextId: string | undefined;
  if (isMockAppMode()) {
    const currentIndex = mockEncounters.findIndex((encounter) => encounter.id === encounterId);
    nextId = mockEncounters.slice(currentIndex + 1).find((encounter) => ['b3453961', '4935bac7'].includes(encounter.id))?.id;
  } else {
    const site = siteConfig.sites.find((candidate) => candidate.id === siteId) ?? siteConfig.sites[0];
    const species = getSpecies('whale-shark');
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
