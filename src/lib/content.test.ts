import { describe, expect, test } from 'vitest';
import { parse } from 'yaml';
import siteConfig from '../../site.config';
import { fillTemplate, renderMarkdownBlocks, renderMarkdownInline } from './content-utils';

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
      '../../content/pages/about-whale-sharks.md',
      '../../content/pages/app.md',
      '../../content/pages/bulk.md',
      '../../content/pages/collaboration.md',
      '../../content/pages/contribute.md',
      '../../content/pages/how-it-works.md',
      '../../content/pages/landing.md',
      '../../content/pages/match.md',
      '../../content/pages/practice.md',
      '../../content/pages/provenance.md',
      '../../content/pages/signin.md',
    ]);
    expect(Object.keys(siteSources)).toEqual(['../../content/site.md']);
    expect(Object.keys(speciesSources)).toEqual(['../../content/species/whale-shark.yaml']);

    const { pageCollectionSchema, siteContentSchema, speciesSchema } = await import('./content-schema');
    for (const source of Object.values(pageSources)) pageCollectionSchema.parse(frontmatter(source));
    for (const source of Object.values(siteSources)) siteContentSchema.parse(frontmatter(source));
    for (const source of Object.values(speciesSources)) speciesSchema.parse(parse(source));
  });

  test('keeps the public report, partner row, and explainer navigation content-driven', async () => {
    const { siteContentSchema, speciesSchema } = await import('./content-schema');
    const site = siteContentSchema.parse(frontmatter(Object.values(siteSources)[0]!));
    const species = speciesSchema.parse(parse(Object.values(speciesSources)[0]!));

    expect(site.partners.map((partner) => partner.name)).toEqual([
      'Sharkbook.ai',
      'Conservation X Labs — Wild Me',
      'Marine Megafauna Foundation',
    ]);
    expect(site.publicNav).toContainEqual(expect.objectContaining({ label: 'How it works', href: '/how-it-works' }));
    expect(site.publicNav).toContainEqual(expect.objectContaining({ label: 'About whale sharks', href: '/about-whale-sharks' }));
    expect(site.howItWorksUi.build).toEqual({ label: 'Build one for your species →', href: 'https://github.com/marinemegafauna/whaleshark-org' });
    expect(species.public_report.groups.map((group) => group.id)).toEqual([
      'when_where',
      'about_shark',
      'injuries',
      'water',
      'about_you',
    ]);
    expect(species.public_report.groups.flatMap((group) => group.fields).find((field) => field.id === 'sex')).toMatchObject({
      type: 'chips',
      required: true,
      default: 'unknown',
    });
    expect(species.public_report.groups.flatMap((group) => group.fields).find((field) => field.id === 'length')).toMatchObject({
      type: 'number',
      default_unit: 'm',
      estimated_default: true,
    });
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

  test('renders controlled explainer markdown as safe paragraph blocks', () => {
    expect(renderMarkdownBlocks('An **encounter** is one record.\n\nUse <care>.')).toBe(
      '<p>An <strong>encounter</strong> is one record.</p><p>Use &lt;care&gt;.</p>',
    );
  });

  test('renders safe relative, external, and email links in controlled explainer markdown', () => {
    expect(renderMarkdownBlocks(
      'Read [how it works](/how-it-works), [the assessment](https://example.org/status), or [email us](mailto:team@example.org).',
    )).toBe(
      '<p>Read <a href="/how-it-works">how it works</a>, <a href="https://example.org/status">the assessment</a>, or <a href="mailto:team@example.org">email us</a>.</p>',
    );
    expect(renderMarkdownBlocks('[unsafe](javascript:alert(1))')).not.toContain('<a ');
  });

  test('renders controlled inline emphasis without exposing raw HTML', () => {
    expect(renderMarkdownInline('Pierce et al. *Rhincodon typus*.')).toBe('Pierce et al. <em>Rhincodon typus</em>.');
    expect(renderMarkdownInline('<em>unsafe</em>')).toBe('&lt;em&gt;unsafe&lt;/em&gt;');
  });

  test('keeps the new public and signed-in learning pages content-driven', async () => {
    const { pageCollectionSchema } = await import('./content-schema');
    const pages = Object.fromEntries(Object.entries(pageSources).map(([file, source]) => [file, pageCollectionSchema.parse(frontmatter(source))]));

    expect(pages['../../content/pages/about-whale-sharks.md']).toMatchObject({
      page: 'about-whale-sharks',
      status_card: { heading: 'IUCN Red List: Endangered', assessmentYear: '2025' },
    });
    expect(pages['../../content/pages/practice.md']).toMatchObject({
      page: 'practice',
      videos: { items: [{ id: 'sJr27BJ5J7g' }, { id: '0FXIZDnC01Q' }] },
    });
    expect(pages['../../content/pages/collaboration.md']).toMatchObject({
      page: 'collaboration',
      banner: { label: 'DRAFT for Simon to edit' },
    });
    expect(pages['../../content/pages/contribute.md']).toMatchObject({ page: 'contribute' });
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

  test('provides public-observation copy for single, bulk, and researcher surfaces', async () => {
    const { pageCollectionSchema } = await import('./content-schema');
    const pages = Object.fromEntries(Object.entries(pageSources).map(([file, source]) => [file, pageCollectionSchema.parse(frontmatter(source))]));
    const match = pages['../../content/pages/match.md'];
    const bulk = pages['../../content/pages/bulk.md'];
    const app = pages['../../content/pages/app.md'];

    expect(match).toMatchObject({ page: 'match', report: { heading: 'About this sighting' } });
    expect(bulk).toMatchObject({ page: 'bulk', batchCard: { sightingHeading: 'Shared sighting details' } });
    expect(app).toMatchObject({ page: 'app', workbench: { publicNotesLabel: 'Public notes' } });
  });

  test('keeps provenance labels and the maintained AI tool list in content', async () => {
    const { pageCollectionSchema } = await import('./content-schema');
    const source = pageSources['../../content/pages/provenance.md'];
    expect(source).toBeDefined();
    const provenance = pageCollectionSchema.parse(frontmatter(source!));

    expect(provenance).toMatchObject({
      page: 'provenance',
      chips: { score1: 'Check provenance', score3: 'Likely AI or synthetic' },
      signals: { no_exif: 'No camera data', c2pa_present: 'Content Credentials' },
    });
    if (provenance.page !== 'provenance') throw new Error('Provenance fixture has the wrong page discriminator');
    expect(provenance.aiTools).toEqual(expect.arrayContaining(['midjourney', 'stable diffusion', 'openai', 'ai generated']));
  });
});
