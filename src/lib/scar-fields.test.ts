import { describe, expect, test } from 'vitest';
import { normaliseScarFields } from './scar-fields';
import { buildScarSummaryLine, parseScarSummaryLine } from './scar-summary';
import { buildScarExportRows } from './scar-export';
import type { ScarRecord } from './db';

const legacy: ScarRecord = {
  id: 'old-1', species_id: 'whale-shark', schema_version: '1.1-proposal', encounter_id: 'enc-9', individual_id: 'MZ-001', individual_uuid: null, site_id: 'tofo', observer: 'clare', recorded_at: '2026-08-14T10:00:00.000Z', photo_asset_id: null, x: null, y: null,
  fields_json: JSON.stringify({ body_region: 'dorsal_fin_1', type: 'laceration', severity: 'major', freshness: 'fresh', likely_cause: 'propeller', confidence: 'certain' }), notes: 'Old note.', first_seen_encounter_id: 'enc-9', synced_at: null, sync_status: 'disabled', sync_error: null,
};

describe('schema 1.x records under the v2.0 vocabulary', () => {
  test('maps a named legacy cause to the method axes and flags the row', () => {
    expect(normaliseScarFields(legacy)).toEqual({
      legacy: true, legacyVersion: '1.1-proposal',
      fields: expect.objectContaining({ anthropogenic: 'yes', threat: 'vessel', cause: 'propeller', confidence: 'confirmed', severity: 'major', healing_stage: 'fresh', body_region: 'dorsal_fin_1', observation_mode: 'photograph_only', notes: expect.stringContaining('migrated from schema v1.1-proposal') }),
    });
    const abrasion = normaliseScarFields({ ...legacy, fields_json: JSON.stringify({ body_region: 'flank', type: 'abrasion', severity: 'minor', freshness: 'healed', likely_cause: 'unknown', confidence: 'possible' }) });
    expect(abrasion.fields).toMatchObject({ anthropogenic: 'abrasion', threat: 'contact', cause: 'contact', severity: 'minor', confidence: 'possible', body_region: 'flank' });
    expect(normaliseScarFields({ ...legacy, schema_version: '2.0', fields_json: JSON.stringify({ anthropogenic: 'yes' }) })).toEqual({ legacy: false, legacyVersion: null, fields: { anthropogenic: 'yes' } });
  });

  test('summary line and export carry the mapping instead of degrading the record', () => {
    expect(buildScarSummaryLine([legacy], '2.0')).toBe('[scars v2.0] 1st dorsal fin: yes · vessel / propeller · major · confirmed · fresh · migrated from v1.1-proposal (whaleshark.org, 2026-08-14, clare)');
    expect(parseScarSummaryLine(buildScarSummaryLine([legacy], '2.0'))?.records[0]).toMatchObject({ anthropogenic: 'yes', threat: 'vessel', cause: 'propeller', severity: 'major', confidence: 'confirmed', healingStage: 'fresh' });
    const exported = buildScarExportRows([legacy], [])[0]!;
    expect(exported).toMatchObject({ anthropogenic: 'Y', threat: 'V', cause: 'P', confidence: '1', severity: 'Major', region: '1st dorsal' });
    expect(exported.notes).toContain('Old note.');
    expect(exported.notes).toContain('mapped from schema v1.1-proposal');
  });

  test('write-back of a legacy-only encounter carries the current schema version, so the line round-trips', async () => {
    const { createMemoryStore } = await import('./db');
    const { syncScarRecordsToWildbook } = await import('./scar-sync');
    const store = createMemoryStore();
    store.reset();
    await store.createScarRecord({ ...legacy, encounter_id: 'legacy-only' });
    const calls: string[] = [];
    const fetcher = (async (_url: unknown, init?: RequestInit) => { calls.push(String(init?.body ?? '')); return Response.json({ id: 'legacy-only', distinguishingScar: '' }); }) as unknown as typeof fetch;
    await syncScarRecordsToWildbook({ store, cookie: 'JSESSIONID=x', encounterId: 'legacy-only', fetcher });
    const line = (JSON.parse(calls[1]!) as Array<{ value: string }>)[0]!.value;
    expect(line.startsWith('[scars v2.0]')).toBe(true);
    expect(parseScarSummaryLine(line)?.records[0]).toMatchObject({ threat: 'vessel', cause: 'propeller', severity: 'major', healingStage: 'fresh' });
  });

  test('a schema 1.x summary line already on Sharkbook is kept verbatim, not misread as v2 fields', () => {
    const parsed = parseScarSummaryLine('Old rope wound.\n\n[scars v1.0] flank: abrasion · minor · healed · unknown (whaleshark.org, 2026-08-18, clare)');
    expect(parsed?.schemaVersion).toBe('1.0');
    expect(parsed?.records[0]).toEqual({ legacyText: 'flank: abrasion · minor · healed · unknown', bodyRegion: 'flank', anthropogenic: '', threat: '', cause: 'unknown (abrasion)', severity: 'minor', confidence: 'certain', healingStage: 'healed' });
  });
});
