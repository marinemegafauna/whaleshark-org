import type { ScarRecord } from './db';
import { getSpecies } from './species';
import { isLegacySchemaVersion, normaliseScarFields } from './scar-fields';

const SUMMARY_LINE = /^\[scars v([^\]]+)\]\s+(.+?)\s+\(whaleshark\.org,\s*(\d{4}-\d{2}-\d{2}),\s*([^)]+)\)\s*$/m;

/**
 * One scar as it appears in the Sharkbook summary line (schema v2.0, method v0.1):
 *   <region[ (detail)]>: <anthropogenic> · <threat> / <cause> · <severity> · <confidence>[ · <healing stage>]
 * Option labels carry the method codes in parentheses ("Propeller (P)"); the line drops
 * them so it stays readable in Sharkbook, and the parser reads the words back.
 */
export interface ParsedScarSummaryRecord {
  /** Schema 1.x lines carried type · severity · freshness · [confidence ]cause; they are kept verbatim in `legacyText`. */
  legacyText?: string;
  bodyRegion: string;
  anthropogenic: string;
  threat: string;
  cause: string;
  severity: string;
  confidence: string;
  healingStage: string | null;
}

export interface ParsedScarSummary {
  schemaVersion: string;
  records: ParsedScarSummaryRecord[];
  recordedDate: string;
  observer: string;
}

function lowerLabel(value: string): string {
  return value ? `${value[0]!.toLowerCase()}${value.slice(1)}` : value;
}

/** "Propeller (P)" -> "propeller"; "Red/pink · fresh" -> "fresh"; "1 Confirmed" -> "confirmed"; "Abrasion / contact (A)" -> "abrasion". */
function summaryOptionLabel(fieldId: string, value: string): string {
  let compact = value;
  if (fieldId === 'healing_stage' && compact.includes('·')) compact = compact.split('·').at(-1)!.trim();
  if (fieldId === 'confidence') compact = compact.replace(/^\d+\s+/, '');
  compact = compact.replace(/\s*\([A-Za-z]+\)\s*$/, '');
  // "Abrasion / contact" -> "abrasion", "Strike, blunt" -> "strike": keeps ' / ' and ' · ' as separators only.
  compact = compact.split(' / ')[0]!.split(',')[0]!.trim();
  return lowerLabel(compact);
}

export function buildScarSummaryLine(records: ScarRecord[], schemaVersion: string): string {
  if (!records.length) throw new Error('At least one scar record is required for write-back');
  const species = getSpecies(records[0]!.species_id);
  const labels = new Map(species.fields.flatMap((field) => (field.options ?? []).map((option) => [`${field.id}:${option.id}`, summaryOptionLabel(field.id, option.label)] as const)));
  const summaries = records.map((record) => {
    const { fields, legacy, legacyVersion } = normaliseScarFields(record);
    const label = (field: string, fallback = 'unknown') => labels.get(`${field}:${fields[field]}`) ?? fields[field] ?? fallback;
    const region = fields.region_detail ? `${label('body_region')} (${label('region_detail')})` : label('body_region');
    const healing = fields.healing_stage ? ` · ${label('healing_stage')}` : '';
    const migrated = legacy ? ` · migrated from v${legacyVersion}` : '';
    return {
      key: `${region} ${record.id}`,
      text: `${region}: ${label('anthropogenic')} · ${label('threat')} / ${label('cause')} · ${label('severity')} · ${label('confidence')}${healing}${migrated}`,
    };
  }).sort((a, b) => a.key.localeCompare(b.key));
  const latest = [...records].sort((a, b) => `${b.recorded_at} ${b.id}`.localeCompare(`${a.recorded_at} ${a.id}`))[0]!;
  return `[scars v${schemaVersion}] ${summaries.map(({ text }) => text).join(' | ')} (whaleshark.org, ${latest.recorded_at.slice(0, 10)}, ${latest.observer})`;
}

export function parseScarSummaryLine(text: string | null | undefined): ParsedScarSummary | null {
  const match = text?.match(SUMMARY_LINE);
  if (!match) return null;
  const schemaVersion = match[1]!;
  const records = match[2]!.split(' | ').map((part): ParsedScarSummaryRecord => {
    const [bodyRegion = '', rest = ''] = part.split(/:\s+/, 2);
    if (isLegacySchemaVersion(schemaVersion)) {
      const [type = '', severity = '', freshness = '', causeText = ''] = rest.split(' · ');
      const confidence = causeText.startsWith('probable ') ? 'probable' : causeText.startsWith('possible ') ? 'possible' : 'certain';
      const cause = confidence === 'certain' ? causeText : causeText.slice(confidence.length + 1);
      return { legacyText: part, bodyRegion, anthropogenic: '', threat: '', cause: `${cause} (${type})`, severity, confidence, healingStage: freshness || null };
    }
    const parts = rest.split(' · ');
    const [anthropogenic = '', threatCause = '', severity = '', confidence = ''] = parts;
    const healingStage = parts[4] && !parts[4].startsWith('migrated from') ? parts[4] : null;
    const [threat = '', cause = ''] = threatCause.split(' / ');
    if (parts.length < 4 || !threatCause.includes(' / ')) return { legacyText: part, bodyRegion, anthropogenic: '', threat: '', cause: rest, severity: '', confidence: '', healingStage: null };
    return { bodyRegion, anthropogenic, threat, cause, severity, confidence, healingStage };
  });
  return { schemaVersion, records, recordedDate: match[3]!, observer: match[4]!.trim() };
}

export function mergeDistinguishingScar(existing: string | null | undefined, line: string): string {
  if (!existing?.trim()) return line;
  return SUMMARY_LINE.test(existing) ? existing.replace(SUMMARY_LINE, line) : `${existing}\n\n${line}`;
}

export function withoutScarSummaryLine(text: string | null | undefined): string {
  if (!text) return '';
  return text.replace(SUMMARY_LINE, '').replace(/\n{2,}$/g, '').trimEnd();
}
