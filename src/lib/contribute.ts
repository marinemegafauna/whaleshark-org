import type { Contribution, ContributionKind, DataStore } from './db';
import { fillTemplate } from './content-utils';

export interface ContributionInput {
  kind: ContributionKind;
  title: string;
  description: string;
  pageUrl?: string;
}

export interface ContributionIssueCache {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options: { expirationTtl: number }): Promise<void>;
}

export interface OpenContributionIssue {
  number: number;
  url: string;
  title: string;
  openedBy: string;
  openedAt: string;
  kind: ContributionKind | 'request';
}

type Fetcher = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

interface SubmitContributionOptions {
  store: DataStore;
  fetcher: Fetcher;
  token?: string;
  repo: string;
  input: ContributionInput;
  username: string;
  site: string;
  bodyTemplates: { pageLine: string; footer: string };
  now?: Date;
}

interface ListContributionIssuesOptions {
  fetcher?: Fetcher;
  cache?: ContributionIssueCache;
  token?: string;
  repo: string;
}

type SubmitContributionResult =
  | { status: 'created'; issue: { number: number; url: string } }
  | { status: 'stored' }
  | { status: 'rate_limited' };

interface GitHubIssue {
  number: number;
  html_url: string;
  title: string;
  user?: { login?: string } | null;
  created_at: string;
  labels?: Array<string | { name?: string }>;
  pull_request?: unknown;
}

const cacheKey = 'contribute:issues';
const cacheTtlSeconds = 300;
const rateLimitMilliseconds = 60_000;

function issueLabels(kind: ContributionKind): string[] {
  return ['from-site', kind === 'problem' ? 'bug' : 'feature-request'];
}

function issueBody(options: SubmitContributionOptions, now: Date): string {
  const page = options.input.pageUrl?.trim()
    ? `\n\n${fillTemplate(options.bodyTemplates.pageLine, { url: options.input.pageUrl.trim() })}`
    : '';
  const footer = fillTemplate(options.bodyTemplates.footer, {
    username: options.username,
    site: options.site,
    date: now.toISOString().slice(0, 10),
  });
  return `${options.input.description.trim()}${page}\n\n---\n${footer}`;
}

function githubHeaders(token?: string): Record<string, string> {
  return {
    Accept: 'application/vnd.github+json',
    'Content-Type': 'application/json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'whaleshark.org',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function submitContribution(options: SubmitContributionOptions): Promise<SubmitContributionResult> {
  const now = options.now ?? new Date();
  const contribution: Contribution = {
    id: crypto.randomUUID(),
    github_issue_number: null,
    github_url: null,
    username: options.username,
    created_at: now.toISOString(),
    kind: options.input.kind,
    title: options.input.title.trim(),
    description: options.input.description.trim(),
    page_url: options.input.pageUrl?.trim() || null,
  };
  const notBefore = new Date(now.getTime() - rateLimitMilliseconds).toISOString();
  if (!await options.store.createContributionIfAllowed(contribution, notBefore)) {
    return { status: 'rate_limited' };
  }
  if (!options.token || !options.repo) return { status: 'stored' };

  let response: Response;
  try {
    response = await options.fetcher(`https://api.github.com/repos/${options.repo}/issues`, {
      method: 'POST',
      headers: githubHeaders(options.token),
      body: JSON.stringify({
        title: contribution.title,
        body: issueBody(options, now),
        labels: issueLabels(options.input.kind),
      }),
    });
  } catch {
    return { status: 'stored' };
  }
  if (!response.ok) return { status: 'stored' };
  const issue = await response.json() as GitHubIssue;
  if (!Number.isSafeInteger(issue.number) || !issue.html_url) return { status: 'stored' };
  await options.store.updateContributionIssue(contribution.id, issue.number, issue.html_url);
  return { status: 'created', issue: { number: issue.number, url: issue.html_url } };
}

function labelNames(issue: GitHubIssue): string[] {
  return (issue.labels ?? []).flatMap((label) => {
    if (typeof label === 'string') return [label];
    return label.name ? [label.name] : [];
  });
}

function mapOpenIssue(issue: GitHubIssue): OpenContributionIssue {
  const labels = labelNames(issue);
  return {
    number: issue.number,
    url: issue.html_url,
    title: issue.title,
    openedBy: issue.user?.login ?? '',
    openedAt: issue.created_at,
    kind: labels.includes('bug') ? 'problem' : labels.includes('feature-request') ? 'feature' : 'request',
  };
}

function parseCachedIssues(value: string | null): OpenContributionIssue[] | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed as OpenContributionIssue[] : null;
  } catch {
    return null;
  }
}

export async function listOpenContributionIssues(options: ListContributionIssuesOptions): Promise<OpenContributionIssue[]> {
  const cached = parseCachedIssues(await options.cache?.get(cacheKey) ?? null);
  if (cached) return cached;

  const fetcher = options.fetcher ?? fetch;
  const response = await fetcher(
    `https://api.github.com/repos/${options.repo}/issues?labels=from-site&state=open&per_page=30`,
    { headers: githubHeaders(options.token) },
  );
  if (!response.ok) throw new Error(`GitHub issues request failed: ${response.status}`);
  const payload = await response.json() as GitHubIssue[];
  const issues = payload.filter((issue) => !issue.pull_request).map(mapOpenIssue);
  await options.cache?.put(cacheKey, JSON.stringify(issues), { expirationTtl: cacheTtlSeconds });
  return issues;
}
