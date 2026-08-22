import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('../../lib/content', () => ({
  fillTemplate: (value: string, replacements: Record<string, string>) => value.replace('{fields}', replacements.fields ?? ''),
  getPageCopy: async () => ({ report: { missing: 'Add the required details: {fields}.' } }),
}));

import { createMemoryStore } from '../../lib/db';
import { mergePublicObservations, parsePublicObservationForm, parseStoredPublicObservations, validatePublicObservations } from '../../lib/public-observations';
import { getSpecies } from '../../lib/species';
import { POST as confirmSubmission } from './submissions/[id]/confirm';
import { POST as submitBatchReview } from './batches/[id]/submit';
import { POST as addBatchItems } from './batches/[id]/items';
import { POST as createSubmission } from './submit';

const redirect = (location: string, status = 302) => new Response(null, { status, headers: { Location: location } });

describe('public report route gates', () => {
  beforeEach(() => createMemoryStore().reset());

  test('does not confirm a match until a valid stored report includes consent', async () => {
    const store = createMemoryStore();
    await store.createSubmission({
      id: 'without-report',
      created_at: '2026-08-22T00:00:00.000Z',
      photographer_name: '',
      photographer_email: '',
      site_id: 'tofo',
      observed_at: '2026-08-22',
      image_key: '/mock/whale-shark-1.svg',
      wildbook_encounter_id: null,
      status: 'matched',
      match_json: '[]',
      observations_json: null,
      provenance_json: null,
      sha256: null,
    });
    const body = new FormData();
    body.set('decision', 'confirm');

    const response = await confirmSubmission({
      params: { id: 'without-report' },
      request: new Request('http://local/api/submissions/without-report/confirm', { method: 'POST', body }),
      locals: {},
      redirect,
    } as never);

    expect(response.status).toBe(303);
    expect(response.headers.get('Location')).toContain('observation_error=');
    expect((await store.getSubmission('without-report'))?.status).toBe('matched');
  });

  test('does not generate batch rows from missing shared details', async () => {
    const response = await submitBatchReview({
      params: { id: 'batch-demo' },
      request: new Request('http://local/api/batches/batch-demo/submit', { method: 'POST', body: new FormData() }),
      locals: {},
      redirect,
    } as never);

    expect(response.status).toBe(303);
    expect(response.headers.get('Location')).toContain('/bulk?batch=batch-demo&observation_error=1');
    expect((await createMemoryStore().getBatch('batch-demo'))?.status).toBe('review');
  });

  test('stores validated per-animal observations and authoritative dry-run rows', async () => {
    const store = createMemoryStore();
    await store.updateBatch('batch-demo', {
      observations_json: JSON.stringify({
        observed_date: '2026-08-14',
        site_id: 'tofo',
        individual_count: 3,
        behavior: [],
        injuries: { regions: [], types: [] },
        submitter_name: 'A Diver',
        submitter_email: 'diver@example.org',
        inform_other: [],
        consented_at: '2026-08-22T00:00:00.000Z',
      }),
    });
    const body = new FormData();
    for (const key of ['known:MZ-284', 'known:MZ-412', 'known:MZ-091']) {
      body.set(`decision:${key}`, 'confirm');
      body.set(`observation:${key}:sex`, 'unknown');
      body.set(`observation:${key}:life_stage`, 'unknown');
      body.set(`observation:${key}:living_status`, 'alive');
      body.set(`observation:${key}:injury_severity`, 'none');
    }
    const species = getSpecies('whale-shark');
    const animalFields = ['sex','life_stage','length','behavior','living_status','injury_severity','injury_regions','injury_types','injury_description'];
    const animal = parsePublicObservationForm(body, species, new Date(), { prefix: 'observation:known:MZ-284:', groups: ['about_shark', 'injuries'], fieldIds: animalFields });
    const shared = parseStoredPublicObservations((await store.getBatch('batch-demo'))!.observations_json)!;
    expect(validatePublicObservations(animal, species, ['about_shark', 'injuries'], animalFields)).toEqual([]);
    expect(validatePublicObservations(mergePublicObservations(shared, animal), species)).toEqual([]);

    const response = await submitBatchReview({
      params: { id: 'batch-demo' },
      request: new Request('http://local/api/batches/batch-demo/submit', { method: 'POST', body }),
      locals: {},
      redirect,
    } as never);

    expect(response.status).toBe(303);
    expect(response.headers.get('Location')).toContain('submitted=1');
    expect((await store.getBatch('batch-demo'))?.status).toBe('submitted');
    const item = (await store.listBatchItems('batch-demo'))[0]!;
    expect(JSON.parse(item.observations_json!)).toMatchObject({ individual_count: 3, living_status: 'alive' });
    expect(JSON.parse(item.match_json!).wildbookRow).toMatchObject({
      'Encounter.genus': 'Rhincodon',
      'Encounter.locationID': 'Tofo',
      'Sighting.individualCount': '3',
    });
  });

  test('stores metadata provenance and the original-byte hash for a single upload', async () => {
    const bytes = new Uint8Array(33);
    bytes.set([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82]);
    new DataView(bytes.buffer).setUint32(16, 1024);
    new DataView(bytes.buffer).setUint32(20, 1024);
    bytes.set([8, 2, 0, 0, 0], 24);
    const body = new FormData();
    body.set('image', new File([bytes], 'generated.png', { type: 'image/png' }));

    const response = await createSubmission({
      request: new Request('http://local/api/submit', { method: 'POST', body }),
      locals: {},
      redirect,
    } as never);

    expect(response.status).toBe(303);
    const stored = (await createMemoryStore().listSubmissions()).find((submission) => submission.id !== 'submission-demo')!;
    expect(stored.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.parse(stored.provenance_json!)).toMatchObject({
      score: 3,
      metadata: { width: 1024, height: 1024 },
    });
  });

  test('marks the second identical upload in one batch without calling it an earlier catalogue image', async () => {
    const bytes = new Uint8Array(33);
    bytes.set([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82]);
    new DataView(bytes.buffer).setUint32(16, 800);
    new DataView(bytes.buffer).setUint32(20, 600);
    bytes.set([8, 2, 0, 0, 0], 24);
    const body = new FormData();
    body.append('files', new File([bytes], 'first.png', { type: 'image/png' }));
    body.append('files', new File([bytes], 'second.png', { type: 'image/png' }));

    const response = await addBatchItems({
      params: { id: 'batch-demo' },
      request: new Request('http://local/api/batches/batch-demo/items', { method: 'POST', body }),
      locals: {},
    } as never);

    expect(response.status).toBe(201);
    const uploaded = (await createMemoryStore().listBatchItems('batch-demo')).filter((item) => item.filename.endsWith('.png'));
    expect(JSON.parse(uploaded[0]!.provenance_json!).signals.map((signal: { code: string }) => signal.code)).not.toContain('duplicate_in_batch');
    expect(JSON.parse(uploaded[1]!.provenance_json!).signals.map((signal: { code: string }) => signal.code)).toContain('duplicate_in_batch');
    expect(JSON.parse(uploaded[1]!.provenance_json!).signals.map((signal: { code: string }) => signal.code)).not.toContain('known_catalogue_image');
  });
});
