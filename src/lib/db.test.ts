import { beforeEach, describe, expect, test, vi } from 'vitest';
import { createCatalogueDataStore, createDataStore, createMemoryStore } from './db';

describe('mock data store', () => {
  beforeEach(() => createMemoryStore().reset());

  test('creates and updates scar records for an encounter', async () => {
    const store = createMemoryStore();
    const created = await store.createScarRecord({
      id: 'scar-new',
      species_id: 'whale-shark',
      schema_version: '1.0',
      encounter_id: 'b3453961',
      individual_id: 'MZ-412',
      site_id: 'tofo',
      observer: 'clare',
      recorded_at: '2026-08-22T00:00:00.000Z',
      photo_asset_id: 'mock-2',
      x: 0.25,
      y: 0.5,
      fields_json: '{"severity":"minor"}',
      notes: null,
      first_seen_encounter_id: 'b3453961',
    });
    await store.updateScarRecord(created.id, { notes: 'Healing abrasion' });

    const records = await store.listScarRecords({ encounterId: 'b3453961' });
    expect(records).toHaveLength(1);
    expect(records[0]?.notes).toBe('Healing abrasion');
  });

  test('persists review status and submission confirmation', async () => {
    const store = createMemoryStore();
    await store.setReviewStatus('b3453961', 'whale-shark', 'recorded', 'clare');
    await store.updateSubmission('submission-demo', { status: 'confirmed', wildbook_encounter_id: '2fca3548' });

    expect(await store.getReviewStatus('b3453961')).toMatchObject({ status: 'recorded', reviewed_by: 'clare' });
    expect(await store.getSubmission('submission-demo')).toMatchObject({ status: 'confirmed', wildbook_encounter_id: '2fca3548' });
  });

  test('does not silently replace a missing production D1 binding with memory', () => {
    expect(() => createDataStore(undefined, false)).toThrow(/DB D1 binding/i);
  });

  test('prefers persistent D1 storage for catalogue stats even when other features are mocked', async () => {
    const snapshot = {
      whale_shark_individuals: 17_532,
      whale_shark_encounters: 110_256,
      whale_shark_encounters_ytd: 851,
      all_individuals: 25_975,
      fetched_at: '2026-08-22T00:00:00.000Z',
    };
    const prepare = vi.fn().mockReturnValue({ first: vi.fn().mockResolvedValue(snapshot) });
    const store = createCatalogueDataStore({ prepare } as unknown as D1Database);

    await expect(store.getCatalogueStats()).resolves.toEqual(snapshot);
  });

  test('persists and reloads the latest catalogue statistics snapshot', async () => {
    const store = createMemoryStore();
    const snapshot = {
      whale_shark_individuals: 17_532,
      whale_shark_encounters: 110_256,
      whale_shark_encounters_ytd: 851,
      all_individuals: 25_975,
      fetched_at: '2026-08-22T00:00:00.000Z',
    };

    await store.saveCatalogueStats(snapshot);

    await expect(store.getCatalogueStats()).resolves.toEqual(snapshot);
  });

  test('creates, lists, updates, and reloads a batch with its items', async () => {
    const store = createMemoryStore();
    await store.createBatch({
      id: 'batch-new', created_at: '2026-08-22T00:00:00.000Z', updated_at: '2026-08-22T00:00:00.000Z',
      site_id: 'tofo', observed_at: '2026-08-14', photographer_name: 'A Diver', photographer_email: 'diver@example.org',
      status: 'draft', wildbook_task_id: null,
    });
    await store.createBatchItem({
      id: 'batch-item-new', batch_id: 'batch-new', created_at: '2026-08-22T00:00:00.000Z', filename: 'IMG_4471.JPG',
      mime_type: 'image/jpeg', size_bytes: 12_000_000, image_key: '/mock/whale-shark-1.svg', status: 'queued',
      match_json: null, wildbook_task_id: null,
    });
    await store.updateBatchItem('batch-item-new', { status: 'matched', match_json: '{"candidates":[]}' });
    await store.updateBatch('batch-new', { status: 'review' });

    expect(await store.getBatch('batch-new')).toMatchObject({ status: 'review', photographer_name: 'A Diver' });
    expect(await store.listBatches({ status: 'review' })).toEqual(expect.arrayContaining([expect.objectContaining({ id: 'batch-new' })]));
    expect(await store.listBatches({ status: 'draft' })).toHaveLength(0);
    expect(await store.listBatchItems('batch-new')).toEqual([
      expect.objectContaining({ id: 'batch-item-new', status: 'matched', size_bytes: 12_000_000 }),
    ]);
  });
});
