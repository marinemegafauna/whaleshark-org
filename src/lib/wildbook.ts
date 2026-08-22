import siteConfig from '../../site.config';
import type { ProvenanceResult } from './provenance';
import type { Species } from './species';
import { metresFromObservation, publicOptionLabel, type PublicObservations } from './public-observations';

export type Fetcher = typeof fetch;
export type WildbookUser = { username: string; displayName?: string; [key: string]: unknown };
export type EncounterHit = { id: string; [key: string]: unknown };
export interface WorkbenchEncounter {
  id: string;
  individualId: string | null;
  individualUuid: string | null;
  sightings: number;
  date: string;
  photographer: string;
  sex: 'M' | 'F' | '—';
  size: string;
  photos: string;
  siteId: string;
  image: string;
  imageFilename: string;
  box: [number, number, number, number] | null;
  state: string;
  lifeStage: string | null;
  distinguishingScar: string | null;
  occurrenceRemarks: string | null;
  researcherComments: string | null;
  measurements: { lengthM: number } | null;
  behavior: string | null;
  locationId: string | null;
  verbatimLocality: string | null;
  occurrenceId: string | null;
  provenance?: ProvenanceResult;
}

export interface WorkbenchIndividual {
  displayName: string | null;
  numberEncounters: number;
  sex: 'M' | 'F' | '—';
}
export type MediaResolution =
  | { annotationId: string; status: 'identified' | 'unidentified'; imageUrl: string; [key: string]: unknown }
  | { annotationId: string; status: 'no_image' | 'unavailable' | 'error'; imageUrl?: never; [key: string]: unknown };

export interface EncounterSearch {
  locationIds?: string[];
  taxonomy?: string;
  from: number;
  size: number;
  dateRange?: { from?: string; to?: string };
}

export interface ResumableUploadReference {
  identifier: string;
  filename: string;
  uploadId: string;
}

export interface BulkImportPayload {
  uploads: ResumableUploadReference[];
  locationId: string;
  encounterDate: string;
  photographerName: string;
  photographerEmail: string;
  rows?: Record<string, string>[];
}

export interface CatalogueCounts {
  whale_shark_individuals: number;
  whale_shark_encounters: number;
  whale_shark_encounters_ytd: number;
  all_individuals: number;
}

export interface WildbookRowInput {
  species: Species;
  observations: PublicObservations;
  locationId: string;
  sightingId: string;
  mediaFilenames: string[];
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function firstNonEmpty(values: unknown): string | null {
  if (!Array.isArray(values)) return null;
  for (const value of values) {
    const text = nonEmptyString(value);
    if (text) return text;
  }
  return null;
}

function workbenchSex(value: unknown): 'M' | 'F' | '—' {
  const normalized = nonEmptyString(value)?.toLowerCase();
  if (normalized === 'male' || normalized === 'm') return 'M';
  if (normalized === 'female' || normalized === 'f') return 'F';
  return '—';
}

function workbenchDate(value: unknown): string | null {
  const text = nonEmptyString(value);
  if (!text) return null;
  const isoDate = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const parsed = isoDate
    ? new Date(Date.UTC(Number(isoDate[1]), Number(isoDate[2]) - 1, Number(isoDate[3])))
    : new Date(`${text} UTC`);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(parsed);
}

function workbenchLengthM(measurements: unknown): number | null {
  if (!Array.isArray(measurements)) return null;
  const length = measurements.find((entry) => entry && typeof entry === 'object' && nonEmptyString((entry as Record<string, unknown>).type)?.toLowerCase() === 'length') as Record<string, unknown> | undefined;
  if (!length) return null;
  const value = Number(length.value);
  if (!Number.isFinite(value)) return null;
  const units = nonEmptyString(length.units)?.toLowerCase();
  const metres = units === 'feet' || units === 'foot' || units === 'ft' ? value * 0.3048 : value;
  return metres;
}

function workbenchSize(measurements: unknown): string {
  const metres = workbenchLengthM(measurements);
  return metres === null ? '—' : `~${metres.toFixed(1).replace(/\.0$/, '')} m`;
}

function filenameFromUrl(value: string): string {
  try {
    return new URL(value).pathname.split('/').filter(Boolean).at(-1) ?? '';
  } catch {
    return value.split('/').filter(Boolean).at(-1) ?? '';
  }
}

export function mapEncounterHit(hit: EncounterHit, siteId: string): WorkbenchEncounter {
  const lengthM = workbenchLengthM(hit.measurements);
  const individualId = nonEmptyString(hit.individualDisplayName) ?? firstNonEmpty(hit.individualNames);
  const photographers = firstNonEmpty(hit.photographers);
  const submitters = Array.isArray(hit.submitters) ? hit.submitters : [];
  const firstSubmitter = submitters[0];
  const submitterName = nonEmptyString(firstSubmitter)
    ?? (firstSubmitter && typeof firstSubmitter === 'object' ? nonEmptyString((firstSubmitter as Record<string, unknown>).displayName) : null);
  const viewpoints = new Set(Array.isArray(hit.annotationViewpoints)
    ? hit.annotationViewpoints.map((value) => nonEmptyString(value)?.toLowerCase())
    : []);
  const sides = `${viewpoints.has('left') ? 'L' : ''}${viewpoints.has('left') && viewpoints.has('right') ? '+' : ''}${viewpoints.has('right') ? 'R' : ''}`;
  const mediaAssets = Array.isArray(hit.mediaAssets)
    ? hit.mediaAssets.filter((asset): asset is Record<string, unknown> => Boolean(asset) && typeof asset === 'object')
    : [];
  const featuredUuid = nonEmptyString(hit.featuredAssetUuid);
  const featured = mediaAssets.find((asset) => nonEmptyString(asset.uuid) === featuredUuid) ?? mediaAssets[0];
  const image = featured ? nonEmptyString(featured.url) ?? '' : '';
  const annotations = featured && Array.isArray(featured.annotations) ? featured.annotations : [];
  const firstAnnotation = annotations.find((annotation) => annotation && typeof annotation === 'object') as Record<string, unknown> | undefined;
  const rawBox = firstAnnotation && Array.isArray(firstAnnotation.boundingBox) ? firstAnnotation.boundingBox.map(Number) : null;
  const width = Number(featured?.width);
  const height = Number(featured?.height);
  const box = rawBox?.length === 4 && rawBox.every(Number.isFinite) && width > 0 && height > 0
    ? [rawBox[0]! / width, rawBox[1]! / height, rawBox[2]! / width, rawBox[3]! / height] as [number, number, number, number]
    : null;
  const mediaCount = Number(hit.numberMediaAssets);
  const photos = `${Number.isFinite(mediaCount) ? mediaCount : mediaAssets.length}${sides ? ` · ${sides}` : ''}`;

  return {
    id: hit.id,
    individualId,
    individualUuid: nonEmptyString(hit.individualId),
    sightings: Number.isFinite(Number(hit.individualNumberEncounters)) ? Number(hit.individualNumberEncounters) : 0,
    date: workbenchDate(hit.date) ?? workbenchDate(hit.verbatimEventDate) ?? '—',
    photographer: photographers ?? submitterName ?? nonEmptyString(hit.assignedUsername) ?? '—',
    sex: workbenchSex(hit.sex),
    size: workbenchSize(hit.measurements),
    photos,
    siteId,
    image,
    imageFilename: image ? filenameFromUrl(image) : '',
    box,
    state: nonEmptyString(hit.state) ?? '—',
    lifeStage: nonEmptyString(hit.lifeStage),
    distinguishingScar: nonEmptyString(hit.distinguishingScar),
    occurrenceRemarks: nonEmptyString(hit.occurrenceRemarks),
    researcherComments: nonEmptyString(hit.researcherComments),
    measurements: lengthM === null ? null : { lengthM },
    behavior: nonEmptyString(hit.behavior) ?? firstNonEmpty(hit.behavior),
    locationId: nonEmptyString(hit.locationId),
    verbatimLocality: nonEmptyString(hit.verbatimLocality),
    occurrenceId: nonEmptyString(hit.occurrenceId),
  };
}

export function mapIndividual(individual: Record<string, unknown>): WorkbenchIndividual {
  return {
    displayName: nonEmptyString(individual.displayName) ?? firstNonEmpty(individual.names),
    numberEncounters: Number.isFinite(Number(individual.numberEncounters)) ? Number(individual.numberEncounters) : 0,
    sex: workbenchSex(individual.sex),
  };
}

function compactNumber(value: number, decimals = 6): string {
  return value.toFixed(decimals).replace(/\.?0+$/, '');
}

export function buildWildbookRow(input: WildbookRowInput): Record<string, string> {
  const { species, observations } = input;
  const [genus = '', specificEpithet = ''] = species.wildbook_taxonomy.trim().split(/\s+/, 2);
  const [year = '', month = '', day = ''] = (observations.observed_date ?? '').split('-');
  const [hour = '', minutes = ''] = (observations.observed_time ?? '').split(':');
  const row: Record<string, string> = {
    // Source: species.wildbook_taxonomy.
    'Encounter.genus': genus,
    'Encounter.specificEpithet': specificEpithet,
    // Source: public report encounter date.
    'Encounter.year': year,
    'Encounter.month': month ? String(Number(month)) : '',
    'Encounter.day': day ? String(Number(day)) : '',
    // Source: one shared id per uploaded dive/batch.
    'Encounter.sightingID': input.sightingId,
    // Source: filenames returned by the upload session.
    'Encounter.mediaAsset': input.mediaFilenames.join(','),
  };
  if (input.locationId) row['Encounter.locationID'] = input.locationId; // Source: selected listed site resolved to its first literal Wildbook locationId; omitted for Other.
  if (hour) row['Encounter.hour'] = String(Number(hour)); // Source: optional public report time.
  if (minutes) row['Encounter.minutes'] = String(Number(minutes)); // Source: optional public report time.
  if (observations.verbatim_locality) row['Encounter.verbatimLocality'] = observations.verbatim_locality; // Source: unlisted/free-text place.
  if (observations.decimal_latitude !== undefined) row['Encounter.decimalLatitude'] = compactNumber(observations.decimal_latitude); // Source: optional GPS.
  if (observations.decimal_longitude !== undefined) row['Encounter.decimalLongitude'] = compactNumber(observations.decimal_longitude); // Source: optional GPS.
  if (observations.depth !== undefined) row['Encounter.depth'] = compactNumber(observations.depth); // Source: public sea-floor depth in metres.
  if (observations.sex) row['Encounter.sex'] = observations.sex.toLowerCase(); // Source: public sex choice.
  if (observations.life_stage && observations.life_stage !== 'unknown') row['Encounter.lifeStage'] = observations.life_stage; // Source: public life-stage choice.
  if (observations.living_status) row['Encounter.livingStatus'] = observations.living_status; // Source: public alive/dead choice.
  if (observations.behavior.length) {
    row['Encounter.behavior'] = observations.behavior.map((value) => publicOptionLabel(species, 'behavior', value)).join('; '); // Source: public behaviour chips.
  }
  if (observations.injuries.severity && observations.injuries.severity !== 'none') {
    const severity = `${observations.injuries.severity[0]!.toUpperCase()}${observations.injuries.severity.slice(1)}`;
    const types = observations.injuries.types.map((value) => publicOptionLabel(species, 'injury_types', value)).join('; ');
    const regions = observations.injuries.regions.map((value) => publicOptionLabel(species, 'injury_regions', value)).join('; ');
    const summary = `${severity}: ${types || 'Injury or scar'}${regions ? ` on ${regions}` : ''}`;
    row['Encounter.distinguishingScar'] = observations.injuries.description
      ? `${summary} — reporter: ${observations.injuries.description}`
      : summary; // Source: generated injury summary plus reporter free text.
  }
  const lengthM = metresFromObservation(observations);
  if (lengthM !== undefined) {
    row['Encounter.measurement.length'] = compactNumber(lengthM, 2); // Source: public length, normalized to metres.
    row['Encounter.measurement.length.samplingProtocol'] = observations.length?.estimated ? 'samplingProtocol0' : 'samplingProtocol1'; // Source: estimated toggle.
  }
  if (observations.temperature) {
    const celsius = observations.temperature.unit === 'f' ? (observations.temperature.value - 32) * 5 / 9 : observations.temperature.value;
    row['Encounter.measurement.temperature'] = compactNumber(celsius, 1); // Source: public water temperature, normalized to Celsius.
    row['Encounter.measurement.temperature.samplingProtocol'] = 'samplingProtocol1'; // Source: direct reported measurement.
  }
  const comments = [observations.comments, observations.photographer_name ? `Photographer: ${observations.photographer_name}.` : undefined].filter(Boolean);
  if (comments.length) row['Encounter.researcherComments'] = comments.join('\n'); // Source: public comments plus photographer-name fallback.
  if (observations.individual_count !== undefined) row['Sighting.individualCount'] = String(observations.individual_count); // Source: sharks seen on the dive.
  if (observations.submitter_name) row['Encounter.submitterName'] = observations.submitter_name; // Source: public submitter name.
  if (observations.submitter_email) row['Encounter.submitter.emailAddress'] = observations.submitter_email; // Source: public submitter email.
  if (observations.photographer_email) row['Encounter.photographer.emailAddress'] = observations.photographer_email; // Source: public photographer email.
  if (observations.inform_other.length) row['Encounter.informOther.emailAddress'] = observations.inform_other.join(','); // Source: public re-sight notification list.
  return row;
}

interface RequestOptions {
  baseUrl?: string;
  signal?: AbortSignal;
}

export class WildbookRequestError extends Error {
  constructor(public readonly status: number, detail: string) {
    super(`Wildbook request failed (${status}): ${detail}`);
    this.name = 'WildbookRequestError';
  }
}

export function isWildbookUnauthorized(error: unknown): error is WildbookRequestError {
  return error instanceof WildbookRequestError && error.status === 401;
}

function endpoint(path: string, baseUrl = siteConfig.wildbookBaseUrl): string {
  return new URL(path, `${baseUrl.replace(/\/$/, '')}/`).toString();
}

async function checked(response: Response): Promise<Response> {
  if (!response.ok) {
    const detail = await response.text();
    throw new WildbookRequestError(response.status, detail || response.statusText);
  }
  return response;
}

function sessionHeaders(cookie: string): HeadersInit {
  return { Accept: 'application/json', 'Content-Type': 'application/json', Cookie: cookie };
}

export async function login(username: string, password: string, fetcher: Fetcher = fetch, options: RequestOptions = {}) {
  const response = await checked(
    await fetcher(endpoint('/api/v3/login', options.baseUrl), {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
      signal: options.signal,
    }),
  );
  const match = response.headers.get('set-cookie')?.match(/(?:^|;\s*)(JSESSIONID=[^;]+)/i);
  if (!match?.[1]) throw new Error('Wildbook login did not return a JSESSIONID cookie');
  return { cookie: match[1], user: (await response.json()) as WildbookUser };
}

async function searchTotal(cookie: string, index: 'encounter' | 'individual', query: unknown, fetcher: Fetcher, options: RequestOptions): Promise<number> {
  const url = new URL(endpoint(`/api/v3/search/${index}`, options.baseUrl));
  url.searchParams.set('size', '0');
  const response = await checked(await fetcher(url, {
    method: 'POST',
    headers: sessionHeaders(cookie),
    body: JSON.stringify({ query }),
    signal: options.signal,
  }));
  const raw = response.headers.get('X-Wildbook-Total-Hits');
  const total = raw === null ? Number.NaN : Number(raw);
  if (!Number.isSafeInteger(total) || total < 0) {
    throw new Error(`Wildbook response requires a valid X-Wildbook-Total-Hits header; received ${raw ?? 'nothing'}`);
  }
  return total;
}

export async function getCatalogueStats(cookie: string, year: number, fetcher: Fetcher = fetch, options: RequestOptions = {}): Promise<CatalogueCounts> {
  const taxonomy = { term: { taxonomy: 'Rhincodon typus' } };
  const yearStart = Date.UTC(year, 0, 1);
  const [whaleSharkIndividuals, whaleSharkEncounters, whaleSharkEncountersYtd, allIndividuals] = await Promise.all([
    searchTotal(cookie, 'individual', taxonomy, fetcher, options),
    searchTotal(cookie, 'encounter', taxonomy, fetcher, options),
    searchTotal(cookie, 'encounter', { bool: { filter: [taxonomy, { range: { dateMillis: { gte: yearStart } } }] } }, fetcher, options),
    searchTotal(cookie, 'individual', { match_all: {} }, fetcher, options),
  ]);
  return {
    whale_shark_individuals: whaleSharkIndividuals,
    whale_shark_encounters: whaleSharkEncounters,
    whale_shark_encounters_ytd: whaleSharkEncountersYtd,
    all_individuals: allIndividuals,
  };
}

export async function searchEncounters(cookie: string, search: EncounterSearch, fetcher: Fetcher = fetch) {
  const filter: unknown[] = [];
  if (search.locationIds?.length) filter.push({ terms: { locationId: search.locationIds } });
  if (search.taxonomy) filter.push({ match: { taxonomy: search.taxonomy } });
  if (search.dateRange) {
    filter.push({
      range: {
        encounterDate: {
          ...(search.dateRange.from ? { gte: search.dateRange.from } : {}),
          ...(search.dateRange.to ? { lte: search.dateRange.to } : {}),
        },
      },
    });
  }
  const response = await checked(
    await fetcher(endpoint('/api/v3/search/encounter'), {
      method: 'POST',
      headers: sessionHeaders(cookie),
      body: JSON.stringify({ from: search.from, size: search.size, query: { bool: { filter } }, sort: [{ dateMillis: { order: 'desc' } }] }),
    }),
  );
  const body = (await response.json()) as { hits: EncounterHit[] };
  const rawTotal = response.headers.get('X-Wildbook-Total-Hits');
  const total = rawTotal === null ? Number.NaN : Number(rawTotal);
  if (!Number.isSafeInteger(total) || total < 0) {
    throw new Error(`Wildbook response requires a valid X-Wildbook-Total-Hits header; received ${rawTotal ?? 'nothing'}`);
  }
  return { hits: body.hits, total };
}

async function getJson<T>(path: string, cookie: string, fetcher: Fetcher): Promise<T> {
  const response = await checked(await fetcher(endpoint(path), { headers: sessionHeaders(cookie) }));
  return (await response.json()) as T;
}

export function getEncounter(cookie: string, id: string, fetcher: Fetcher = fetch) {
  return getJson<EncounterHit>(`/api/v3/encounters/${encodeURIComponent(id)}`, cookie, fetcher);
}

export function getIndividual(cookie: string, id: string, fetcher: Fetcher = fetch) {
  return getJson<Record<string, unknown>>(`/api/v3/individuals/${encodeURIComponent(id)}`, cookie, fetcher);
}

export async function resolveMedia(cookie: string, annotationIds: string[], fetcher: Fetcher = fetch) {
  if (annotationIds.length > 100) throw new Error('Media resolve accepts at most 100 annotation ids');
  const response = await checked(
    await fetcher(endpoint('/api/v3/media/resolve'), {
      method: 'POST',
      headers: sessionHeaders(cookie),
      body: JSON.stringify({ annotationIds }),
    }),
  );
  const payload = await response.json();
  if (!Array.isArray(payload)) throw new Error('Wildbook media response must be an array');
  return payload.map((entry: Record<string, unknown>) => {
    const status = entry.status;
    if (typeof entry.annotationId !== 'string') throw new Error('Media entry requires annotationId');
    if (status === 'identified' || status === 'unidentified') {
      if (typeof entry.imageUrl !== 'string' || !entry.imageUrl) throw new Error(`Media status ${status} requires imageUrl`);
      return { ...entry, annotationId: entry.annotationId, status, imageUrl: entry.imageUrl } as MediaResolution;
    }
    if (status === 'no_image' || status === 'unavailable' || status === 'error') {
      if ('imageUrl' in entry) throw new Error(`Media status ${status} cannot include imageUrl`);
      return { ...entry, annotationId: entry.annotationId, status } as MediaResolution;
    }
    throw new Error(`Unknown media status: ${String(status)}`);
  });
}

export async function createEncounter(cookie: string, payload: unknown, fetcher: Fetcher = fetch) {
  const response = await checked(
    await fetcher(endpoint('/api/v3/encounters'), {
      method: 'POST',
      headers: sessionHeaders(cookie),
      body: JSON.stringify(payload),
    }),
  );
  return (await response.json()) as EncounterHit;
}

export interface EncounterPatchOperation {
  op: 'add' | 'replace' | 'remove';
  path: string;
  value?: unknown;
}

export async function patchEncounter(cookie: string, id: string, ops: EncounterPatchOperation[], fetcher: Fetcher = fetch) {
  const response = await checked(
    await fetcher(endpoint(`/api/v3/encounters/${encodeURIComponent(id)}`), {
      method: 'PATCH',
      headers: sessionHeaders(cookie),
      body: JSON.stringify(ops),
    }),
  );
  return (await response.json()) as EncounterHit;
}

export async function uploadResumableFile(cookie: string, file: File, identifier: string, fetcher: Fetcher = fetch): Promise<ResumableUploadReference> {
  const body = new FormData();
  const fields = {
    resumableChunkNumber: '1',
    resumableChunkSize: String(file.size),
    resumableCurrentChunkSize: String(file.size),
    resumableTotalSize: String(file.size),
    resumableType: file.type || 'application/octet-stream',
    resumableIdentifier: identifier,
    resumableFilename: file.name,
    resumableRelativePath: file.name,
    resumableTotalChunks: '1',
  };
  Object.entries(fields).forEach(([name, value]) => body.set(name, value));
  body.set('file', file, file.name);
  const response = await checked(await fetcher(endpoint('/ResumableUpload'), {
    method: 'POST', headers: { Accept: 'application/json', Cookie: cookie }, body,
  }));
  const payload = (await response.json()) as { uploadId?: unknown; id?: unknown };
  const uploadId = typeof payload.uploadId === 'string' ? payload.uploadId : typeof payload.id === 'string' ? payload.id : identifier;
  return { identifier, filename: file.name, uploadId };
}

export async function startBulkImport(cookie: string, payload: BulkImportPayload, fetcher: Fetcher = fetch) {
  const response = await checked(await fetcher(endpoint('/api/v3/bulk-import'), {
    method: 'POST', headers: sessionHeaders(cookie), body: JSON.stringify(payload),
  }));
  const result = (await response.json()) as { taskId?: unknown; id?: unknown };
  const taskId = typeof result.taskId === 'string' ? result.taskId : typeof result.id === 'string' ? result.id : null;
  if (!taskId) throw new Error('Wildbook bulk import did not return a task id');
  return { taskId };
}

export async function getBulkImportStatus(cookie: string, taskId: string, fetcher: Fetcher = fetch) {
  const result = await getJson<Record<string, unknown>>(`/api/v3/bulk-import/${encodeURIComponent(taskId)}`, cookie, fetcher);
  const rawStatus = String(result.status ?? result.state ?? 'queued').toLowerCase();
  const status = rawStatus === 'complete' || rawStatus === 'completed' || rawStatus === 'done'
    ? 'complete'
    : rawStatus === 'failed' || rawStatus === 'error'
      ? 'failed'
      : rawStatus === 'running' || rawStatus === 'processing'
        ? 'running'
        : 'queued';
  return {
    taskId: String(result.taskId ?? result.id ?? taskId),
    status,
    processed: Number(result.processed ?? result.completed ?? 0),
    total: Number(result.total ?? 0),
  } as const;
}

// Matching is triggered through the bulk-import path; this reads the task results.
export function getMatchResults(cookie: string, taskId: string, fetcher: Fetcher = fetch) {
  return getJson<Record<string, unknown>>(`/api/v3/tasks/${encodeURIComponent(taskId)}/match-results`, cookie, fetcher);
}
