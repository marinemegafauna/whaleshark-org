import type { DataStore } from './db';
import { createDataStore } from './db';
import { isMockMode } from './mode';

type CloudflareLocals = App.Locals & {
  runtime?: { env?: { DB?: D1Database; [key: string]: unknown } };
};

export function dataStore(locals: App.Locals): DataStore {
  return createDataStore((locals as CloudflareLocals).runtime?.env?.DB, isMockMode());
}

export function runtimeValue(locals: App.Locals, name: keyof ImportMetaEnv): string | undefined {
  const runtime = (locals as CloudflareLocals).runtime?.env?.[name];
  if (typeof runtime === 'string') return runtime;
  const bundled = import.meta.env[name];
  return typeof bundled === 'string' ? bundled : undefined;
}
