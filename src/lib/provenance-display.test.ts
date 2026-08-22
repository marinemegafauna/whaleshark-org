import { describe, expect, test } from 'vitest';
import type { ProvenanceResult } from './provenance';
import { provenanceChip } from './provenance-display';

const labels = {
  score1: 'Check provenance',
  score2: 'Possible edit / AI',
  score3: 'Likely AI or synthetic',
  credentials: 'Content Credentials',
};

function result(score: 0 | 1 | 2 | 3, codes: ProvenanceResult['signals'][number]['code'][] = []): ProvenanceResult {
  return {
    score,
    signals: codes.map((code) => ({ code, weight: 0, label: code })),
    metadata: { hasExif: false, hasXmp: false, hasIptc: false, hasC2pa: codes.includes('c2pa_present') },
    version: 1,
  };
}

describe('reviewer provenance chip', () => {
  test.each([
    [1, 'grey', 'Check provenance'],
    [2, 'amber', 'Possible edit / AI'],
    [3, 'red', 'Likely AI or synthetic'],
  ] as const)('maps score %s to its calibrated reviewer treatment', (score, tone, label) => {
    expect(provenanceChip(result(score), labels)).toEqual({ tone, label });
  });

  test('shows neutral Content Credentials at score zero and hides an entirely clear result', () => {
    expect(provenanceChip(result(0, ['c2pa_present']), labels)).toEqual({ tone: 'neutral', label: 'Content Credentials' });
    expect(provenanceChip(result(0), labels)).toBeNull();
  });
});
