/// <reference types="astro/client" />

import type { SessionRecord } from './lib/db';

declare global {
  namespace App {
    interface Locals {
      session?: SessionRecord;
    }
  }

  interface ImportMetaEnv {
    readonly MOCK?: string;
    readonly MOCK_APP?: string;
    readonly PUBLIC_WRITE?: 'dry-run' | 'live';
    readonly SCAR_WRITEBACK?: 'off' | 'append';
    readonly GITHUB_REPO?: string;
    readonly GITHUB_TOKEN?: string;
    readonly WILDBOOK_BASE_URL?: string;
    readonly WILDBOOK_SERVICE_USER?: string;
    readonly WILDBOOK_SERVICE_PASSWORD?: string;
    readonly SESSION_SECRET?: string;
  }
}

export {};
