import { isMockAppMode } from './mode';
import { hydrateCard, type HydratedCard } from './match-live';
import type { MatchCard } from './match-batch';
import type { MatchingStore } from './match-store';
import { isWildbookUnauthorized, type Fetcher } from './wildbook';
export function embeddedCard(card: MatchCard): HydratedCard {
  return { query: {enc:card.query_enc,date:card.date,loc:null,photos:card.embedded?.photos ?? [],distinguishingScar:null},
    candidates: Object.fromEntries(card.candidates.map(c=> {
      const sightings = (card.embedded?.candidates[c.key]?.sightings ?? []).slice().sort((a,b)=>Number(b.matched)-Number(a.matched)||(b.date??'').localeCompare(a.date??''));
      return [c.key,{sightings:sightings.slice(0,12),hidden:Math.max(0,sightings.length-12),n_sightings:sightings.length}];
    })), fetched_at:'' };
}
export async function loadMatchingCard(store: MatchingStore, batchId: string, card: MatchCard, cookie: string, refresh = false, fetcher: Fetcher = fetch) {
  const cache = await store.getCache(batchId,card.query_enc);
  const age = cache ? Date.now()-Date.parse(cache.fetched_at) : Infinity;
  if (!refresh && cache && age >= 0 && age < 7*86400000) return {data:cache,source:'cache' as const,unavailable:false};
  if (!isMockAppMode()) {
    try {
      const data = await hydrateCard(card,cookie,fetcher);
      // Cache only complete reads, so a transient per-candidate failure is retried on the next view.
      if (!Object.values(data.candidates).some(c=>'error' in c)) await store.putCache(batchId,card.query_enc,data);
      return {data,source:'live' as const,unavailable:false};
    } catch (error) {
      if (isWildbookUnauthorized(error)) throw error;
      return {data:embeddedCard(card),source:'embedded' as const,unavailable:true};
    }
  }
  return {data:embeddedCard(card),source:'embedded' as const,unavailable:false};
}
export function matchingPhotoUrl(url: string): string { return `/api/matching/photo?u=${encodeURIComponent(url)}`; }
export function safeMatchingPhotoUrl(raw: string): URL | null {
  try {
    // URL normalises dot segments, so validate decoded input before constructing it.
    let decoded = raw;
    for (let i=0;i<3;i++) { const next = decodeURIComponent(decoded); if (next === decoded) break; decoded = next; }
    if (decoded.includes('..') || /[\\\u0000-\u0020]/.test(decoded)) return null;
    const url = new URL(raw);
    if (url.protocol !== 'https:' || url.host !== 'www.sharkbook.ai' || url.username || url.password || !url.pathname.startsWith('/wildbook_data_dir/')) return null;
    return url;
  } catch { return null; }
}
