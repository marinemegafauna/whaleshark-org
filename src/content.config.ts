import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { pageCollectionSchema, siteContentSchema, speciesSchema } from './lib/content-schema';

const pages = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './content/pages' }),
  schema: pageCollectionSchema,
});

const site = defineCollection({
  loader: glob({ pattern: 'site.md', base: './content' }),
  schema: siteContentSchema,
});

const species = defineCollection({
  loader: glob({ pattern: '**/*.{yaml,yml}', base: './content/species' }),
  schema: speciesSchema,
});

export const collections = { pages, site, species };
