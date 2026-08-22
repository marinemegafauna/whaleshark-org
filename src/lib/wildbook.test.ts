import { describe, expect, test, vi } from 'vitest';
import { getBulkImportStatus, getCatalogueStats, login, resolveMedia, searchEncounters, startBulkImport, uploadResumableFile } from './wildbook';

describe('Wildbook client', () => {
  test('parses flat encounter hits and total from the response header', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ hits: [{ id: '2fca3548' }] }), {
        headers: { 'Content-Type': 'application/json', 'X-Wildbook-Total-Hits': '63' },
      }),
    );

    const result = await searchEncounters(
      'JSESSIONID=session',
      { locationIds: ['Tofo'], taxonomy: 'Rhincodon typus', from: 0, size: 20 },
      fetcher,
    );

    expect(result).toEqual({ hits: [{ id: '2fca3548' }], total: 63 });
    const init = fetcher.mock.calls[0]?.[1];
    expect(init?.method).toBe('POST');
    expect(JSON.parse(String(init?.body))).toMatchObject({ from: 0, size: 20 });
  });

  test('keeps media status branches intact and only identified items need images', async () => {
    const media = [
      { annotationId: 'a1', status: 'identified', imageUrl: '/image/1.jpg' },
      { annotationId: 'a2', status: 'unidentified', imageUrl: '/image/2.jpg' },
      { annotationId: 'a3', status: 'no_image' },
      { annotationId: 'a4', status: 'unavailable' },
      { annotationId: 'a5', status: 'error' },
    ];
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json(media));

    await expect(resolveMedia('JSESSIONID=session', media.map((item) => item.annotationId), fetcher)).resolves.toEqual(media);
  });

  test('rejects an identified media entry without an image URL', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json([{ annotationId: 'a1', status: 'identified' }]));

    await expect(resolveMedia('JSESSIONID=session', ['a1'], fetcher)).rejects.toThrow(/imageUrl/i);
  });

  test('extracts JSESSIONID from login Set-Cookie', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ username: 'clare', displayName: 'Clare Prebble' }), {
        headers: { 'Set-Cookie': 'JSESSIONID=abc123; Path=/; HttpOnly; SameSite=Lax' },
      }),
    );

    await expect(login('clare', 'secret', fetcher)).resolves.toEqual({
      cookie: 'JSESSIONID=abc123',
      user: { username: 'clare', displayName: 'Clare Prebble' },
    });
  });

  test('reads catalogue totals from Wildbook response headers', async () => {
    const totals = ['17532', '110256', '851', '25975'];
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async () =>
      new Response(JSON.stringify({ hits: [] }), {
        headers: { 'Content-Type': 'application/json', 'X-Wildbook-Total-Hits': totals.shift()! },
      }),
    );

    await expect(getCatalogueStats('JSESSIONID=session', 2026, fetcher)).resolves.toEqual({
      whale_shark_individuals: 17_532,
      whale_shark_encounters: 110_256,
      whale_shark_encounters_ytd: 851,
      all_individuals: 25_975,
    });

    expect(fetcher).toHaveBeenCalledTimes(4);
    const calls = fetcher.mock.calls.map(([url, init]) => ({
      path: new URL(String(url)).pathname,
      size: new URL(String(url)).searchParams.get('size'),
      body: JSON.parse(String(init?.body)),
    }));
    expect(calls).toEqual([
      { path: '/api/v3/search/individual', size: '0', body: { query: { term: { taxonomy: 'Rhincodon typus' } } } },
      { path: '/api/v3/search/encounter', size: '0', body: { query: { term: { taxonomy: 'Rhincodon typus' } } } },
      { path: '/api/v3/search/encounter', size: '0', body: { query: { bool: { filter: [{ term: { taxonomy: 'Rhincodon typus' } }, { range: { dateMillis: { gte: 1_767_225_600_000 } } }] } } } },
      { path: '/api/v3/search/individual', size: '0', body: { query: { match_all: {} } } },
    ]);
  });

  test('rejects a missing or malformed catalogue total header', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ hits: [] }));

    await expect(getCatalogueStats('JSESSIONID=session', 2026, fetcher)).rejects.toThrow(/X-Wildbook-Total-Hits/i);
  });

  test('uploads a complete file through the ResumableUpload multipart contract', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ uploadId: 'upload-4471' }));
    const file = new File(['jpeg-data'], 'IMG_4471.JPG', { type: 'image/jpeg' });

    await expect(uploadResumableFile('JSESSIONID=session', file, 'batch-1-item-1', fetcher)).resolves.toEqual({
      identifier: 'batch-1-item-1', filename: 'IMG_4471.JPG', uploadId: 'upload-4471',
    });
    const [url, init] = fetcher.mock.calls[0]!;
    expect(new URL(String(url)).pathname).toBe('/ResumableUpload');
    expect(init?.method).toBe('POST');
    expect(new Headers(init?.headers).get('Cookie')).toBe('JSESSIONID=session');
    const body = init?.body as FormData;
    expect(Object.fromEntries([...body.entries()].filter(([, value]) => typeof value === 'string'))).toEqual({
      resumableChunkNumber: '1', resumableChunkSize: '9', resumableCurrentChunkSize: '9', resumableTotalSize: '9',
      resumableType: 'image/jpeg', resumableIdentifier: 'batch-1-item-1', resumableFilename: 'IMG_4471.JPG',
      resumableRelativePath: 'IMG_4471.JPG', resumableTotalChunks: '1',
    });
    expect((body.get('file') as File).name).toBe('IMG_4471.JPG');
  });

  test('starts a bulk import with uploaded file references and batch metadata', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ taskId: 'task-42' }));
    const payload = {
      uploads: [{ identifier: 'batch-1-item-1', filename: 'IMG_4471.JPG', uploadId: 'upload-4471' }],
      locationId: 'Tofo', encounterDate: '2026-08-14', photographerName: 'A Diver', photographerEmail: 'diver@example.org',
      rows: [{ 'Encounter.genus': 'Rhincodon', 'Encounter.mediaAsset': 'IMG_4471.JPG' }],
    };

    await expect(startBulkImport('JSESSIONID=session', payload, fetcher)).resolves.toEqual({ taskId: 'task-42' });
    const [url, init] = fetcher.mock.calls[0]!;
    expect(new URL(String(url)).pathname).toBe('/api/v3/bulk-import');
    expect(init?.method).toBe('POST');
    expect(JSON.parse(String(init?.body))).toEqual(payload);
  });

  test('normalizes bulk-import task polling fields', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ id: 'task-42', state: 'COMPLETE', processed: 3, total: 3 }));

    await expect(getBulkImportStatus('JSESSIONID=session', 'task-42', fetcher)).resolves.toEqual({
      taskId: 'task-42', status: 'complete', processed: 3, total: 3,
    });
    expect(new URL(String(fetcher.mock.calls[0]![0])).pathname).toBe('/api/v3/bulk-import/task-42');
  });
});
