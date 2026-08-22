import type { CatalogueStats, DataStore } from './db';
import { getCatalogueStats, login, type Fetcher } from './wildbook';

interface ResolveCatalogueStatsOptions {
  store: DataStore;
  username?: string;
  password?: string;
  baseUrl?: string;
  now?: Date;
  fetcher?: Fetcher;
}

export type ResolvedCatalogueStats = CatalogueStats & { source: 'live' | 'stored' | 'seed' };

const CACHE_TTL_MS = 60 * 60 * 1_000;
const SEED_STATS: CatalogueStats = {
  whale_shark_individuals: 17_532,
  whale_shark_encounters: 110_256,
  whale_shark_encounters_ytd: 851,
  all_individuals: 25_975,
  fetched_at: '2026-08-22T00:00:00.000Z',
};
let liveCache: { stats: CatalogueStats; expiresAt: number } | null = null;

export async function resolveCatalogueStats(options: ResolveCatalogueStatsOptions): Promise<ResolvedCatalogueStats> {
  const now = options.now ?? new Date();
  if (liveCache && liveCache.expiresAt > now.getTime()) return { ...liveCache.stats, source: 'live' };

  if (options.username && options.password) {
    try {
      const signal = AbortSignal.timeout(3_000);
      const fetcher = options.fetcher ?? fetch;
      const requestOptions = { baseUrl: options.baseUrl ?? 'https://www.sharkbook.ai', signal };
      const session = await login(options.username, options.password, fetcher, requestOptions);
      const counts = await getCatalogueStats(session.cookie, now.getUTCFullYear(), fetcher, requestOptions);
      const stats: CatalogueStats = { ...counts, fetched_at: now.toISOString() };
      await options.store.saveCatalogueStats(stats);
      liveCache = { stats, expiresAt: now.getTime() + CACHE_TTL_MS };
      return { ...stats, source: 'live' };
    } catch {
      // The public page must remain available when Sharkbook is slow or unavailable.
    }
  }

  const stored = await options.store.getCatalogueStats();
  if (stored) return { ...stored, source: 'stored' };
  return { ...SEED_STATS, source: 'seed' };
}
