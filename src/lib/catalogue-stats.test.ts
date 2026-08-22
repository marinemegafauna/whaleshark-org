import { beforeEach, describe, expect, test, vi } from 'vitest';
import { createMemoryStore } from './db';
import { resolveCatalogueStats } from './catalogue-stats';

describe('catalogue statistics fallback', () => {
  beforeEach(() => createMemoryStore().reset());

  test('uses the last stored snapshot when a live pull fails', async () => {
    const store = createMemoryStore();
    await store.saveCatalogueStats({
      whale_shark_individuals: 17_400,
      whale_shark_encounters: 109_900,
      whale_shark_encounters_ytd: 800,
      all_individuals: 25_800,
      fetched_at: '2026-07-18T12:00:00.000Z',
    });
    const fetcher = vi.fn<typeof fetch>().mockRejectedValue(new Error('offline'));

    await expect(resolveCatalogueStats({
      store,
      username: 'service',
      password: 'secret',
      now: new Date('2026-08-22T12:00:00.000Z'),
      fetcher,
    })).resolves.toEqual({
      whale_shark_individuals: 17_400,
      whale_shark_encounters: 109_900,
      whale_shark_encounters_ytd: 800,
      all_individuals: 25_800,
      fetched_at: '2026-07-18T12:00:00.000Z',
      source: 'stored',
    });
  });

  test('uses the dated seed only when no snapshot has ever been stored', async () => {
    await expect(resolveCatalogueStats({
      store: createMemoryStore(),
      now: new Date('2026-08-22T12:00:00.000Z'),
    })).resolves.toEqual({
      whale_shark_individuals: 17_532,
      whale_shark_encounters: 110_256,
      whale_shark_encounters_ytd: 851,
      all_individuals: 25_975,
      fetched_at: '2026-08-22T00:00:00.000Z',
      source: 'seed',
    });
  });
});
