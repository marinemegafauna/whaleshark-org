import type { z } from 'zod';
import { batchSchema, cardSchema, candidateSchema, photoSchema, sightingSchema } from './match-batch-core.mjs';
export { parseMatchBatch, buildBatchFromCascadeReport, embeddedFromReviewPage } from './match-batch-core.mjs';
export type MatchBatch = z.infer<typeof batchSchema>;
export type MatchCard = z.infer<typeof cardSchema>;
export type MatchCandidate = z.infer<typeof candidateSchema>;
export type Photo = z.infer<typeof photoSchema>;
export type Sighting = z.infer<typeof sightingSchema>;
