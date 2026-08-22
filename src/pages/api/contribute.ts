import type { APIRoute } from 'astro';
import type { ContributionKind } from '../../lib/db';
import { submitContribution } from '../../lib/contribute';
import { getPageCopy, getSiteCopy } from '../../lib/content';
import { appDataStore, runtimeValue } from '../../lib/runtime';

function redirectTarget(status: string, issue?: { number: number; url: string }): string {
  const query = new URLSearchParams({ status });
  if (issue) {
    query.set('issue', String(issue.number));
    query.set('url', issue.url);
  }
  return `/app/contribute?${query}`;
}

export const POST: APIRoute = async ({ request, locals, redirect }) => {
  const form = await request.formData();
  const kindValue = String(form.get('kind') ?? '');
  const title = String(form.get('title') ?? '').trim();
  const description = String(form.get('description') ?? '').trim();
  if ((kindValue !== 'feature' && kindValue !== 'problem') || !title || !description) {
    return redirect(redirectTarget('invalid'), 303);
  }

  const [site, contributeCopy, appCopy] = await Promise.all([getSiteCopy(), getPageCopy('contribute'), getPageCopy('app')]);
  const result = await submitContribution({
    store: appDataStore(locals),
    fetcher: fetch,
    token: runtimeValue(locals, 'GITHUB_TOKEN'),
    repo: runtimeValue(locals, 'GITHUB_REPO') ?? '',
    input: {
      kind: kindValue as ContributionKind,
      title,
      description,
      pageUrl: String(form.get('page_url') ?? '').trim() || undefined,
    },
    username: locals.session?.username ?? appCopy.header.accountName,
    site: site.name,
    bodyTemplates: contributeCopy.github,
  });

  return result.status === 'created'
    ? redirect(redirectTarget(result.status, result.issue), 303)
    : redirect(redirectTarget(result.status), 303);
};
