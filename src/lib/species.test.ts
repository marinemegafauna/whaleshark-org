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
    expect(species.version).toBe('2.0');
    // Method v0.1 axes (METHOD.md Section 2) with the codes carried in the option labels.
    expect(species.fields.map((field) => field.id)).toEqual(['observation_mode', 'description', 'body_region', 'region_detail', 'anthropogenic', 'threat', 'cause', 'confidence', 'severity', 'healing_stage', 'n_scars', 'notes']);
    expect(species.fields.find((field) => field.id === 'severity')?.options?.map((option) => option.id)).toEqual(['major', 'moderate', 'minor']);
    expect(species.fields.find((field) => field.id === 'anthropogenic')?.options?.map((option) => option.label)).toEqual(['Yes (Y)', 'Abrasion / contact (A)', 'Natural (N)', 'Unknown (U)']);
    expect(species.fields.find((field) => field.id === 'confidence')?.default).toBe('possible');
    expect(species.fields.find((field) => field.id === 'n_scars')).toMatchObject({ type: 'number', default: '1' });
    expect(species.text_hints).toEqual(expect.arrayContaining([
      expect.objectContaining({ pattern: 'prop', values: { anthropogenic: 'yes', threat: 'vessel', cause: 'propeller', confidence: 'probable' } }),
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
