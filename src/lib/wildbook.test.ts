import { describe, expect, test, vi } from 'vitest';
import liveSample from '../test/fixtures-sharkbook-live-sample.json';
import { getBulkImportStatus, getCatalogueStats, isWildbookUnauthorized, login, mapEncounterHit, mapIndividual, patchEncounter, resolveMedia, searchEncounters, startBulkImport, uploadResumableFile } from './wildbook';

describe('Wildbook workbench mapping', () => {
  test('maps the captured unnamed Tofo hit without treating its individual UUID as a display name', () => {
    const encounter = mapEncounterHit(liveSample.search_hits[0]!, 'tofo');

    expect(encounter).toMatchObject({
      id: 'f3ed2cf4-a83a-48e5-8833-d44dbcc2c846',
      individualId: null,
      individualUuid: 'e6eaad1d-3c0d-4b49-83e1-83c1ed33729c',
      sightings: 1,
      date: '18 Aug 2026',
      photographer: 'All Out Africa',
      sex: '—',
      size: '—',
      photos: '1 · R',
      siteId: 'tofo',
      image: 'https://www.sharkbook.ai/wildbook_data_dir/f/3/f3ed2cf4-a83a-48e5-8833-d44dbcc2c846/3f225fbf-4132-4004-b653-5973bccaeb05-master.jpg',
      imageFilename: '3f225fbf-4132-4004-b653-5973bccaeb05-master.jpg',
      state: 'unapproved',
      locationId: 'Tofo',
      verbatimLocality: 'tofo',
      occurrenceId: '52e86d1d-2ff0-4c83-90af-61f29ca8931a',
    });
    expect(encounter.box).toEqual([
      0.19375,
      0.34814814814814815,
      0.6041666666666666,
      0.6546296296296297,
    ]);
  });

  test('maps a named hit and puts the featured asset first', () => {
    const encounter = mapEncounterHit({
      id: 'encounter-named',
      individualId: 'individual-uuid',
      individualDisplayName: 'MZ-284',
      individualNames: ['Alternate name'],
      individualNumberEncounters: 14,
      verbatimEventDate: '2 August 2026',
      photographers: ['C. Prebble'],
      sex: 'female',
      numberMediaAssets: 6,
      annotationViewpoints: ['right', 'left', 'right', 'dorsal'],
      featuredAssetUuid: 'featured',
      mediaAssets: [
        { uuid: 'other', url: 'https://example.org/other.jpg', width: 100, height: 100, annotations: [] },
        { uuid: 'featured', url: 'https://example.org/featured.jpg', width: 200, height: 100, annotations: [{ boundingBox: [20, 10, 100, 50] }] },
      ],
      state: 'approved',
    }, 'tofo');

    expect(encounter).toMatchObject({
      individualId: 'MZ-284',
      individualUuid: 'individual-uuid',
      sightings: 14,
      date: '2 Aug 2026',
      photographer: 'C. Prebble',
      sex: 'F',
      photos: '6 · L+R',
      image: 'https://example.org/featured.jpg',
      imageFilename: 'featured.jpg',
      box: [0.1, 0.1, 0.5, 0.5],
      state: 'approved',
    });
  });

  test('converts the first length measurement from feet to metres', () => {
    const encounter = mapEncounterHit({
      id: 'encounter-feet',
      measurements: [
        { type: 'temperature', value: 24, units: 'celsius' },
        { type: 'length', value: 14.8, units: 'feet' },
        { type: 'length', value: 9, units: 'metres' },
      ],
    }, 'oman');

    expect(encounter.size).toBe('~4.5 m');
    expect(encounter.measurements).toEqual({ lengthM: 4.51104 });
  });

  test('maps Sharkbook scar-source fields from a constructed search hit', () => {
    const encounter = mapEncounterHit({
      id: 'encounter-with-scar-text',
      distinguishingScar: 'Three fresh propeller cuts behind the first dorsal fin.',
      occurrenceRemarks: 'Wound photographed from the left side.',
      researcherComments: '<p>Likely vessel strike.</p>',
      behavior: 'feeding at surface',
      lifeStage: 'adult',
      measurements: [{ type: 'length', value: 7.2, units: 'metres' }],
    }, 'tofo');

    expect(encounter).toMatchObject({
      distinguishingScar: 'Three fresh propeller cuts behind the first dorsal fin.',
      occurrenceRemarks: 'Wound photographed from the left side.',
      researcherComments: '<p>Likely vessel strike.</p>',
      measurements: { lengthM: 7.2 },
      behavior: 'feeding at surface',
    });
  });

  test('falls back to a parseable verbatim date when the primary date is malformed', () => {
    const encounter = mapEncounterHit({ id: 'encounter-date-fallback', date: 'not a date', verbatimEventDate: '3 August 2026' }, 'seychelles');

    expect(encounter.date).toBe('3 Aug 2026');
  });

  test('maps captured and named individual records', () => {
    expect(mapIndividual(liveSample.individual_get)).toEqual({
      displayName: null,
      numberEncounters: 1,
      sex: '—',
    });
    expect(mapIndividual({ displayName: '', names: ['MZ-412'], numberEncounters: 3, sex: 'male' })).toEqual({
      displayName: 'MZ-412',
      numberEncounters: 3,
      sex: 'M',
    });
  });
});

describe('Wildbook client', () => {
  test('patches an encounter with the exact JSON Patch request shape', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ id: 'enc-1', distinguishingScar: 'updated' }));
    const ops = [{ op: 'replace' as const, path: 'distinguishingScar', value: 'updated' }];

    await expect(patchEncounter('JSESSIONID=session', 'enc-1', ops, fetcher)).resolves.toMatchObject({ id: 'enc-1' });
    const [url, init] = fetcher.mock.calls[0]!;
    expect(new URL(String(url)).pathname).toBe('/api/v3/encounters/enc-1');
    expect(init?.method).toBe('PATCH');
    expect(new Headers(init?.headers).get('Cookie')).toBe('JSESSIONID=session');
    expect(JSON.parse(String(init?.body))).toEqual(ops);
  });

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
    expect(JSON.parse(String(init?.body))).toEqual({
      from: 0,
      size: 20,
      query: { bool: { filter: [{ terms: { locationId: ['Tofo'] } }, { match: { taxonomy: 'Rhincodon typus' } }] } },
      sort: [{ dateMillis: { order: 'desc' } }],
    });
  });

  test('preserves an upstream 401 so the app can expire its local session', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response('expired', { status: 401 }));

    try {
      await searchEncounters('JSESSIONID=expired', { from: 0, size: 25 }, fetcher);
      expect.unreachable('search should reject');
    } catch (error) {
      expect(isWildbookUnauthorized(error)).toBe(true);
      expect(error).toMatchObject({ status: 401 });
    }
  });

  test('rejects encounter search results without a valid total header', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ hits: [{ id: 'encounter-1' }] }));

    await expect(searchEncounters('JSESSIONID=session', { from: 0, size: 25 }, fetcher)).rejects.toThrow(/X-Wildbook-Total-Hits/i);
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
