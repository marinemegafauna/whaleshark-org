import siteConfig from '../../site.config';

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
}

function endpoint(path: string): string {
  return new URL(path, `${siteConfig.wildbookBaseUrl.replace(/\/$/, '')}/`).toString();
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

export async function login(username: string, password: string, fetcher: Fetcher = fetch) {
  const response = await checked(
    await fetcher(endpoint('/api/v3/login'), {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    }),
  );
  const match = response.headers.get('set-cookie')?.match(/(?:^|;\s*)(JSESSIONID=[^;]+)/i);
  if (!match?.[1]) throw new Error('Wildbook login did not return a JSESSIONID cookie');
  return { cookie: match[1], user: (await response.json()) as WildbookUser };
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
