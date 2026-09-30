import { expect, test } from 'vitest';
import { buildBatchFromCascadeReport, embeddedFromReviewPage, parseMatchBatch } from './match-batch';
import { safeMatchingReturn } from './match-return';
const rule = { likely_score: .45, likely_margin: .1, possible_score: .4, possible_margin: .05, duplicate_suspect: .99 };
const row = (query_enc: string, key: string, s1: number, cls = 'likely') => ({ query_enc, cand_key: key, cand_name: key, cand_enc: `sighting-${key}`, class: cls, s1, margin: .12, tier: 'site', viewpoint: 'left' });
const options = { id: 'synthetic', title: 'Synthetic', site: 'kenya', created_at: '2026-01-01' };
test('groups best rows, runner ups, ranking/cap, classes, notes and dates; validates', () => {
  const batch = buildBatchFromCascadeReport({ thresholds: rule, results: [
    row('q1', 'A', .5), { ...row('q1', 'A', .7), duplicate_suspected: true, runner_up: { key: 'U:synthetic-uuid', name: null, score: .65, loc: 'Test' } },
    ...['B','C','D','E','F'].map((k,i) => row('q1', k, .8-i*.01, 'possible')),
    row('q2','Z', .9, 'possible'), row('q3','Z', .3, 'weak'), { query_enc: 'q4', class: 'no_likely_match' }, { query_enc: 'q4', class: 'insufficient_competitors' },
    { ...row('q5','A', .51), runner_up: { key: 'U:synthetic-uuid', name: null, score: .4, loc: 'Test' } },
  ], no_annotation_encounters: ['q6'] }, { ...options, notes: [{query_enc:'q1',note:'a'}, {query_enc:'q1',note:'a'}, {query_enc:'q1',note:'b'}], encounters:{q1:{date:'2025-01-02'}} });
  expect(batch.cards.map(c => c.query_enc)).toEqual(['q1','q5','q2','q3','q4','q6']);
  expect(batch.cards.map(c => c.cls)).toEqual(['likely','likely','possible','weak','none','no_fingerprint']);
  expect(batch.cards[0]).toMatchObject({index:1,date:'2025-01-02',note:'a / b',duplicate_suspected:true});
  expect(batch.cards[0].candidates).toHaveLength(5);
  expect(batch.cards[0].candidates[0]).toMatchObject({key:'A',s1:.7});
  expect(batch.cards[1].candidates[1]).toMatchObject({key:'U:synthetic-uuid',matched_enc:'synthetic-uuid',runner_up_only:true});
  expect(parseMatchBatch(JSON.stringify(batch))).toEqual(batch);
  expect(() => parseMatchBatch({...batch,cards:[batch.cards[0],batch.cards[0]]})).toThrow();
});
test('legacy JSON extraction groups candidate sightings and attaches by label', () => {
  const p = (enc: string) => ({full:'https://www.sharkbook.ai/wildbook_data_dir/test/full.jpg',src:'crop.jpg',enc:enc.slice(0,8),link:`https://www.sharkbook.ai/encounters/encounter.jsp?number=${enc}`,date:'2025-01-01'});
  const html = `<script>const CARDS=${JSON.stringify({1:{title:'Query',panes:[{photos:[p('q1')]},{label:'A · cosine 0.5',photos:[p('sighting-A'),p('sighting-A')]}]}})};</script>`;
  const embedded = embeddedFromReviewPage(html);
  expect(embedded.q1.candidates.A.sightings).toHaveLength(1);
  expect(embedded.q1.photos[0]).toMatchObject({box:null,view:'unknown'});
  const batch = buildBatchFromCascadeReport({thresholds:rule,results:[row('q1','A',.5)]},{...options,photosFromPage:html});
  expect(batch.cards[0].embedded?.candidates.A.sightings[0]).toMatchObject({matched:true});
  expect(embeddedFromReviewPage('bad')).toEqual({});
});
test('safe return accepts matching paths and rejects redirects or encoded separators', () => {
  expect(safeMatchingReturn('/app/matching/test?card=2')).toBe('/app/matching/test?card=2');
  for (const value of ['https://bad.test','/app/other','/app/matching//bad','/app/matching/\\bad','/app/matching/%2f%2fbad','/app/matching/http:bad']) expect(safeMatchingReturn(value)).toBeNull();
});
