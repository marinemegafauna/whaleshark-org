import { expect, test } from 'vitest';
import { buildMatchDecisions } from './match-decisions';
import { buildBatchFromCascadeReport } from './match-batch';
import { importBatchSql, requireLocal } from './match-sql.mjs';
import type { ScarRecord, EncounterReview } from './db';
const batch = buildBatchFromCascadeReport({thresholds:{likely_score:.45,likely_margin:.1,possible_score:.4,possible_margin:.05,duplicate_suspect:.99},results:[{query_enc:'test-query',class:'likely',cand_key:'A',cand_name:'A',cand_enc:'test-candidate',s1:.7}]},{id:'test',title:"Test's batch"});
test('SQL escapes text, replaces cards only and refuses remote', () => {
  const sql = importBatchSql(batch);
  expect(sql).toContain("Test''s batch");
  expect(sql).toContain('DELETE FROM match_cards');
  expect(sql).not.toContain('match_verdict');
  expect(()=>requireLocal(['--remote'])).toThrow('local-only');
  expect(()=>requireLocal(['--remote=true'])).toThrow('local-only');
  expect(()=>requireLocal(['--local'])).not.toThrow();
});
test('decisions preserve legacy verdict shape and structured scars/zero reviews', () => {
  const output = buildMatchDecisions(batch,[{batch_id:'test',query_enc:'test-query',verdict:'same',candidate_key:'A',candidate_label:'A',notes:'note',scar_notes:'quick scar',reviewer:'local',updated_at:'now'}],[{encounter_id:'test-query',fields_json:'{"severity":"minor"}',x:.2,y:.3,schema_version:'2.0',recorded_at:'then'} as ScarRecord],[{encounter_id:'test-query',status:'examined_clean',regions_examined:'["head"]'} as EncounterReview],'export-time');
  expect(output.verdicts['test-query']).toMatchObject({candidate:'A',candidate_enc:'test-candidate',scars:'quick scar',at:'now'});
  expect(output.scars['test-query']).toMatchObject({review_status:'examined_clean',regions_examined:['head'],records:[{fields:{severity:'minor'},created_at:'then'}]});
  expect(output.exported_at).toBe('export-time');
});
