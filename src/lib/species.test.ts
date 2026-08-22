import { describe, expect, test } from 'vitest';
import { getSpecies, parseSpecies } from './species';

const speciesSources = import.meta.glob('../../content/species/*.{yaml,yml}', {
  eager: true,
  import: 'default',
  query: '?raw',
});

describe('species schema', () => {
  test('loads the valid whale-shark file', () => {
    expect(Object.keys(speciesSources)).toEqual(['../../content/species/whale-shark.yaml']);
    const species = getSpecies('whale-shark');

    expect(species.common_name).toBe('Whale shark');
    expect(species.fields.find((field) => field.id === 'severity')?.options).toHaveLength(2);
  });

  test('rejects duplicate option ids', () => {
    expect(() =>
      parseSpecies(`
id: duplicate-options
version: "1"
common_name: Example
scientific_name: Exemplum animalia
wildbook_taxonomy: Exemplum animalia
fields:
  - id: region
    label: Region
    required: true
    options:
      - { id: fin, label: Fin }
      - { id: fin, label: Other fin }
`),
    ).toThrow(/duplicate option id "fin"/i);
  });

  test('rejects an option missing its required label', () => {
    expect(() =>
      parseSpecies(`
id: missing-label
version: "1"
common_name: Example
scientific_name: Exemplum animalia
wildbook_taxonomy: Exemplum animalia
fields:
  - id: region
    label: Region
    required: true
    options:
      - { id: fin }
`),
    ).toThrow(/label/i);
  });
});
