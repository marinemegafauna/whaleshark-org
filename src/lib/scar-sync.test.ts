import { beforeEach, describe, expect, test, vi } from 'vitest';
import { createMemoryStore } from './db';
import { syncScarRecordsToWildbook } from './scar-sync';

describe('scar write-back sync', () => {
  beforeEach(() => createMemoryStore().reset());

  test('merges the encounter summary and marks every represented record synced', async () => {
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json({ id: '2fca3548', distinguishingScar: 'Human observer note.' }))
      .mockResolvedValueOnce(Response.json({ id: '2fca3548' }));

    const result = await syncScarRecordsToWildbook({
      store: createMemoryStore(),
      cookie: 'JSESSIONID=researcher',
      encounterId: '2fca3548',
      fetcher,
      now: new Date('2026-08-22T10:30:00.000Z'),
    });

    expect(result).toEqual({ status: 'synced', count: 2 });
    const patchBody = JSON.parse(String(fetcher.mock.calls[1]![1]?.body));
    expect(patchBody).toEqual([{
      op: 'replace',
      path: 'distinguishingScar',
      value: expect.stringMatching(/^Human observer note\.\n\n\[scars v1\.0\]/),
    }]);
    expect(await createMemoryStore().listScarRecords({ encounterId: '2fca3548' })).toEqual([
      expect.objectContaining({ sync_status: 'synced', synced_at: '2026-08-22T10:30:00.000Z', sync_error: null }),
      expect.objectContaining({ sync_status: 'synced', synced_at: '2026-08-22T10:30:00.000Z', sync_error: null }),
    ]);
  });

  test('keeps records and stores a retryable failure when Sharkbook rejects the patch', async () => {
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json({ id: '2fca3548', distinguishingScar: 'Human observer note.' }))
      .mockResolvedValueOnce(new Response('write forbidden', { status: 403 }));

    const result = await syncScarRecordsToWildbook({
      store: createMemoryStore(),
      cookie: 'JSESSIONID=researcher',
      encounterId: '2fca3548',
      fetcher,
      now: new Date('2026-08-22T10:31:00.000Z'),
    });

    expect(result).toEqual({ status: 'failed', count: 2, error: 'Wildbook request failed (403): write forbidden' });
    expect(await createMemoryStore().listScarRecords({ encounterId: '2fca3548' })).toEqual([
      expect.objectContaining({ sync_status: 'failed', synced_at: null, sync_error: 'Wildbook request failed (403): write forbidden' }),
      expect.objectContaining({ sync_status: 'failed', synced_at: null, sync_error: 'Wildbook request failed (403): write forbidden' }),
    ]);
  });
});
