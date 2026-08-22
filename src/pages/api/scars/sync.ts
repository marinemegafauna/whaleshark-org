import type { APIRoute } from 'astro';
import { isMockAppMode, scarWritebackMode } from '../../../lib/mode';
import { appDataStore } from '../../../lib/runtime';
import { syncScarRecordsToWildbook } from '../../../lib/scar-sync';

export const POST: APIRoute = async ({ request, locals, redirect }) => {
  const form = await request.formData();
  const encounterId = String(form.get('encounter_id') ?? '');
  const siteId = String(form.get('site_id') ?? 'tofo');
  if (!encounterId) return Response.json({ error: 'encounter_id_required' }, { status: 400 });
  const store = appDataStore(locals);
  let status: 'synced' | 'failed' | 'disabled' = 'disabled';
  if (scarWritebackMode() === 'append' && !isMockAppMode()) {
    status = (await syncScarRecordsToWildbook({
      store, cookie: locals.session?.wildbook_cookie ?? '', encounterId,
    })).status;
  } else {
    const records = await store.listScarRecords({ encounterId });
    await Promise.all(records.map((record) => store.updateScarRecord(record.id, {
      synced_at: null, sync_status: 'disabled', sync_error: null,
    })));
  }
  return redirect(`/app/encounters/${encounterId}/scars?site=${encodeURIComponent(siteId)}&sync=${status}`, 303);
};
