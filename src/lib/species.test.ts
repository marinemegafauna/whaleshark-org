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
    expect(species.text_hints).toEqual(expect.arrayContaining([
      expect.objectContaining({ pattern: 'prop', values: { likely_cause: 'propeller' } }),
    ]));
  });

  test('rejects a text hint that points at an option outside the scar schema', () => {
    expect(() => parseSpecies(`
id: invalid-hint
version: "1"
common_name: Example
scientific_name: Exemplum animalia
wildbook_taxonomy: Exemplum animalia
text_hints:
  - pattern: prop
    values: { likely_cause: vessel_strike }
fields:
  - id: likely_cause
    label: Likely cause
    required: true
    options:
      - { id: propeller, label: Propeller }
public_report:
  version: "1"
  submit_label: Submit
  saved_label: Saved
  choose_label: Choose
  units_label: "{field} units"
  groups:
    - id: details
      label: Details
      fields:
        - id: name
          label: Name
          type: text
          required: true
`)).toThrow(/text hint.*likely_cause.*vessel_strike/i);
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
