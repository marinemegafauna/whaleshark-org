import { env } from 'cloudflare:workers';

type WorkerEnv = { MOCK?: string; MOCK_APP?: string; PUBLIC_WRITE?: string; SCAR_WRITEBACK?: string; [key: string]: unknown };
const workerEnv = env as unknown as WorkerEnv;

function setting(name: 'MOCK' | 'MOCK_APP' | 'PUBLIC_WRITE' | 'SCAR_WRITEBACK'): string | undefined {
  const runtime = workerEnv[name];
  if (typeof runtime === 'string') return runtime;
  const bundled = import.meta.env[name];
  return typeof bundled === 'string' ? bundled : undefined;
}

export function isMockMode(): boolean {
  const configured = setting('MOCK');
  return configured === '1' || (configured === undefined && import.meta.env.DEV);
}

export function isMockAppMode(): boolean {
  const configured = setting('MOCK_APP');
  if (configured === '1') return true;
  if (configured === '0') return false;
  return isMockMode();
}

export function publicWriteMode(): 'dry-run' | 'live' {
  return setting('PUBLIC_WRITE') === 'live' ? 'live' : 'dry-run';
}

export function scarWritebackMode(): 'off' | 'append' {
  return setting('SCAR_WRITEBACK') === 'append' ? 'append' : 'off';
}
