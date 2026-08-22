import type { APIRoute } from 'astro';
import { isMockMode } from '../../../lib/mode';
import { dataStore } from '../../../lib/runtime';
import { login } from '../../../lib/wildbook';

export const POST: APIRoute = async ({ request, cookies, locals, redirect, url }) => {
  const form = await request.formData();
  const username = String(form.get('username') ?? '').trim();
  const password = String(form.get('password') ?? '');
  if (!username || !password) return redirect('/signin?error=missing', 303);

  try {
    const authenticated = isMockMode()
      ? { cookie: 'JSESSIONID=mock', user: { username } }
      : await login(username, password);
    const now = new Date();
    const session = {
      id: crypto.randomUUID(),
      wildbook_cookie: authenticated.cookie,
      username: String(authenticated.user.username ?? username),
      created_at: now.toISOString(),
      expires_at: new Date(now.getTime() + 8 * 60 * 60 * 1000).toISOString(),
    };
    await dataStore(locals).createSession(session);
    cookies.set('whaleshark_session', session.id, {
      httpOnly: true,
      sameSite: 'lax',
      secure: url.protocol === 'https:',
      path: '/',
      maxAge: 8 * 60 * 60,
    });
    const next = String(form.get('next') ?? '/app');
    return redirect(next.startsWith('/') && !next.startsWith('//') ? next : '/app', 303);
  } catch {
    return redirect('/signin?error=invalid', 303);
  }
};
