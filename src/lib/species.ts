import { parse } from 'yaml';
import { speciesSchema, type Species } from './content-schema';

export { speciesSchema, type Species, type SpeciesField, type SpeciesOption } from './content-schema';

export function parseSpecies(source: string): Species {
  const result = speciesSchema.safeParse(parse(source));
  if (!result.success) {
    const detail = result.error.issues
      .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid species schema — ${detail}`);
  }
  return result.data;
}

const sources = import.meta.glob('../../content/species/*.{yaml,yml}', {
  eager: true,
  import: 'default',
  query: '?raw',
}) as Record<string, string>;

const species = new Map<string, Species>();
for (const source of Object.values(sources)) {
  const parsed = parseSpecies(source);
  species.set(parsed.id, parsed);
}

export function getSpecies(id: string): Species {
  const result = species.get(id);
  if (!result) throw new Error(`Unknown species: ${id}`);
  return result;
}

export function listSpecies(): Species[] {
  return [...species.values()];
}
