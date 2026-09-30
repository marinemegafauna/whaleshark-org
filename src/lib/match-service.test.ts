import { afterEach, expect, test } from 'vitest';
import { env } from 'cloudflare:workers';
import { loadMatchingCard, safeMatchingPhotoUrl } from './match-service';
import { MemoryMatchingStore } from './match-store';
import { buildBatchFromCascadeReport } from './match-batch';
const worker=env as Record<string,unknown>;
afterEach(()=>{delete worker.MOCK_APP;});
test('photo allowlist rejects hosts, credentials, traversal (including encoded) and schemes',()=>{
  expect(safeMatchingPhotoUrl('https://www.sharkbook.ai/wildbook_data_dir/test/photo.jpg')).toBeInstanceOf(URL);
  for (const url of ['http://www.sharkbook.ai/wildbook_data_dir/test/x','https://evil.test/wildbook_data_dir/test/x','https://u:p@www.sharkbook.ai/wildbook_data_dir/test/x','https://www.sharkbook.ai/wildbook_data_dir/../x','https://www.sharkbook.ai/wildbook_data_dir/%2e%2e/x','https://www.sharkbook.ai/wildbook_data_dir/%252e%252e/x','https://www.sharkbook.ai/other/x','https://www.sharkbook.ai/wildbook_data_dir/test\\x']) expect(safeMatchingPhotoUrl(url)).toBeNull();
});
test('fresh cache beats live, refresh bypasses it, mock and unavailable fall back to embedded',async()=>{
  const card=buildBatchFromCascadeReport({thresholds:{likely_score:.45,likely_margin:.1,possible_score:.4,possible_margin:.05,duplicate_suspect:.99},no_annotation_encounters:['test']},{id:'test',title:'Test'}).cards[0];
  const store=new MemoryMatchingStore();
  const cache={query:{enc:'test',date:null,loc:null,photos:[],distinguishingScar:null},candidates:{},fetched_at:new Date().toISOString()};
  await store.putCache('test','test',cache);worker.MOCK_APP='0';
  expect((await loadMatchingCard(store,'test',card,'',false,async()=>{throw Error('should not fetch');})).source).toBe('cache');
  expect((await loadMatchingCard(store,'test',card,'',true,async()=>Response.json({id:'test'}))).source).toBe('live');
  expect((await loadMatchingCard(store,'test',card,'',true,async()=>{throw Error('offline');}))).toMatchObject({source:'embedded',unavailable:true});
  worker.MOCK_APP='1';expect((await loadMatchingCard(store,'test',card,'',true)).source).toBe('embedded');
});
test('a live read with a failed candidate is shown but not cached',async()=>{
  const card=buildBatchFromCascadeReport({thresholds:{likely_score:.45,likely_margin:.1,possible_score:.4,possible_margin:.05,duplicate_suspect:.99},results:[{query_enc:'test-q',cand_key:'A',cand_name:'A',cand_enc:'test-a',class:'likely',s1:.7}]},{id:'test',title:'Test'}).cards[0];
  const store=new MemoryMatchingStore();worker.MOCK_APP='0';
  const loaded=await loadMatchingCard(store,'test',card,'',false,async input=>String(input).includes('/encounters/') ? Response.json({id:'test-q'}) : new Response('bad',{status:500}));
  expect(loaded.source).toBe('live');
  expect(loaded.data.candidates.A).toHaveProperty('error');
  expect(await store.getCache('test','test-q')).toBeNull();
});
