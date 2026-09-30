import { defineMiddleware } from 'astro:middleware';
import { isMockAppMode, isMatchingEnabled } from './lib/mode';
import { appDataStore } from './lib/runtime';

export const onRequest = defineMiddleware(async (context, next) => {
  const matching = context.url.pathname.startsWith('/app/matching') || context.url.pathname.startsWith('/api/matching');
  if (matching && !isMatchingEnabled()) return new Response('Not found', { status: 404 });
  const protectedPath = context.url.pathname.startsWith('/app') || context.url.pathname.startsWith('/api/scars') || context.url.pathname.startsWith('/api/review') || context.url.pathname.startsWith('/api/contribute') || matching;
  if (!protectedPath || isMockAppMode()) return next();

  const sessionId = context.cookies.get('whaleshark_session')?.value;
  if (sessionId) {
    const session = await appDataStore(context.locals).getSession(sessionId);
    if (session) {
      context.locals.session = session;
      return next();
    }
  }
  return context.redirect(`/signin?next=${encodeURIComponent(context.url.pathname + context.url.search)}`, 303);
});
