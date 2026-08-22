import type { DataStore } from './db';
import { appendPipelineSignals, assessProvenance, sha256Hex, type PipelineSignal } from './provenance';

export async function inspectUpload(file: File, store: DataStore, batchId?: string): Promise<{ provenance_json: string; sha256: string }> {
  const bytes = await file.arrayBuffer();
  const sha256 = await sha256Hex(bytes);
  const existing = await store.findBySha256(sha256);
  const additions: PipelineSignal[] = [];
  if (batchId && existing.some((match) => match.source === 'batch_item' && match.batch_id === batchId)) {
    additions.push({ code: 'duplicate_in_batch', weight: 1 });
  }
  const knownElsewhere = existing.some((match) => !batchId || match.source === 'submission' || match.batch_id !== batchId);
  if (knownElsewhere) additions.push({ code: 'known_catalogue_image', weight: 2 });
  const assessed = await assessProvenance(bytes, {
    filename: file.name,
    mimeType: file.type || 'application/octet-stream',
    sizeBytes: file.size,
  });
  return { provenance_json: JSON.stringify(appendPipelineSignals(assessed, additions)), sha256 };
}
