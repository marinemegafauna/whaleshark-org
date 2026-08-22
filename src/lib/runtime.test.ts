import { afterEach, describe, expect, test } from 'vitest';
import { env } from 'cloudflare:workers';
import { appDataStore } from './runtime';

const workerEnv = env as Record<string, unknown>;

afterEach(() => {
  delete workerEnv.DB;
  delete workerEnv.MOCK;
  delete workerEnv.MOCK_APP;
});

describe('app data store', () => {
  test('requires D1 when only the signed-in app is live', () => {
    workerEnv.MOCK = '1';
    workerEnv.MOCK_APP = '0';

    expect(() => appDataStore({} as App.Locals)).toThrow(/DB D1 binding/i);
  });

  test('uses memory when the signed-in app is mocked', () => {
    workerEnv.MOCK = '0';
    workerEnv.MOCK_APP = '1';

    expect(() => appDataStore({} as App.Locals)).not.toThrow();
  });
});
