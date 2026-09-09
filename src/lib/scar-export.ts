import type { EncounterReview, ScarRecord } from './db';
import { getSpecies } from './species';
import { normaliseScarFields } from './scar-fields';

/**
 * Rows in the shape of `templates/scar_records_template.csv` from
 * github.com/marinemegafauna/whale-shark-scar-classification (method v0.1), so a site's
 * whaleshark.org records drop straight into the method's Table A.
 *
 * Method codes are read from the option labels ("Propeller (P)" -> P), so the species
 * YAML stays the single place terminology lives. Encounter date and season live on
 * Sharkbook, not in D1: pass `encounterDates` (encounter id -> ISO date) when you have
 * them; otherwise those two columns are left blank and `encounter_ref` is the join key.
 */
export const SCAR_EXPORT_COLUMNS = [
  'shark_id', 'date', 'season', 'encounter_ref', 'observer', 'observation_mode', 'row_type', 'regions_examined', 'description',
  'anthropogenic', 'threat', 'cause', 'confidence', 'severity', 'region', 'n_scars', 'photo_ref', 'source', 'notes',
] as const;

const REGION_TERMS: Record<string, string> = {
  head: 'head', gills: 'gills', mouth: 'mouth', dorsal_fin_1: '1st dorsal', dorsal_fin_2: '2nd dorsal', pectoral_fin: 'pectoral fin', pelvic_fin: 'pelvic fin',
  claspers: 'claspers', flank_anterior: 'anterior flank', flank_posterior: 'posterior flank', ventral_surface: 'ventral surface', caudal_peduncle: 'caudal peduncle', caudal_fin: 'caudal fin',
};
const OBSERVATION_MODES: Record<string, string> = { in_water: 'in water', from_boat: 'from boat', photograph_only: 'photograph only' };

export type ScarExportRow = Record<(typeof SCAR_EXPORT_COLUMNS)[number], string>;

function emptyRow(): ScarExportRow {
  return Object.fromEntries(SCAR_EXPORT_COLUMNS.map((column) => [column, ''])) as ScarExportRow;
}

function methodCode(label: string | undefined, fallback: string): string {
  const match = label?.match(/\(([A-Za-z]+)\)\s*$/);
  if (match) return match[1]!;
  const numbered = label?.match(/^(\d+)\s/);
  return numbered ? numbered[1]! : fallback;
}

function regionTerm(fields: Record<string, string>, detailLabels: Map<string, string>): string {
  const base = REGION_TERMS[fields.body_region ?? ''] ?? fields.body_region ?? '';
  const detail = fields.region_detail ? detailLabels.get(fields.region_detail)?.toLowerCase() ?? fields.region_detail : '';
  return detail ? `${base} (${detail})` : base;
}

function season(date: string): string {
  return /^\d{4}/.test(date) ? date.slice(0, 4) : '';
}

export function buildScarExportRows(records: ScarRecord[], reviews: EncounterReview[], encounterDates: Map<string, string> = new Map()): ScarExportRow[] {
  const rows: ScarExportRow[] = [];
  const speciesIds = new Set([...records.map((record) => record.species_id), ...reviews.map((review) => review.species_id)]);
  const labelsBySpecies = new Map([...speciesIds].map((id) => {
    const species = getSpecies(id);
    return [id, new Map(species.fields.map((field) => [field.id, new Map((field.options ?? []).map((option) => [option.id, option.label]))]))] as const;
  }));
  for (const record of records) {
    const labels = labelsBySpecies.get(record.species_id)!;
    const { fields, legacy, legacyVersion } = normaliseScarFields(record);
    const date = encounterDates.get(record.encounter_id) ?? '';
    const row = emptyRow();
    Object.assign(row, {
      shark_id: record.individual_id ?? record.individual_uuid ?? '',
      date, season: season(date), encounter_ref: record.encounter_id, observer: record.observer,
      observation_mode: OBSERVATION_MODES[fields.observation_mode ?? ''] ?? fields.observation_mode ?? '',
      row_type: 'scar', description: fields.description ?? '',
      anthropogenic: methodCode(labels.get('anthropogenic')?.get(fields.anthropogenic ?? ''), 'U'),
      threat: methodCode(labels.get('threat')?.get(fields.threat ?? ''), 'U'),
      cause: methodCode(labels.get('cause')?.get(fields.cause ?? ''), 'U'),
      confidence: methodCode(labels.get('confidence')?.get(fields.confidence ?? ''), '4'),
      severity: fields.severity ? `${fields.severity[0]!.toUpperCase()}${fields.severity.slice(1)}` : '',
      region: regionTerm(fields, labels.get('region_detail') ?? new Map()),
      n_scars: fields.n_scars ?? '1', photo_ref: record.photo_asset_id ?? '', source: 'whaleshark.org',
      notes: [...new Set([fields.notes, record.notes, legacy ? `review: mapped from schema v${legacyVersion}` : undefined].filter(Boolean))].join(' / '),
    });
    rows.push(row);
  }
  for (const review of reviews) {
    if (review.status !== 'examined_clean' && review.status !== 'not_examined' && review.status !== 'no_new_scars') continue;
    const date = encounterDates.get(review.encounter_id) ?? '';
    const regions = review.regions_examined ? (JSON.parse(review.regions_examined) as string[]).map((id) => REGION_TERMS[id] ?? id).join('; ') : '';
    // `no_new_scars` (pre-v2.0) is NOT an explicit zero: existing scars may remain and the regions
    // inspected were never recorded. It is exported under its own row type for adjudication.
    const rowType = review.status === 'not_examined' ? 'not_examined' : review.status === 'no_new_scars' ? 'legacy_no_new_scars' : 'examined_clean';
    const row = emptyRow();
    Object.assign(row, {
      shark_id: review.individual_id ?? review.individual_uuid ?? '', date, season: season(date), encounter_ref: review.encounter_id, observer: review.reviewed_by ?? '',
      row_type: rowType, regions_examined: regions, n_scars: rowType === 'examined_clean' ? '0' : '', source: 'whaleshark.org',
      notes: rowType === 'legacy_no_new_scars' ? 'pre-v2.0 "no new scars" review: not an explicit zero; regions examined not recorded; adjudicate before use' : '',
    });
    rows.push(row);
  }
  return rows;
}

function csvCell(value: string): string {
  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function scarExportCsv(rows: ScarExportRow[]): string {
  const lines = [SCAR_EXPORT_COLUMNS.join(',')];
  for (const row of rows) lines.push(SCAR_EXPORT_COLUMNS.map((column) => csvCell(row[column])).join(','));
  return `${lines.join('\n')}\n`;
}
