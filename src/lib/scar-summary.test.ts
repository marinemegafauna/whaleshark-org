import { describe, expect, test } from 'vitest';
import type { ScarRecord } from './db';
import { buildScarSummaryLine, mergeDistinguishingScar, parseScarSummaryLine, withoutScarSummaryLine } from './scar-summary';

const base = { species_id: 'whale-shark', schema_version: '2.0', encounter_id: 'enc-1', individual_id: 'MZ-284', individual_uuid: 'uuid-1', site_id: 'tofo', observer: 'spierce', photo_asset_id: null, x: null, y: null, notes: null, first_seen_encounter_id: 'enc-1', synced_at: null, sync_status: 'pending' as const, sync_error: null };
const records: ScarRecord[] = [
  {
    ...base, id: 'scar-b', recorded_at: '2026-08-22T09:30:00.000Z',
    fields_json: JSON.stringify({ observation_mode: 'in_water', body_region: 'flank_posterior', region_detail: 'right', anthropogenic: 'abrasion', threat: 'contact', cause: 'contact', confidence: 'possible', severity: 'minor', n_scars: '1' }),
  },
  {
    ...base, id: 'scar-a', recorded_at: '2026-08-22T09:00:00.000Z',
    fields_json: JSON.stringify({ observation_mode: 'photograph_only', body_region: 'dorsal_fin_1', region_detail: 'tip', anthropogenic: 'yes', threat: 'vessel', cause: 'strike', confidence: 'probable', severity: 'major', healing_stage: 'healed', n_scars: '1' }),
  },
];

describe('scar summary line', () => {
  test('builds one deterministic, human-readable line from the method labels', () => {
    expect(buildScarSummaryLine(records, '2.0')).toBe(
      '[scars v2.0] 1st dorsal fin (tip): yes · vessel / strike · major · probable · healed | posterior flank (right): abrasion · contact / contact · minor · possible (whaleshark.org, 2026-08-22, spierce)',
    );
    expect(buildScarSummaryLine([...records].reverse(), '2.0')).toBe(buildScarSummaryLine(records, '2.0'));
  });

  test('parses the structured records and source metadata back from mixed text', () => {
    expect(parseScarSummaryLine(`Human note.\n\n${buildScarSummaryLine(records, '2.0')}`)).toEqual({
      schemaVersion: '2.0',
      records: [
        { bodyRegion: '1st dorsal fin (tip)', anthropogenic: 'yes', threat: 'vessel', cause: 'strike', severity: 'major', confidence: 'probable', healingStage: 'healed' },
        { bodyRegion: 'posterior flank (right)', anthropogenic: 'abrasion', threat: 'contact', cause: 'contact', severity: 'minor', confidence: 'possible', healingStage: null },
      ],
      recordedDate: '2026-08-22',
      observer: 'spierce',
    });
  });

  test('appends once, replaces our previous line (any schema version), and preserves human text byte-for-byte', () => {
    const first = '[scars v1.0] flank: abrasion · minor · fresh · unknown (whaleshark.org, 2026-08-21, clare)';
    const next = buildScarSummaryLine(records, '2.0');
    const existing = `Leading-edge prop cuts.\nKeep this line exactly.\n\n${first}`;
    const merged = mergeDistinguishingScar(existing, next);

    expect(merged).toBe(`Leading-edge prop cuts.\nKeep this line exactly.\n\n${next}`);
    expect(mergeDistinguishingScar(merged, next)).toBe(merged);
    expect(withoutScarSummaryLine(merged)).toBe('Leading-edge prop cuts.\nKeep this line exactly.');
  });
});
