import { expect, test } from 'vitest';
import fixture from '../test/fixtures-sharkbook-live-sample.json';
import { photosFromEncounter, hydrateCard } from './match-live';
import { buildBatchFromCascadeReport } from './match-batch';
import { WildbookRequestError } from './wildbook';
const card = buildBatchFromCascadeReport({thresholds:{likely_score:.45,likely_margin:.1,possible_score:.4,possible_margin:.05,duplicate_suspect:.99},results:[
  {query_enc:'query-test',cand_key:'A',cand_name:'A',cand_enc:'old',class:'likely',s1:.7},
  {query_enc:'query-test',cand_key:'B',cand_name:'B',class:'weak',s1:.4},
]},{id:'test',title:'Test'}).cards[0];
test('maps fixture boxes; filters shared/trivial media; camera order and no box', () => {
  const hit = fixture.search_hits[0];
  expect(photosFromEncounter(hit)[0]).toMatchObject({box:[372,376,1160,707],view:'right',w:1920,h:1080});
  expect(photosFromEncounter(fixture.encounter_get).length).toBeGreaterThan(0);
  const asset = hit.mediaAssets[0];
  const photos = photosFromEncounter({id:'test',mediaAssets:[
    {...asset,userFilename:'frame-2',annotations:[{encounterId:'other',viewpoint:'left',boundingBox:[1,2,3,4]}]},
    {...asset,userFilename:'frame-1',annotations:[{viewpoint:'right',boundingBox:[2,3,4,5]},{viewpoint:'left',isTrivial:true}]},
    {...asset,mimeTypeMajor:'video'},
  ]});
  expect(photos.map(p => p.fname)).toEqual(['frame-1','frame-2']);
  expect(photos[0].box).toEqual([2,3,4,5]);
  expect(photos[1]).toMatchObject({box:null,view:'no box'});
});
test('fallback search, matched-first cap, concurrent candidate failures isolated', async () => {
  const requests: unknown[] = [];
  const fetcher: typeof fetch = async (input, init) => {
    const url = String(input); requests.push(init?.body);
    if (url.includes('/encounters/')) return new Response('missing',{status:404});
    const body = JSON.parse(String(init?.body));
    if (body.query.ids) return Response.json({hits:[{...fixture.encounter_get,id:'query-test'}]});
    if (body.query.term.individualDisplayName === 'B') return new Response('bad',{status:500});
    return Response.json({hits:[{id:'query-test'}, {id:'old',date:'2000-01-01'}, ...Array.from({length:14},(_,i)=>({id:`test-${i}`,date:`2025-01-${String(i+1).padStart(2,'0')}`}))]});
  };
  const result = await hydrateCard(card,'test-cookie',fetcher);
  const a = result.candidates.A;
  expect('sightings' in a && a.sightings[0]).toMatchObject({enc:'old',matched:true});
  expect(a).toMatchObject({hidden:3,n_sightings:15});
  expect('sightings' in a && a.sightings[1].enc).toBe('test-13');
  expect(result.candidates.B).toHaveProperty('error');
  expect(requests).toContain(JSON.stringify({query:{term:{individualDisplayName:'A'}},sort:[{id:'asc'}]}));
});
test('401 propagates for query and candidates', async () => {
  await expect(hydrateCard(card,'test',async()=>new Response('',{status:401}))).rejects.toBeInstanceOf(WildbookRequestError);
  await expect(hydrateCard(card,'test',async input => String(input).includes('/encounters/') ? Response.json({id:'query-test'}) : new Response('',{status:401}))).rejects.toMatchObject({status:401});
});
test('a named candidate unknown to the search index falls back to its matched sighting', async () => {
  const fetcher: typeof fetch = async (input, init) => {
    const url = String(input);
    if (url.includes('/encounters/old')) return Response.json({id:'old',date:'2013-01-13'});
    if (url.includes('/encounters/')) return Response.json({id:'query-test'});
    const body = JSON.parse(String(init?.body));
    return Response.json({hits: body.query.term?.individualDisplayName === 'A' ? [] : [{id:'test-b'}]});
  };
  const result = await hydrateCard(card,'test-cookie',fetcher);
  expect(result.candidates.A).toMatchObject({n_sightings:1,sightings:[{enc:'old',matched:true}]});
});
