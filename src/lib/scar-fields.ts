import type { ScarRecord } from './db';

/**
 * Reads a scar record's fields in the current (v2.0, method v0.1) vocabulary regardless of
 * the schema version it was saved under. Schema 1.x rows (Speed et al. 2008 type + merged
 * "likely cause") are mapped only where the equivalence is defensible; anything else is
 * left unknown and the row is flagged `legacy` so the page, the Sharkbook summary line and
 * the CSV export can say so instead of silently degrading it.
 */
export interface NormalisedScarFields {
  fields: Record<string, string>;
  legacy: boolean;
  legacyVersion: string | null;
}

// v1.x likely_cause -> [anthropogenic, threat, cause]
const LEGACY_CAUSES: Record<string, [string, string, string]> = {
  propeller: ['yes', 'vessel', 'propeller'],
  boat_strike: ['yes', 'vessel', 'strike'],
  net_line: ['yes', 'fisheries', 'entanglement'],
  knife: ['yes', 'human_other', 'human_other'],
  anthropogenic_unknown: ['yes', 'human_other', 'unknown'],
  scientific: ['yes', 'scientific', 'scientific'],
  predator: ['natural', 'natural', 'natural'],
  natural: ['natural', 'natural', 'natural'],
  unknown: ['unknown', 'unknown', 'unknown'],
};
const LEGACY_CONFIDENCE: Record<string, string> = { certain: 'confirmed', probable: 'probable', possible: 'possible' };

// v1.x severity was major/minor only; the method adds moderate (cuts, notches, nicks).
function legacySeverity(raw: Record<string, string>): string {
  if (raw.severity === 'major' || raw.type === 'amputation') return 'major';
  if (raw.type === 'laceration' || raw.type === 'nick') return 'moderate';
  return raw.severity === 'minor' ? 'minor' : '';
}

export function isLegacySchemaVersion(version: string): boolean {
  return /^1(\.|$)/.test(version);
}

export function normaliseScarFields(record: Pick<ScarRecord, 'schema_version' | 'fields_json' | 'notes'>): NormalisedScarFields {
  const raw = JSON.parse(record.fields_json) as Record<string, string>;
  if (!isLegacySchemaVersion(record.schema_version)) return { fields: raw, legacy: false, legacyVersion: null };

  const [anthropogenic, threat, cause] = LEGACY_CAUSES[raw.likely_cause ?? ''] ?? ['unknown', 'unknown', 'unknown'];
  const abrasion = raw.type === 'abrasion' && (raw.likely_cause === 'unknown' || !raw.likely_cause);
  const fields: Record<string, string> = {
    observation_mode: 'photograph_only',
    body_region: raw.body_region ?? '',
    anthropogenic: abrasion ? 'abrasion' : anthropogenic,
    threat: abrasion ? 'contact' : threat,
    cause: abrasion ? 'contact' : cause,
    confidence: LEGACY_CONFIDENCE[raw.confidence ?? ''] ?? 'unknown',
    severity: legacySeverity(raw),
    n_scars: '1',
    notes: [raw.notes, `migrated from schema v${record.schema_version}: type=${raw.type ?? '?'}, likely_cause=${raw.likely_cause ?? '?'}, confidence=${raw.confidence ?? '?'}`].filter(Boolean).join(' / '),
  };
  if (raw.freshness) fields.healing_stage = raw.freshness;
  return { fields, legacy: true, legacyVersion: record.schema_version };
}
