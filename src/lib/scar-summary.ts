import type { ScarRecord } from './db';
import { getSpecies } from './species';

const SUMMARY_LINE = /^\[scars v([^\]]+)\]\s+(.+?)\s+\(whaleshark\.org,\s*(\d{4}-\d{2}-\d{2}),\s*([^)]+)\)\s*$/m;

export interface ParsedScarSummaryRecord {
  bodyRegion: string;
  type: string;
  severity: string;
  freshness: string;
  likelyCause: string;
  confidence: 'certain' | 'probable' | 'possible';
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

function summaryOptionLabel(fieldId: string, value: string): string {
  const compact = fieldId === 'freshness' && value.includes('·') ? value.split('·').at(-1)!.trim() : value;
  return lowerLabel(compact);
}

export function buildScarSummaryLine(records: ScarRecord[], schemaVersion: string): string {
  if (!records.length) throw new Error('At least one scar record is required for write-back');
  const species = getSpecies(records[0]!.species_id);
  const labels = new Map(species.fields.flatMap((field) => (field.options ?? []).map((option) => [`${field.id}:${option.id}`, summaryOptionLabel(field.id, option.label)] as const)));
  const summaries = records.map((record) => {
    const fields = JSON.parse(record.fields_json) as Record<string, string>;
    const label = (field: string, fallback = 'unknown') => labels.get(`${field}:${fields[field]}`) ?? fields[field] ?? fallback;
    const confidence = fields.confidence === 'probable' || fields.confidence === 'possible' ? `${fields.confidence} ` : '';
    const cause = label('likely_cause');
    return {
      key: `${label('body_region')}\u0000${label('type')}\u0000${record.id}`,
      text: `${label('body_region')}: ${label('type')} · ${label('severity')} · ${label('freshness')} · ${cause === 'unknown' ? cause : `${confidence}${cause}`}`,
    };
  }).sort((a, b) => a.key.localeCompare(b.key));
  const latest = [...records].sort((a, b) => `${b.recorded_at}\u0000${b.id}`.localeCompare(`${a.recorded_at}\u0000${a.id}`))[0]!;
  return `[scars v${schemaVersion}] ${summaries.map(({ text }) => text).join(' | ')} (whaleshark.org, ${latest.recorded_at.slice(0, 10)}, ${latest.observer})`;
}

export function parseScarSummaryLine(text: string | null | undefined): ParsedScarSummary | null {
  const match = text?.match(SUMMARY_LINE);
  if (!match) return null;
  const records = match[2]!.split(' | ').map((part) => {
    const [bodyRegion = '', rest = ''] = part.split(/:\s+/, 2);
    const [type = '', severity = '', freshness = '', causeText = ''] = rest.split(' · ');
    const confidence: ParsedScarSummaryRecord['confidence'] = causeText.startsWith('probable ') ? 'probable' : causeText.startsWith('possible ') ? 'possible' : 'certain';
    const likelyCause = confidence === 'certain' ? causeText : causeText.slice(confidence.length + 1);
    return { bodyRegion, type, severity, freshness, likelyCause, confidence };
  });
  return { schemaVersion: match[1]!, records, recordedDate: match[3]!, observer: match[4]!.trim() };
}

export function mergeDistinguishingScar(existing: string | null | undefined, line: string): string {
  if (!existing?.trim()) return line;
  return SUMMARY_LINE.test(existing) ? existing.replace(SUMMARY_LINE, line) : `${existing}\n\n${line}`;
}

export function withoutScarSummaryLine(text: string | null | undefined): string {
  if (!text) return '';
  return text.replace(SUMMARY_LINE, '').replace(/\n{2,}$/g, '').trimEnd();
}
