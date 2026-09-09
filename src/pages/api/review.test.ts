import { beforeEach, describe, expect, test } from 'vitest';
import { createMemoryStore } from '../../lib/db';
import { POST } from './review';

const redirect = (location: string, status = 302) => new Response(null, { status, headers: { Location: location } });
const post = (entries: Array<[string, string]>) => {
  const body = new FormData();
  body.set('encounter_id', 'b3453961');
  body.set('site_id', 'tofo');
  body.set('individual_id', 'MZ-412');
  body.set('individual_uuid', 'mock-individual-b3453961');
  for (const [key, value] of entries) body.append(key, value);
  return POST({ request: new Request('http://local/api/review', { method: 'POST', body }), locals: {}, cookies: { delete() {} }, redirect } as never);
};

describe('encounter review route', () => {
  beforeEach(() => createMemoryStore().reset());

  test('stores the explicit zero with deduplicated regions, site and shark id', async () => {
    const response = await post([['status', 'examined_clean'], ['regions_examined', 'dorsal_fin_1'], ['regions_examined', 'caudal_fin'], ['regions_examined', 'dorsal_fin_1']]);
    expect(response.status).toBe(303);
    expect(await createMemoryStore().getReviewStatus('b3453961')).toMatchObject({ status: 'examined_clean', regions_examined: JSON.stringify(['dorsal_fin_1', 'caudal_fin']), site_id: 'tofo', individual_id: 'MZ-412', individual_uuid: 'mock-individual-b3453961' });
  });

  test('refuses an explicit zero with no regions, an unknown region, or an unknown status without writing', async () => {
    expect((await post([['status', 'examined_clean']])).headers.get('Location')).toContain('error=regions');
    expect((await post([['status', 'examined_clean'], ['regions_examined', 'wing']])).status).toBe(400);
    expect((await post([['status', 'no_new_scars']])).status).toBe(400);
    expect((await post([['status', 'garbage']])).status).toBe(400);
    expect(await createMemoryStore().getReviewStatus('b3453961')).toBeNull();
  });

  test('not examined needs no regions and clears any that were sent', async () => {
    await post([['status', 'not_examined'], ['regions_examined', 'dorsal_fin_1']]);
    expect(await createMemoryStore().getReviewStatus('b3453961')).toMatchObject({ status: 'not_examined', regions_examined: null });
  });
});
