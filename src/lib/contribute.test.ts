import { beforeEach, describe, expect, test, vi } from 'vitest';
import { createMemoryStore } from './db';
import { listOpenContributionIssues, submitContribution, type ContributionIssueCache } from './contribute';

const baseInput = {
  kind: 'feature' as const,
  title: 'Show encounter aliases',
  description: 'Researchers need to see local aliases beside Sharkbook identifiers.',
  pageUrl: 'https://whaleshark.org/app',
};
const bodyTemplates = {
  pageLine: 'Page: {url}',
  footer: 'Filed from whaleshark.org by Sharkbook user `{username}` · site `{site}` · {date}',
};

function githubResponse(number = 42) {
  return new Response(JSON.stringify({
    number,
    html_url: `https://github.com/marinemegafauna/whaleshark-org/issues/${number}`,
    title: baseInput.title,
    user: { login: 'simonjpierce' },
    created_at: '2026-08-22T01:02:03.000Z',
    labels: [{ name: 'from-site' }, { name: 'feature-request' }],
  }), { status: 201, headers: { 'content-type': 'application/json' } });
}

describe('site contribution requests', () => {
  beforeEach(() => createMemoryStore().reset());

  test('creates a feature issue with the exact labels, page context, and non-secret footer', async () => {
    const fetcher = vi.fn().mockResolvedValue(githubResponse());
    const result = await submitContribution({
      store: createMemoryStore(),
      fetcher,
      token: 'github-secret',
      repo: 'marinemegafauna/whaleshark-org',
      input: baseInput,
      username: 'simon',
      site: 'whaleshark.org',
      bodyTemplates,
      now: new Date('2026-08-22T01:02:03.000Z'),
    });

    expect(result).toEqual({
      status: 'created',
      issue: { number: 42, url: 'https://github.com/marinemegafauna/whaleshark-org/issues/42' },
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
    const [url, init] = fetcher.mock.calls[0]!;
    expect(url).toBe('https://api.github.com/repos/marinemegafauna/whaleshark-org/issues');
    expect(init.headers).toMatchObject({ Authorization: 'Bearer github-secret' });
    expect(JSON.parse(String(init.body))).toEqual({
      title: baseInput.title,
      body: `${baseInput.description}\n\nPage: ${baseInput.pageUrl}\n\n---\nFiled from whaleshark.org by Sharkbook user \`simon\` · site \`whaleshark.org\` · 2026-08-22`,
      labels: ['from-site', 'feature-request'],
    });
    expect(String(init.body)).not.toContain('github-secret');
    await expect(createMemoryStore().listContributions()).resolves.toEqual([
      expect.objectContaining({ github_issue_number: 42, username: 'simon', kind: 'feature', title: baseInput.title }),
    ]);
  });

  test('maps a problem to the bug label', async () => {
    const fetcher = vi.fn().mockResolvedValue(githubResponse(43));
    await submitContribution({
      store: createMemoryStore(), fetcher, token: 'token', repo: 'marinemegafauna/whaleshark-org',
      input: { ...baseInput, kind: 'problem' }, username: 'simon', site: 'whaleshark.org', bodyTemplates,
      now: new Date('2026-08-22T01:02:03.000Z'),
    });

    expect(JSON.parse(String(fetcher.mock.calls[0]![1].body)).labels).toEqual(['from-site', 'bug']);
  });

  test('stores the request without calling GitHub when the token is missing', async () => {
    const fetcher = vi.fn();
    const result = await submitContribution({
      store: createMemoryStore(), fetcher, token: undefined, repo: 'marinemegafauna/whaleshark-org',
      input: baseInput, username: 'simon', site: 'whaleshark.org', bodyTemplates,
      now: new Date('2026-08-22T01:02:03.000Z'),
    });

    expect(result).toEqual({ status: 'stored' });
    expect(fetcher).not.toHaveBeenCalled();
    await expect(createMemoryStore().listContributions()).resolves.toEqual([
      expect.objectContaining({ github_issue_number: null, github_url: null, username: 'simon' }),
    ]);
  });

  test('keeps the stored request when GitHub is temporarily unavailable', async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error('offline'));
    const result = await submitContribution({
      store: createMemoryStore(), fetcher, token: 'token', repo: 'marinemegafauna/whaleshark-org',
      input: baseInput, username: 'simon', site: 'whaleshark.org', bodyTemplates,
      now: new Date('2026-08-22T01:02:03.000Z'),
    });

    expect(result).toEqual({ status: 'stored' });
    await expect(createMemoryStore().listContributions()).resolves.toEqual([
      expect.objectContaining({ github_issue_number: null, title: baseInput.title }),
    ]);
  });

  test('allows only one request per username per rolling minute', async () => {
    const fetcher = vi.fn().mockResolvedValue(githubResponse());
    const first = await submitContribution({
      store: createMemoryStore(), fetcher, token: 'token', repo: 'marinemegafauna/whaleshark-org',
      input: baseInput, username: 'simon', site: 'whaleshark.org', bodyTemplates, now: new Date('2026-08-22T01:02:03.000Z'),
    });
    const second = await submitContribution({
      store: createMemoryStore(), fetcher, token: 'token', repo: 'marinemegafauna/whaleshark-org',
      input: { ...baseInput, title: 'Second request' }, username: 'simon', site: 'whaleshark.org', bodyTemplates, now: new Date('2026-08-22T01:02:33.000Z'),
    });

    expect(first.status).toBe('created');
    expect(second).toEqual({ status: 'rate_limited' });
    expect(fetcher).toHaveBeenCalledTimes(1);
    await expect(createMemoryStore().listContributions()).resolves.toHaveLength(1);
  });
});

describe('open contribution issues', () => {
  test('maps GitHub issues for display and uses the five-minute cache', async () => {
    const cacheValues = new Map<string, string>();
    const cache: ContributionIssueCache = {
      get: vi.fn(async (key) => cacheValues.get(key) ?? null),
      put: vi.fn(async (key, value) => { cacheValues.set(key, value); }),
    };
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify([
      {
        number: 42,
        html_url: 'https://github.com/marinemegafauna/whaleshark-org/issues/42',
        title: 'Show encounter aliases',
        user: { login: 'simonjpierce' },
        created_at: '2026-08-22T01:02:03.000Z',
        labels: [{ name: 'from-site' }, { name: 'feature-request' }],
      },
    ]), { status: 200, headers: { 'content-type': 'application/json' } }));

    const first = await listOpenContributionIssues({ fetcher, cache, repo: 'marinemegafauna/whaleshark-org', token: 'token' });
    const second = await listOpenContributionIssues({ fetcher, cache, repo: 'marinemegafauna/whaleshark-org', token: 'token' });

    expect(first).toEqual([{
      number: 42,
      url: 'https://github.com/marinemegafauna/whaleshark-org/issues/42',
      title: 'Show encounter aliases',
      openedBy: 'simonjpierce',
      openedAt: '2026-08-22T01:02:03.000Z',
      kind: 'feature',
    }]);
    expect(second).toEqual(first);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(cache.put).toHaveBeenCalledWith('contribute:issues', JSON.stringify(first), { expirationTtl: 300 });
  });
});
