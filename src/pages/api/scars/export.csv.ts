import type { APIRoute } from 'astro';
import siteConfig from '../../../../site.config';
import { appDataStore } from '../../../lib/runtime';
import { isMockAppMode } from '../../../lib/mode';
import { mockEncounters } from '../../../mock/data';
import { buildScarExportRows, scarExportCsv } from '../../../lib/scar-export';

// Table A of the published method (templates/scar_records_template.csv) for one site:
// every scar row plus the explicit-zero review rows (and pre-v2.0 'no new scars' reviews under
// their own row type, for adjudication). Encounter dates are joined from
// the mock fixtures in mock mode; in live mode they come from Sharkbook via encounter_ref.
export const GET: APIRoute = async ({ url, locals }) => {
  const siteId = url.searchParams.get('site') ?? siteConfig.sites[0]!.id;
  const store = appDataStore(locals);
  const records = (await store.listScarRecords()).filter((record) => record.site_id === siteId);
  const encounterIds = new Set(records.map((record) => record.encounter_id));
  // Zero rows belong to the site they were reviewed under; reviews saved before site_id existed
  // (NULL) are included when one of the site's scar rows references the same encounter.
  const reviews = (await store.listReviewStatuses()).filter((review) => review.status !== 'recorded' && review.status !== 'needs_record' && (review.site_id === siteId || (!review.site_id && encounterIds.has(review.encounter_id))));
  const isoDate = (value: string) => { const parsed = new Date(value); return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString().slice(0, 10); };
  const encounterDates = new Map(isMockAppMode() ? mockEncounters.map((encounter) => [encounter.id, isoDate(encounter.date)] as const) : []);
  const csv = scarExportCsv(buildScarExportRows(records, reviews, encounterDates));
  return new Response(csv, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="whaleshark-org-scars-${siteId}-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
};
