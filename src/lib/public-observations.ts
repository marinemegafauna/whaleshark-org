import type { PublicReportField, Species } from './species';
import siteConfig from '../../site.config';
import { localIsoDate } from './photo-date';

export interface PublicInjuryObservations {
  severity?: string;
  regions: string[];
  types: string[];
  description?: string;
}

export interface PublicObservations {
  observed_date?: string;
  observed_time?: string;
  site_id?: string;
  verbatim_locality?: string;
  decimal_latitude?: number;
  decimal_longitude?: number;
  depth?: number;
  sex?: string;
  life_stage?: string;
  length?: { value: number; unit: string; estimated: boolean };
  behavior: string[];
  living_status?: string;
  individual_count?: number;
  injuries: PublicInjuryObservations;
  temperature?: { value: number; unit: string };
  submitter_name?: string;
  submitter_email?: string;
  photographer_name?: string;
  photographer_email?: string;
  inform_other: string[];
  comments?: string;
  consented_at?: string;
}

interface ParseOptions {
  prefix?: string;
  groups?: string[];
  fieldIds?: string[];
  excludeFieldIds?: string[];
}

function asText(value: FormDataEntryValue | null): string | undefined {
  const result = typeof value === 'string' ? value.trim() : '';
  return result || undefined;
}

function asNumber(value: FormDataEntryValue | null): number | undefined {
  const text = asText(value);
  if (text === undefined) return undefined;
  const result = Number(text);
  return Number.isFinite(result) ? result : undefined;
}

function splitEmails(value: string | undefined): string[] {
  return value ? value.split(/[\s,;]+/).map((email) => email.trim()).filter(Boolean) : [];
}

export function parsePublicObservationForm(
  form: FormData,
  species: Species,
  now = new Date(),
  options: ParseOptions = {},
): PublicObservations {
  const prefix = options.prefix ?? '';
  const included = options.groups ? new Set(options.groups) : null;
  const includedFields = options.fieldIds ? new Set(options.fieldIds) : null;
  const excludedFields = new Set(options.excludeFieldIds ?? []);
  const fields = species.public_report.groups
    .filter((group) => !included || included.has(group.id))
    .flatMap((group) => group.fields)
    .filter((field) => (!includedFields || includedFields.has(field.id)) && !excludedFields.has(field.id));
  const fieldById = new Map(fields.map((field) => [field.id, field]));
  const key = (id: string) => `${prefix}${id}`;
  const text = (id: string) => {
    if (!fieldById.has(id)) return undefined;
    const supplied = asText(form.get(key(id)));
    if (supplied !== undefined) return supplied;
    const fallback = fieldById.get(id)?.default;
    if (fallback === 'today') return localIsoDate(now);
    return fallback === undefined ? undefined : String(fallback);
  };
  const number = (id: string) => {
    if (!fieldById.has(id)) return undefined;
    const supplied = asNumber(form.get(key(id)));
    if (supplied !== undefined) return supplied;
    const fallback = fieldById.get(id)?.default;
    return typeof fallback === 'number' ? fallback : undefined;
  };
  const many = (id: string) => fieldById.has(id)
    ? form.getAll(key(id)).flatMap((value) => typeof value === 'string' ? [value.trim()] : []).filter(Boolean)
    : [];
  const lengthValue = number('length');
  const temperatureValue = number('temperature');
  const consented = text('consent') === 'agreed';

  return {
    observed_date: text('observed_date'),
    observed_time: text('observed_time'),
    site_id: text('site_id'),
    verbatim_locality: text('verbatim_locality'),
    decimal_latitude: number('decimal_latitude'),
    decimal_longitude: number('decimal_longitude'),
    depth: number('depth'),
    sex: text('sex'),
    life_stage: text('life_stage'),
    length: lengthValue === undefined ? undefined : {
      value: lengthValue,
      unit: asText(form.get(key('length_unit'))) ?? fieldById.get('length')?.default_unit ?? 'm',
      estimated: form.has(key('length_estimated')),
    },
    behavior: many('behavior'),
    living_status: text('living_status'),
    individual_count: number('individual_count'),
    injuries: {
      severity: text('injury_severity'),
      regions: many('injury_regions'),
      types: many('injury_types'),
      description: text('injury_description'),
    },
    temperature: temperatureValue === undefined ? undefined : {
      value: temperatureValue,
      unit: asText(form.get(key('temperature_unit'))) ?? fieldById.get('temperature')?.default_unit ?? 'c',
    },
    submitter_name: text('submitter_name'),
    submitter_email: text('submitter_email'),
    photographer_name: text('photographer_name'),
    photographer_email: text('photographer_email'),
    inform_other: splitEmails(text('inform_other')),
    comments: text('comments'),
    consented_at: consented ? now.toISOString() : undefined,
  };
}

export function mergePublicObservations(
  shared: PublicObservations,
  animal: Partial<PublicObservations> & { injuries?: Partial<PublicInjuryObservations> },
): PublicObservations {
  const definedAnimal = Object.fromEntries(
    Object.entries(animal).filter(([, value]) => value !== undefined),
  ) as Partial<PublicObservations> & { injuries?: Partial<PublicInjuryObservations> };
  return {
    ...shared,
    ...definedAnimal,
    behavior: animal.behavior ?? shared.behavior,
    inform_other: shared.inform_other,
    injuries: { ...shared.injuries, ...animal.injuries },
  };
}

export function preserveConsentTimestamp(next: PublicObservations, previous?: PublicObservations): PublicObservations {
  return next.consented_at && previous?.consented_at ? { ...next, consented_at: previous.consented_at } : next;
}

export function parseStoredPublicObservations(value: string | null | undefined): PublicObservations | undefined {
  if (!value) return undefined;
  try {
    const parsed = JSON.parse(value) as Partial<PublicObservations>;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return undefined;
    if (!Array.isArray(parsed.behavior) || !Array.isArray(parsed.inform_other)) return undefined;
    if (!parsed.injuries || !Array.isArray(parsed.injuries.regions) || !Array.isArray(parsed.injuries.types)) return undefined;
    return parsed as PublicObservations;
  } catch {
    return undefined;
  }
}

function metres(length: PublicObservations['length']): number | undefined {
  if (!length) return undefined;
  return length.unit === 'ft' ? length.value * 0.3048 : length.value;
}

function titleCase(value: string): string {
  return value ? `${value[0]!.toUpperCase()}${value.slice(1)}` : value;
}

export function publicObservationHint(observations: PublicObservations): string {
  const parts: string[] = [];
  if (observations.sex && observations.sex !== 'unknown') parts.push(titleCase(observations.sex));
  const lengthM = metres(observations.length);
  if (lengthM !== undefined) parts.push(`${lengthM.toFixed(1)} m${observations.length?.estimated ? ' estimated' : ''}`);
  if (observations.injuries.severity && observations.injuries.severity !== 'none') {
    parts.push(`${observations.injuries.severity} injuries reported`);
  }
  return parts.join(' · ');
}

export function publicOptionLabel(species: Species, fieldId: string, optionId: string): string {
  const field = species.public_report.groups.flatMap((group) => group.fields).find((candidate) => candidate.id === fieldId);
  if (field?.options_source === 'body_region') {
    const source = species.fields.find((candidate) => candidate.id === 'body_region');
    return source?.options?.find((option) => option.id === optionId)?.label ?? optionId;
  }
  return field?.options?.find((option) => option.id === optionId)?.label ?? optionId;
}

export function publicObservationFieldValue(observations: PublicObservations, fieldId: string): unknown {
  if (fieldId === 'injury_severity') return observations.injuries.severity;
  if (fieldId === 'injury_regions') return observations.injuries.regions;
  if (fieldId === 'injury_types') return observations.injuries.types;
  if (fieldId === 'injury_description') return observations.injuries.description;
  if (fieldId === 'consent') return observations.consented_at ? 'agreed' : undefined;
  if (fieldId === 'length') return observations.length?.value;
  if (fieldId === 'temperature') return observations.temperature?.value;
  return observations[fieldId as keyof PublicObservations];
}

export function publicReportFieldOptions(
  species: Species,
  field: PublicReportField,
  sites: Array<{ id: string; label: string }>,
): Array<{ id: string; label: string }> {
  const sourced = field.options_source === 'sites'
    ? sites
    : field.options_source === 'body_region'
      ? (species.fields.find((candidate) => candidate.id === 'body_region')?.options ?? []).map(({ id, label }) => ({ id, label }))
      : [];
  return [...sourced, ...(field.options ?? [])];
}

export function validatePublicObservations(observations: PublicObservations, species: Species, groups?: string[], fieldIds?: string[]): string[] {
  const included = groups ? new Set(groups) : null;
  const includedFields = fieldIds ? new Set(fieldIds) : null;
  const missing: string[] = [];
  for (const group of species.public_report.groups) {
    if (included && !included.has(group.id)) continue;
    for (const field of group.fields) {
      if (includedFields && !includedFields.has(field.id)) continue;
      if (field.show_when) {
        const controlValue = publicObservationFieldValue(observations, field.show_when.field);
        const shown = field.show_when.equals !== undefined
          ? controlValue === field.show_when.equals
          : controlValue !== field.show_when.not_equals;
        if (!shown) continue;
      }
      const value = publicObservationFieldValue(observations, field.id);
      const empty = value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0);
      if (field.required && empty) missing.push(field.label);
      if (empty) continue;
      const values = Array.isArray(value) ? value.map(String) : [String(value)];
      if (field.type === 'select' || field.type === 'chips') {
        const allowed = new Set([
          ...(field.options ?? []).map((option) => option.id),
          ...(field.options_source === 'sites' ? siteConfig.sites.map((site) => site.id) : []),
          ...(field.options_source === 'body_region' ? species.fields.find((candidate) => candidate.id === 'body_region')?.options?.map((option) => option.id) ?? [] : []),
        ]);
        if (values.some((candidate) => !allowed.has(candidate))) missing.push(field.label);
      }
      if (field.type === 'number') {
        const numeric = Number(value);
        if (!Number.isFinite(numeric) || (field.min !== undefined && numeric < field.min) || (field.max !== undefined && numeric > field.max)) missing.push(field.label);
        if (field.step !== undefined) {
          const steps = (numeric - (field.min ?? 0)) / field.step;
          if (Math.abs(steps - Math.round(steps)) > 1e-8) missing.push(field.label);
        }
        const unit = field.id === 'length' ? observations.length?.unit : field.id === 'temperature' ? observations.temperature?.unit : field.default_unit;
        if (field.units && unit && !field.units.some((option) => option.id === unit)) missing.push(field.label);
      }
      if (field.type === 'date') {
        const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
        const calendarDate = match ? new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))) : null;
        if (!match || calendarDate?.getUTCFullYear() !== Number(match[1]) || calendarDate.getUTCMonth() !== Number(match[2]) - 1 || calendarDate.getUTCDate() !== Number(match[3])) missing.push(field.label);
      }
      if (field.id === 'observed_time' && !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(String(value))) missing.push(field.label);
      if (field.type === 'email' && values.some((email) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) missing.push(field.label);
    }
  }
  return [...new Set(missing)];
}

export function metresFromObservation(observations: PublicObservations): number | undefined {
  return metres(observations.length);
}
