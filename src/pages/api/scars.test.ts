import { beforeEach, describe, expect, test } from 'vitest';
import { createMemoryStore } from '../../lib/db';
import { POST } from './scars';

const redirect = (location: string, status = 302) => new Response(null, { status, headers: { Location: location } });

describe('scar save route', () => {
  beforeEach(() => createMemoryStore().reset());

  test('keeps the record locally with write-back disabled in mock app mode', async () => {
    const body = new FormData();
    body.set('encounter_id', 'b3453961');
    body.set('individual_id', 'MZ-412');
    body.set('individual_uuid', 'mock-individual-b3453961');
    body.set('species_id', 'whale-shark');
    body.set('schema_version', '1.0');
    body.set('site_id', 'tofo');
    body.set('field_body_region', 'dorsal_fin_1');
    body.set('field_type', 'laceration');
    body.set('field_severity', 'major');
    body.set('field_freshness', 'fresh');
    body.set('field_likely_cause', 'propeller');
    body.set('field_confidence', 'probable');
    body.set('field_notes', 'Copied Sharkbook text.');

    const response = await POST({
      request: new Request('http://local/api/scars', { method: 'POST', body }),
      locals: {},
      redirect,
    } as never);

    expect(response.status).toBe(303);
    expect(response.headers.get('Location')).toContain('saved=1');
    expect(await createMemoryStore().listScarRecords({ encounterId: 'b3453961' })).toEqual([
      expect.objectContaining({ sync_status: 'disabled', synced_at: null, sync_error: null }),
    ]);
  });
});
