import { beforeEach, describe, expect, test } from 'vitest';
import { createDataStore, createMemoryStore } from './db';

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
});
