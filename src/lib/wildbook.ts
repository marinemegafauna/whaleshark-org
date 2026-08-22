import siteConfig from '../../site.config';
import type { Species } from './species';
import { metresFromObservation, publicOptionLabel, type PublicObservations } from './public-observations';

export type Fetcher = typeof fetch;
export type WildbookUser = { username: string; displayName?: string; [key: string]: unknown };
export type EncounterHit = { id: string; [key: string]: unknown };
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

function endpoint(path: string, baseUrl = siteConfig.wildbookBaseUrl): string {
  return new URL(path, `${baseUrl.replace(/\/$/, '')}/`).toString();
}

async function checked(response: Response): Promise<Response> {
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Wildbook request failed (${response.status}): ${detail || response.statusText}`);
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
  if (search.locationIds?.length) filter.push({ terms: { locationID: search.locationIds } });
  if (search.taxonomy) filter.push({ term: { taxonomy: search.taxonomy } });
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
      body: JSON.stringify({ from: search.from, size: search.size, query: { bool: { filter } } }),
    }),
  );
  const body = (await response.json()) as { hits: EncounterHit[] };
  return { hits: body.hits, total: Number(response.headers.get('X-Wildbook-Total-Hits') ?? body.hits.length) };
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
