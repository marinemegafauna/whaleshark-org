import { describe, expect, test } from 'vitest';
import type { BatchItem } from './db';
import { groupBatchItems } from './batch-groups';

function candidate(id: string, match: object): BatchItem {
  return {
    id, batch_id: 'batch-1', created_at: '2026-08-22T00:00:00.000Z', filename: `${id}.JPG`, mime_type: 'image/jpeg',
    size_bytes: 1_000, image_key: `/mock/${id}.svg`, status: 'matched', match_json: JSON.stringify(match), observations_json: null, wildbook_task_id: null,
  };
}

describe('batch review grouping', () => {
  test('groups known matches by best individual and assigns stable letters to new clusters', () => {
    const items = [
      candidate('a', { candidates: [{ individualId: 'MZ-284', score: 0.68 }] }),
      candidate('b', { candidates: [{ individualId: 'MZ-284', score: 0.64 }] }),
      { ...candidate('c', { clusterId: 'new-7', score: 0.22 }), status: 'likely_new' as const },
      { ...candidate('d', { clusterId: 'new-7', score: 0.19 }), status: 'likely_new' as const },
      { ...candidate('e', { clusterId: 'new-9', score: 0.18 }), status: 'likely_new' as const },
      { ...candidate('f', { reason: 'No shark' }), status: 'no_shark' as const },
    ];

    expect(groupBatchItems(items).map((group) => ({ key: group.key, label: group.label, ids: group.items.map((item) => item.id) }))).toEqual([
      { key: 'known:MZ-284', label: 'MZ-284', ids: ['a', 'b'] },
      { key: 'new:new-7', label: 'Likely new animal A', ids: ['c', 'd'] },
      { key: 'new:new-9', label: 'Likely new animal B', ids: ['e'] },
    ]);
  });
});
