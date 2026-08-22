import type { BatchItem } from './db';

export interface BatchGroup {
  key: string;
  label: string;
  kind: 'known' | 'likely_new';
  items: BatchItem[];
  bestScore: number;
}

function parsedMatch(item: BatchItem): Record<string, unknown> {
  if (!item.match_json) return {};
  try {
    const value = JSON.parse(item.match_json);
    return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

export function groupBatchItems(items: BatchItem[]): BatchGroup[] {
  const groups = new Map<string, BatchGroup>();
  for (const item of items) {
    const match = parsedMatch(item);
    let key: string | null = null;
    let label = '';
    let kind: BatchGroup['kind'] = 'known';
    let score = 0;
    if (item.status === 'matched') {
      const first = Array.isArray(match.candidates) ? match.candidates[0] as Record<string, unknown> | undefined : undefined;
      const individualId = typeof first?.individualId === 'string' ? first.individualId : null;
      if (!individualId) continue;
      key = `known:${individualId}`;
      label = individualId;
      score = Number(first?.score ?? 0);
    } else if (item.status === 'likely_new') {
      const clusterId = typeof match.clusterId === 'string' ? match.clusterId : item.id;
      key = `new:${clusterId}`;
      kind = 'likely_new';
      score = Number(match.score ?? 0);
    }
    if (!key) continue;
    const existing = groups.get(key);
    if (existing) {
      existing.items.push(item);
      existing.bestScore = Math.max(existing.bestScore, score);
    } else {
      groups.set(key, { key, label, kind, items: [item], bestScore: score });
    }
  }
  let newIndex = 0;
  return [...groups.values()].map((group) => {
    if (group.kind === 'known') return group;
    const suffix = String.fromCharCode(65 + newIndex++);
    return { ...group, label: `Likely new animal ${suffix}` };
  });
}
