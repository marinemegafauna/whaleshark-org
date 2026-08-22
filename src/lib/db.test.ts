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
      individual_uuid: 'a12bf56a-39eb-43d2-9080-fd38bb531522',
      site_id: 'tofo',
      observer: 'clare',
      recorded_at: '2026-08-22T00:00:00.000Z',
      photo_asset_id: 'mock-2',
      x: 0.25,
      y: 0.5,
      fields_json: '{"severity":"minor"}',
      notes: null,
      first_seen_encounter_id: 'b3453961',
      synced_at: null,
      sync_status: 'pending',
      sync_error: null,
    });
    await store.updateScarRecord(created.id, { notes: 'Healing abrasion' });

    const records = await store.listScarRecords({ encounterId: 'b3453961' });
    expect(records).toHaveLength(1);
    expect(records[0]?.notes).toBe('Healing abrasion');
  });

  test('persists the raw individual UUID separately from its display name in D1', async () => {
    const run = vi.fn().mockResolvedValue({ success: true });
    const bind = vi.fn().mockReturnValue({ run });
    const prepare = vi.fn().mockReturnValue({ bind });
    const store = createDataStore({ prepare } as unknown as D1Database, false);

    await store.createScarRecord({
      id: 'scar-live', species_id: 'whale-shark', schema_version: '1.0', encounter_id: 'f3ed2cf4-a83a-48e5-8833-d44dbcc2c846',
      individual_id: null, individual_uuid: 'e6eaad1d-3c0d-4b49-83e1-83c1ed33729c', site_id: 'tofo', observer: 'simon',
      recorded_at: '2026-08-22T00:00:00.000Z', photo_asset_id: 'asset-1', x: 0.25, y: 0.5, fields_json: '{}', notes: null,
      first_seen_encounter_id: 'f3ed2cf4-a83a-48e5-8833-d44dbcc2c846',
      synced_at: null, sync_status: 'pending', sync_error: null,
    });

    expect(prepare).toHaveBeenCalledWith(expect.stringContaining('sync_status'));
    expect(bind).toHaveBeenCalledWith(
      'scar-live', 'whale-shark', '1.0', 'f3ed2cf4-a83a-48e5-8833-d44dbcc2c846', null,
      'e6eaad1d-3c0d-4b49-83e1-83c1ed33729c', 'tofo', 'simon', '2026-08-22T00:00:00.000Z', 'asset-1', 0.25, 0.5, '{}', null,
      'f3ed2cf4-a83a-48e5-8833-d44dbcc2c846', null, 'pending', null,
    );
  });

  test('persists review status and submission confirmation', async () => {
    const store = createMemoryStore();
    await store.setReviewStatus('b3453961', 'whale-shark', 'recorded', 'clare');
    await store.updateSubmission('submission-demo', {
      status: 'confirmed',
      wildbook_encounter_id: '2fca3548',
      observations_json: '{"sex":"male"}',
    });

    expect(await store.getReviewStatus('b3453961')).toMatchObject({ status: 'recorded', reviewed_by: 'clare' });
    expect(await store.getSubmission('submission-demo')).toMatchObject({
      status: 'confirmed',
      wildbook_encounter_id: '2fca3548',
      observations_json: '{"sex":"male"}',
    });
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
      status: 'draft', wildbook_task_id: null, observations_json: null,
    });
    await store.createBatchItem({
      id: 'batch-item-new', batch_id: 'batch-new', created_at: '2026-08-22T00:00:00.000Z', filename: 'IMG_4471.JPG',
      mime_type: 'image/jpeg', size_bytes: 12_000_000, image_key: '/mock/whale-shark-1.svg', status: 'queued',
      match_json: null, wildbook_task_id: null, observations_json: null,
      provenance_json: null, sha256: null,
    });
    await store.updateBatchItem('batch-item-new', { status: 'matched', match_json: '{"candidates":[]}', observations_json: '{"sex":"female"}' });
    await store.updateBatch('batch-new', { status: 'review', observations_json: '{"observed_date":"2026-08-14"}' });

    expect(await store.getBatch('batch-new')).toMatchObject({ status: 'review', photographer_name: 'A Diver', observations_json: '{"observed_date":"2026-08-14"}' });
    expect(await store.listBatches({ status: 'review' })).toEqual(expect.arrayContaining([expect.objectContaining({ id: 'batch-new' })]));
    expect(await store.listBatches({ status: 'draft' })).toHaveLength(0);
    expect(await store.listBatchItems('batch-new')).toEqual([
      expect.objectContaining({ id: 'batch-item-new', status: 'matched', size_bytes: 12_000_000, observations_json: '{"sex":"female"}' }),
    ]);
  });

  test('lists submissions so public notes can be joined to researcher encounters', async () => {
    const submissions = await createMemoryStore().listSubmissions();

    expect(submissions).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'submission-demo', observations_json: expect.any(String) }),
    ]));
  });

  test('finds matching hashes across submissions and batch items with batch identity intact', async () => {
    const store = createMemoryStore();
    await store.createSubmission({
      id: 'hash-submission', created_at: '2026-08-22T00:00:00.000Z', photographer_name: 'A Diver', photographer_email: 'diver@example.org',
      site_id: 'tofo', observed_at: '2026-08-14', image_key: '/mock/one.svg', wildbook_encounter_id: null, status: 'matched',
      match_json: null, observations_json: null, provenance_json: null, sha256: 'same-hash',
    });
    await store.createBatchItem({
      id: 'hash-item', batch_id: 'batch-demo', created_at: '2026-08-22T00:00:01.000Z', filename: 'same.jpg', mime_type: 'image/jpeg',
      size_bytes: 100, image_key: '/mock/two.svg', status: 'queued', match_json: null, observations_json: null, wildbook_task_id: null,
      provenance_json: null, sha256: 'same-hash',
    });

    await expect(store.findBySha256('same-hash')).resolves.toEqual([
      { source: 'submission', id: 'hash-submission', batch_id: null },
      { source: 'batch_item', id: 'hash-item', batch_id: 'batch-demo' },
    ]);
    await expect(store.findBySha256('missing')).resolves.toEqual([]);
  });
});
