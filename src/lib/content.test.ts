import { describe, expect, test } from 'vitest';
import { parse } from 'yaml';
import siteConfig from '../../site.config';
import { fillTemplate } from './content-utils';

const pageSources = import.meta.glob('../../content/pages/*.md', {
  eager: true,
  import: 'default',
  query: '?raw',
}) as Record<string, string>;

const siteSources = import.meta.glob('../../content/site.md', {
  eager: true,
  import: 'default',
  query: '?raw',
}) as Record<string, string>;

const speciesSources = import.meta.glob('../../content/species/*.{yaml,yml}', {
  eager: true,
  import: 'default',
  query: '?raw',
}) as Record<string, string>;

const invalidSources = import.meta.glob('../test/fixtures/invalid-page.md', {
  eager: true,
  import: 'default',
  query: '?raw',
}) as Record<string, string>;

function frontmatter(source: string): unknown {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) throw new Error('Fixture does not contain YAML frontmatter');
  return parse(match[1]!);
}

describe('Astro content sources', () => {
  test('loads and validates every page, site copy, and species vocabulary', async () => {
    expect(Object.keys(pageSources).sort()).toEqual([
      '../../content/pages/app.md',
      '../../content/pages/bulk.md',
      '../../content/pages/landing.md',
      '../../content/pages/match.md',
      '../../content/pages/signin.md',
    ]);
    expect(Object.keys(siteSources)).toEqual(['../../content/site.md']);
    expect(Object.keys(speciesSources)).toEqual(['../../content/species/whale-shark.yaml']);

    const { pageCollectionSchema, siteContentSchema, speciesSchema } = await import('./content-schema');
    for (const source of Object.values(pageSources)) pageCollectionSchema.parse(frontmatter(source));
    for (const source of Object.values(siteSources)) siteContentSchema.parse(frontmatter(source));
    for (const source of Object.values(speciesSources)) speciesSchema.parse(parse(source));
  });

  test('rejects a page fixture with an unknown frontmatter key', async () => {
    const { pageCollectionSchema } = await import('./content-schema');
    const source = Object.values(invalidSources)[0];
    expect(source).toBeDefined();
    expect(() => pageCollectionSchema.parse(frontmatter(source!))).toThrow(/unrecognized key/i);
  });

  test('rejects display site ids that diverge from technical site config', async () => {
    const { siteContentSchema } = await import('./content-schema');
    const siteData = frontmatter(Object.values(siteSources)[0]!) as Record<string, unknown>;
    const researchSites = [...(siteData.researchSites as Array<Record<string, unknown>>)]
      .map((site, index) => index === 0 ? { ...site, id: 'tofo-typo' } : site);

    expect(() => siteContentSchema.parse({ ...siteData, researchSites })).toThrow(/technical site ids/i);
    expect(siteConfig.sites.map((site) => site.id)).toHaveLength(researchSites.length);
  });

  test('fails when a copy template contains an unresolved placeholder', () => {
    expect(fillTemplate('Hello, {name}.', { name: 'Simon' })).toBe('Hello, Simon.');
    expect(() => fillTemplate('Hello, {naem}.', { name: 'Simon' })).toThrow(/unresolved placeholder/i);
  });

  test('provides one site-level credit for every landing image', async () => {
    const { pageCollectionSchema, siteContentSchema } = await import('./content-schema');
    const landingSource = Object.entries(pageSources).find(([file]) => file.endsWith('/landing.md'))![1];
    const landing = pageCollectionSchema.parse(frontmatter(landingSource));
    const site = siteContentSchema.parse(frontmatter(Object.values(siteSources)[0]!));
    if (landing.page !== 'landing') throw new Error('Landing fixture has the wrong page discriminator');
    const imagePaths = [
      landing.hero.image.image,
      landing.hero.liveMatch.image,
      ...landing.how.steps.flatMap((step) => step.image ? [step.image.image] : []),
      landing.where.image.image,
    ];
    const credits = new Map(site.photoCredits.map((credit) => [credit.image, credit.credit]));

    expect(new Set(credits.keys()).size).toBe(site.photoCredits.length);
    expect(imagePaths.every((image) => credits.has(image))).toBe(true);
  });
});
