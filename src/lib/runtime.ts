import { env } from 'cloudflare:workers';
import type { DataStore } from './db';
import { createCatalogueDataStore, createDataStore } from './db';
import { isMockAppMode, isMockMode } from './mode';

// Astro 6+/@astrojs/cloudflare 14: bindings and secrets come from `cloudflare:workers`,
// not Astro.locals.runtime.env. `locals` is kept in the signatures so call sites
// can stay the same if a future adapter changes the access pattern again.
type WorkerEnv = { DB?: D1Database; [key: string]: unknown };
const workerEnv = env as unknown as WorkerEnv;

export function dataStore(_locals: App.Locals): DataStore {
  return createDataStore(workerEnv.DB, isMockMode());
}

export function appDataStore(_locals: App.Locals): DataStore {
  return createDataStore(workerEnv.DB, isMockAppMode());
}

export function catalogueDataStore(_locals: App.Locals): DataStore {
  return createCatalogueDataStore(workerEnv.DB);
}

export function runtimeValue(_locals: App.Locals, name: keyof ImportMetaEnv): string | undefined {
  const runtime = workerEnv[name as string];
  if (typeof runtime === 'string') return runtime;
  const bundled = import.meta.env[name];
  return typeof bundled === 'string' ? bundled : undefined;
}
