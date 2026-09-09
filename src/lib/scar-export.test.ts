import { describe, expect, test } from 'vitest';
import { mockReviewStatuses, mockScarRecords } from '../mock/data';
import { SCAR_EXPORT_COLUMNS, buildScarExportRows, scarExportCsv } from './scar-export';

// Header of templates/scar_records_template.csv in marinemegafauna/whale-shark-scar-classification v0.1.
const TEMPLATE_HEADER = 'shark_id,date,season,encounter_ref,observer,observation_mode,row_type,regions_examined,description,anthropogenic,threat,cause,confidence,severity,region,n_scars,photo_ref,source,notes';

describe('method template export', () => {
  test('matches the published template columns exactly', () => {
    expect(SCAR_EXPORT_COLUMNS.join(',')).toBe(TEMPLATE_HEADER);
  });

  test('codes each scar row with the method codes and the method region terms', () => {
    const rows = buildScarExportRows(mockScarRecords, [], new Map([['2fca3548', '2026-08-14']]));
    expect(rows).toEqual([
      expect.objectContaining({
        shark_id: 'MZ-284', date: '2026-08-14', season: '2026', encounter_ref: '2fca3548', observer: 'clare', observation_mode: 'in water', row_type: 'scar', regions_examined: '',
        description: 'Prop cuts on the leading edge of the first dorsal', anthropogenic: 'Y', threat: 'V', cause: 'P', confidence: '1', severity: 'Moderate', region: '1st dorsal (leading edge)', n_scars: '1', photo_ref: 'mock-1', source: 'whaleshark.org', notes: 'Observer named the cause.',
      }),
      expect.objectContaining({ observation_mode: 'photograph only', anthropogenic: 'U', threat: 'U', cause: 'K', confidence: '3', severity: 'Moderate', region: 'caudal fin (upper lobe)', notes: '' }),
    ]);
  });

  test('emits the explicit zero as an examined_clean row listing the regions inspected', () => {
    const rows = buildScarExportRows([], mockReviewStatuses);
    expect(rows).toEqual([
      expect.objectContaining({ shark_id: 'MZ-093', encounter_ref: 'a17e02d9', row_type: 'examined_clean', regions_examined: '1st dorsal; anterior flank; posterior flank; caudal fin', n_scars: '0', observer: 'clare', anthropogenic: '', region: '' }),
    ]);
  });

  test('keeps not-examined and pre-v2.0 "no new scars" reviews out of the explicit zeros', () => {
    const base = { species_id: 'whale-shark', reviewed_by: 'clare', reviewed_at: '2026-08-09T12:00:00.000Z', regions_examined: null, site_id: 'tofo', individual_id: null, individual_uuid: null };
    const rows = buildScarExportRows([], [
      { ...base, encounter_id: 'e1', status: 'not_examined' },
      { ...base, encounter_id: 'e2', status: 'no_new_scars' },
      { ...base, encounter_id: 'e3', status: 'recorded' },
    ]);
    expect(rows.map((row) => [row.encounter_ref, row.row_type, row.n_scars])).toEqual([['e1', 'not_examined', ''], ['e2', 'legacy_no_new_scars', '']]);
    expect(rows[1]!.notes).toContain('not an explicit zero');
  });

  test('quotes CSV cells that carry commas, quotes or newlines', () => {
    const csv = scarExportCsv(buildScarExportRows([{ ...mockScarRecords[0]!, fields_json: JSON.stringify({ ...JSON.parse(mockScarRecords[0]!.fields_json), description: 'cuts, "three", parallel\nfresh' }) }], []));
    expect(csv.split('\n')[0]).toBe(TEMPLATE_HEADER);
    expect(csv).toContain('"cuts, ""three"", parallel\nfresh"');
  });
});
