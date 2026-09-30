import type { MatchCard, Photo, Sighting } from './match-batch';
import { getEncounter, isWildbookUnauthorized, searchEncountersByIds, searchEncountersByIndividual, type EncounterHit, type Fetcher } from './wildbook';
const text = (value: unknown): string | null => typeof value === 'string' && value ? value : null;
const date = (e: EncounterHit) => text(e.date)?.slice(0, 10) ?? null;
const loc = (e: EncounterHit) => text(e.verbatimLocality) ?? text(e.locationId);
type Annotation = { encounterId?: string; isTrivial?: boolean; viewpoint?: string; boundingBox?: number[] };
type Asset = { mimeTypeMajor?: string; url?: string; width?: number; height?: number; userFilename?: string; annotations?: Annotation[] };

// ported from sharkbook-offline-matching/allphotos.py, MIT, Simon J Pierce / MMF
export function photosFromEncounter(enc: EncounterHit): Photo[] {
  const photos: Photo[] = [];
  for (const asset of (enc.mediaAssets ?? []) as Asset[]) {
    if (asset.mimeTypeMajor !== 'image' || !asset.url) continue;
    const annotations = (asset.annotations ?? []).filter(a => !a.isTrivial && (a.encounterId === undefined || a.encounterId === enc.id));
    const idArea = annotations.find(a => a.viewpoint === 'left' || a.viewpoint === 'right');
    const rawView = idArea?.viewpoint ?? (annotations.length ? annotations[0].viewpoint ?? 'other' : 'no box');
    const view = ['left','right','other','no box'].includes(rawView!) ? rawView as Photo['view'] : 'other';
    const b = idArea?.boundingBox;
    const box = b && b.length === 4 && b.every(Number.isFinite) && b[2] > 0 && b[3] > 0 ? b as Photo['box'] : null;
    photos.push({ url: asset.url, w: asset.width || null, h: asset.height || null, box, view, fname: asset.userFilename || null, enc: enc.id, date: date(enc) });
  }
  // Missing filenames keep their original positions; named frames are sorted within those slots.
  const named = photos.filter(p => p.fname).sort((a,b) => a.fname!.localeCompare(b.fname!));
  let next = 0;
  return photos.map(p => p.fname ? named[next++] : p);
}
export type HydratedCandidate = { sightings: Sighting[]; hidden: number; n_sightings: number } | { error: string };
export interface HydratedCard {
  query: { enc: string; date: string | null; loc: string | null; photos: Photo[]; distinguishingScar: string | null };
  candidates: Record<string, HydratedCandidate>;
  fetched_at: string;
}
export async function hydrateCard(card: MatchCard, cookie: string, fetcher: Fetcher = fetch): Promise<HydratedCard> {
  let query: EncounterHit;
  try { query = await getEncounter(cookie, card.query_enc, fetcher); }
  catch (error) {
    if (isWildbookUnauthorized(error)) throw error;
    const hits = await searchEncountersByIds(cookie, [card.query_enc], fetcher);
    const hit = hits.find(e => e.id === card.query_enc);
    if (!hit) throw new Error('Query sighting unavailable');
    query = hit;
  }
  const candidates = await Promise.all(card.candidates.map(async c => {
    try {
      let hits = c.name ? await searchEncountersByIndividual(cookie, c.name, fetcher) : [];
      // A name the search index does not know (renamed or merged animal) still shows the matched sighting.
      if (!hits.length && c.matched_enc) hits = [await getEncounter(cookie, c.matched_enc, fetcher)];
      const unique = [...new Map(hits.filter(e => e.id !== card.query_enc).map(e => [e.id, e])).values()];
      const sightings: Sighting[] = unique.map(e => ({ enc: e.id, date: date(e), loc: loc(e), matched: e.id === c.matched_enc, photos: photosFromEncounter(e) }))
        .sort((a,b) => Number(b.matched)-Number(a.matched) || (b.date ?? '').localeCompare(a.date ?? '') || a.enc.localeCompare(b.enc));
      return [c.key, { sightings: sightings.slice(0,12), hidden: Math.max(0,sightings.length-12), n_sightings: sightings.length }] as const;
    } catch (error) {
      if (isWildbookUnauthorized(error)) throw error;
      // Do not expose upstream response bodies (which can contain account or catalogue details).
      return [c.key, { error: 'Candidate sightings unavailable; try refreshing.' }] as const;
    }
  }));
  return { query: { enc: query.id, date: date(query), loc: loc(query), photos: photosFromEncounter(query), distinguishingScar: text(query.distinguishingScar) }, candidates: Object.fromEntries(candidates), fetched_at: new Date().toISOString() };
}
