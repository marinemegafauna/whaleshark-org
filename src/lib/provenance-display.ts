import type { ProvenanceResult } from './provenance';

export interface ProvenanceChipLabels {
  score1: string;
  score2: string;
  score3: string;
  credentials: string;
}

export type ProvenanceChip = { tone: 'neutral' | 'grey' | 'amber' | 'red'; label: string };

export function provenanceChip(result: ProvenanceResult, labels: ProvenanceChipLabels): ProvenanceChip | null {
  if (result.score === 1) return { tone: 'grey', label: labels.score1 };
  if (result.score === 2) return { tone: 'amber', label: labels.score2 };
  if (result.score === 3) return { tone: 'red', label: labels.score3 };
  if (result.signals.some((signal) => signal.code === 'c2pa_present')) return { tone: 'neutral', label: labels.credentials };
  return null;
}
