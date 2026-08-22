import { describe, expect, test } from 'vitest';
import type { Batch, BatchItem } from './db';
import { advanceMockBatch } from './batches';

const batch: Batch = {
  id: 'batch-test',
  created_at: '2026-08-22T00:00:00.000Z',
  updated_at: '2026-08-22T00:00:00.000Z',
  site_id: 'tofo',
  observed_at: '2026-08-14',
  photographer_name: 'A Diver',
  photographer_email: 'diver@example.org',
  observations_json: null,
  status: 'processing',
  wildbook_task_id: null,
};

const neutralProvenance = JSON.stringify({
  score: 0,
  signals: [],
  metadata: { hasExif: true, hasXmp: false, hasIptc: false, hasC2pa: false },
  version: 1,
});

function item(index: number): BatchItem {
  return {
    id: `item-${index}`,
    batch_id: batch.id,
    created_at: '2026-08-22T00:00:00.000Z',
    filename: `IMG_${4471 + index}.JPG`,
    mime_type: 'image/jpeg',
    size_bytes: 10_000_000,
    image_key: `/mock/whale-shark-${(index % 6) + 1}.svg`,
    status: 'queued',
    match_json: null,
    observations_json: null,
    wildbook_task_id: null,
    provenance_json: neutralProvenance,
    sha256: `hash-${index}`,
  };
}

describe('mock batch status machine', () => {
  test('advances queued items through detection and matching by elapsed time', () => {
    const start = Date.parse(batch.created_at);
    expect(advanceMockBatch(batch, [item(0)], start + 1_000).items[0]?.status).toBe('detecting');
    expect(advanceMockBatch(batch, [item(0)], start + 2_200).items[0]?.status).toBe('matching');
  });

  test('produces a deterministic spread of final outcomes with match data', () => {
    const result = advanceMockBatch(batch, Array.from({ length: 20 }, (_, index) => item(index)), Date.parse(batch.created_at) + 10_000);
    const counts = result.items.reduce<Record<string, number>>((totals, candidate) => {
      totals[candidate.status] = (totals[candidate.status] ?? 0) + 1;
      return totals;
    }, {});

    expect(counts).toEqual({ matched: 12, likely_new: 5, no_shark: 2, error: 1 });
    expect(JSON.parse(result.items[0]!.match_json!)).toMatchObject({
      bbox: [0.14, 0.2, 0.68, 0.58],
      candidates: [{ individualId: 'MZ-284', score: 0.5 }],
    });
    expect(result.batch.status).toBe('review');
  });

  test('never regresses an item that has already reached a final status', () => {
    const finished = { ...item(0), status: 'matched' as const, match_json: '{"kept":true}' };
    const result = advanceMockBatch(batch, [finished], Date.parse(batch.created_at) + 100);
    expect(result.items[0]).toEqual(finished);
  });

  test('adds reviewer signals from mock detection and implausible fixture matches', () => {
    const start = Date.parse(batch.created_at);
    const result = advanceMockBatch(batch, Array.from({ length: 19 }, (_, index) => item(index)), start + 10_000);

    expect(JSON.parse(result.items[11]!.provenance_json!).signals).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'implausible_match', weight: 1 }),
    ]));
    expect(JSON.parse(result.items[18]!.provenance_json!).signals).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'no_shark_detected', weight: 1 }),
    ]));
  });
});
