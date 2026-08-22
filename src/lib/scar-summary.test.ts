import { describe, expect, test } from 'vitest';
import type { ScarRecord } from './db';
import { buildScarSummaryLine, mergeDistinguishingScar, parseScarSummaryLine, withoutScarSummaryLine } from './scar-summary';

const records: ScarRecord[] = [
  {
    id: 'scar-b', species_id: 'whale-shark', schema_version: '1.0', encounter_id: 'enc-1', individual_id: 'MZ-284', individual_uuid: 'uuid-1', site_id: 'tofo', observer: 'spierce', recorded_at: '2026-08-22T09:30:00.000Z', photo_asset_id: null, x: null, y: null,
    fields_json: JSON.stringify({ body_region: 'flank', type: 'abrasion', severity: 'minor', freshness: 'fresh', likely_cause: 'unknown', confidence: 'certain' }), notes: null, first_seen_encounter_id: 'enc-1', synced_at: null, sync_status: 'pending', sync_error: null,
  },
  {
    id: 'scar-a', species_id: 'whale-shark', schema_version: '1.0', encounter_id: 'enc-1', individual_id: 'MZ-284', individual_uuid: 'uuid-1', site_id: 'tofo', observer: 'spierce', recorded_at: '2026-08-22T09:00:00.000Z', photo_asset_id: null, x: null, y: null,
    fields_json: JSON.stringify({ body_region: 'dorsal_fin_1', type: 'amputation', severity: 'major', freshness: 'healed', likely_cause: 'boat_strike', confidence: 'probable' }), notes: null, first_seen_encounter_id: 'enc-1', synced_at: null, sync_status: 'pending', sync_error: null,
  },
];

describe('scar summary line', () => {
  test('builds one deterministic line from schema labels', () => {
    expect(buildScarSummaryLine(records, '1.0')).toBe(
      '[scars v1.0] dorsal fin, 1st: amputation · major · healed · probable boat strike | flank: abrasion · minor · fresh · unknown (whaleshark.org, 2026-08-22, spierce)',
    );
    expect(buildScarSummaryLine([...records].reverse(), '1.0')).toBe(buildScarSummaryLine(records, '1.0'));
  });

  test('parses the structured records and source metadata back from mixed text', () => {
    expect(parseScarSummaryLine(`Human note.\n\n${buildScarSummaryLine(records, '1.0')}`)).toEqual({
      schemaVersion: '1.0',
      records: [
        { bodyRegion: 'dorsal fin, 1st', type: 'amputation', severity: 'major', freshness: 'healed', likelyCause: 'boat strike', confidence: 'probable' },
        { bodyRegion: 'flank', type: 'abrasion', severity: 'minor', freshness: 'fresh', likelyCause: 'unknown', confidence: 'certain' },
      ],
      recordedDate: '2026-08-22',
      observer: 'spierce',
    });
  });

  test('appends once, replaces our previous line, and preserves human text byte-for-byte', () => {
    const first = '[scars v1.0] flank: abrasion · minor · fresh · unknown (whaleshark.org, 2026-08-21, clare)';
    const next = buildScarSummaryLine(records, '1.0');
    const existing = `Leading-edge prop cuts.\nKeep this line exactly.\n\n${first}`;
    const merged = mergeDistinguishingScar(existing, next);

    expect(merged).toBe(`Leading-edge prop cuts.\nKeep this line exactly.\n\n${next}`);
    expect(mergeDistinguishingScar(merged, next)).toBe(merged);
    expect(withoutScarSummaryLine(merged)).toBe('Leading-edge prop cuts.\nKeep this line exactly.');
  });
});
