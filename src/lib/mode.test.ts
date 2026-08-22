import { afterEach, describe, expect, test } from 'vitest';
import { env } from 'cloudflare:workers';
import { isMockAppMode, scarWritebackMode } from './mode';

const workerEnv = env as Record<string, unknown>;

afterEach(() => {
  delete workerEnv.MOCK;
  delete workerEnv.MOCK_APP;
  delete workerEnv.SCAR_WRITEBACK;
});

describe('scar write-back mode', () => {
  test('is off unless append is explicitly configured', () => {
    expect(scarWritebackMode()).toBe('off');
    workerEnv.SCAR_WRITEBACK = 'append';
    expect(scarWritebackMode()).toBe('append');
    workerEnv.SCAR_WRITEBACK = 'anything-else';
    expect(scarWritebackMode()).toBe('off');
  });
});

describe('signed-in app mode', () => {
  test('can be live while the public site remains mocked', () => {
    workerEnv.MOCK = '1';
    workerEnv.MOCK_APP = '0';

    expect(isMockAppMode()).toBe(false);
  });

  test('falls back to the public mock switch when unset', () => {
    workerEnv.MOCK = '1';

    expect(isMockAppMode()).toBe(true);
  });
});
