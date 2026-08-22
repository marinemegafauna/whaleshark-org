import type { APIRoute } from 'astro';
import { appDataStore } from '../../lib/runtime';
import { isMockAppMode, scarWritebackMode } from '../../lib/mode';
import { syncScarRecordsToWildbook } from '../../lib/scar-sync';

export const POST: APIRoute = async ({ request, locals, redirect }) => {
  const form = await request.formData();
  const encounterId = String(form.get('encounter_id') ?? '');
  if (!encounterId) return Response.json({ error: 'encounter_id_required' }, { status: 400 });
  const fields: Record<string, string> = {};
  for (const [key, value] of form.entries()) {
    if (key.startsWith('field_')) fields[key.slice(6)] = String(value);
  }
  const writebackEnabled = scarWritebackMode() === 'append' && !isMockAppMode();
  const record = {
    id: crypto.randomUUID(), species_id: String(form.get('species_id') ?? 'whale-shark'), schema_version: String(form.get('schema_version') ?? '1.0'), encounter_id: encounterId,
    individual_id: String(form.get('individual_id') || '') || null, individual_uuid: String(form.get('individual_uuid') || '') || null, site_id: String(form.get('site_id') ?? 'tofo'), observer: locals.session?.username ?? 'mock-researcher', recorded_at: new Date().toISOString(),
    photo_asset_id: String(form.get('photo_asset_id') || '') || null, x: Number(form.get('x') || 0), y: Number(form.get('y') || 0), fields_json: JSON.stringify(fields), notes: String(form.get('notes') || '') || null, first_seen_encounter_id: encounterId,
    synced_at: null, sync_status: writebackEnabled ? 'pending' as const : 'disabled' as const, sync_error: null,
  };
  const store = appDataStore(locals);
  await store.createScarRecord(record);
  if (writebackEnabled) {
    await syncScarRecordsToWildbook({ store, cookie: locals.session?.wildbook_cookie ?? '', encounterId });
  }
  return redirect(`/app/encounters/${encounterId}/scars?site=${encodeURIComponent(record.site_id)}&saved=1`, 303);
};
