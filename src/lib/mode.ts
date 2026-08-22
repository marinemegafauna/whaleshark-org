import { env } from 'cloudflare:workers';

type WorkerEnv = { MOCK?: string; PUBLIC_WRITE?: string; [key: string]: unknown };
const workerEnv = env as unknown as WorkerEnv;

function setting(name: 'MOCK' | 'PUBLIC_WRITE'): string | undefined {
  const runtime = workerEnv[name];
  if (typeof runtime === 'string') return runtime;
  const bundled = import.meta.env[name];
  return typeof bundled === 'string' ? bundled : undefined;
}

export function isMockMode(): boolean {
  const configured = setting('MOCK');
  return configured === '1' || (configured === undefined && import.meta.env.DEV);
}

export function publicWriteMode(): 'dry-run' | 'live' {
  return setting('PUBLIC_WRITE') === 'live' ? 'live' : 'dry-run';
}
