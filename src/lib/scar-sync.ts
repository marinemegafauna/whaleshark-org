import type { DataStore } from './db';
import { buildScarSummaryLine, mergeDistinguishingScar } from './scar-summary';
import { getEncounter, patchEncounter, type Fetcher } from './wildbook';

interface SyncScarRecordsInput {
  store: DataStore;
  cookie: string;
  encounterId: string;
  fetcher?: Fetcher;
  now?: Date;
}

export type ScarSyncResult =
  | { status: 'synced'; count: number }
  | { status: 'failed'; count: number; error: string };

export async function syncScarRecordsToWildbook(input: SyncScarRecordsInput): Promise<ScarSyncResult> {
  const records = await input.store.listScarRecords({ encounterId: input.encounterId });
  if (!records.length) return { status: 'synced', count: 0 };
  const now = (input.now ?? new Date()).toISOString();
  try {
    const current = await getEncounter(input.cookie, input.encounterId, input.fetcher);
    const latest = [...records].sort((a, b) => `${b.recorded_at}\u0000${b.id}`.localeCompare(`${a.recorded_at}\u0000${a.id}`))[0]!;
    const line = buildScarSummaryLine(records, latest.schema_version);
    const existing = typeof current.distinguishingScar === 'string' ? current.distinguishingScar : null;
    await patchEncounter(input.cookie, input.encounterId, [{
      op: 'replace', path: 'distinguishingScar', value: mergeDistinguishingScar(existing, line),
    }], input.fetcher);
    await Promise.all(records.map((record) => input.store.updateScarRecord(record.id, {
      synced_at: now, sync_status: 'synced', sync_error: null,
    })));
    return { status: 'synced', count: records.length };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await Promise.all(records.map((record) => input.store.updateScarRecord(record.id, {
      synced_at: null, sync_status: 'failed', sync_error: message,
    })));
    return { status: 'failed', count: records.length, error: message };
  }
}
