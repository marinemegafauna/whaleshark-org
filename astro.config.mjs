import { defineConfig } from 'astro/config';

// Managed/sandboxed shells cannot write Wrangler's macOS preferences log directory.
// Keep diagnostic logging ephemeral so `astro check` and builds stay offline-safe.
process.env.WRANGLER_LOG_PATH ??= '/tmp/whaleshark-org-wrangler.log';
const { default: cloudflare } = await import('@astrojs/cloudflare');

export default defineConfig({
  adapter: cloudflare(),
  output: 'server',
});
