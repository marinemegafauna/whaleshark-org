import type { Batch, BatchItem } from './db';

const finalStatuses = new Set(['matched', 'likely_new', 'no_shark', 'error']);
const knownIndividuals = ['MZ-284', 'MZ-412', 'MZ-091'];

function finalItem(item: BatchItem, index: number): BatchItem {
  const slot = index % 20;
  const bbox = [0.14 + (index % 3) * 0.03, 0.2, 0.68, 0.58];
  if (slot < 12) {
    const score = Number((0.5 + (index % 6) * 0.05).toFixed(2));
    return {
      ...item,
      status: 'matched',
      match_json: JSON.stringify({ bbox, candidates: [{ individualId: knownIndividuals[index % knownIndividuals.length], score }] }),
    };
  }
  if (slot < 17) {
    const score = Number((0.15 + (index % 6) * 0.02).toFixed(2));
    return { ...item, status: 'likely_new', match_json: JSON.stringify({ bbox, score, clusterId: `new-${Math.floor((slot - 12) / 2)}` }) };
  }
  if (slot < 19) return { ...item, status: 'no_shark', match_json: JSON.stringify({ reason: 'No whale shark detected' }) };
  return { ...item, status: 'error', match_json: JSON.stringify({ error: 'Photo could not be processed' }) };
}

export function advanceMockBatch(batch: Batch, items: BatchItem[], nowMs = Date.now()): { batch: Batch; items: BatchItem[] } {
  const startedAt = Date.parse(batch.created_at);
  const elapsed = Math.max(0, nowMs - startedAt);
  const advanced = items.map((item, index) => {
    if (finalStatuses.has(item.status)) return item;
    const offset = (index * 137) % 3_000;
    if (elapsed >= 3_000 + offset) return finalItem(item, index);
    if (elapsed >= 1_800 + Math.floor(offset / 3)) return { ...item, status: 'matching' as const };
    if (elapsed >= 700 + Math.floor(offset / 6)) return { ...item, status: 'detecting' as const };
    return { ...item, status: 'queued' as const };
  });
  const complete = advanced.length > 0 && advanced.every((item) => finalStatuses.has(item.status));
  return {
    batch: { ...batch, status: complete ? 'review' : 'processing', updated_at: new Date(nowMs).toISOString() },
    items: advanced,
  };
}
