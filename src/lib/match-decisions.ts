import type { MatchBatch } from './match-batch';
import type { MatchVerdict } from './match-store';
import type { ScarRecord, EncounterReview } from './db';
import { buildMatchDecisions as build } from './match-decisions-core.mjs';
export function buildMatchDecisions(batch: MatchBatch, verdicts: MatchVerdict[], scars: ScarRecord[], reviews: EncounterReview[], exportedAt?: string) {
  return build(batch, verdicts, scars, reviews, exportedAt);
}
