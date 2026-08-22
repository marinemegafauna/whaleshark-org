import { describe, expect, test } from 'vitest';
import { getSpecies } from './species';
import { extractScarSentences, suggestScarFields } from './scar-text';

describe('Sharkbook scar text', () => {
  test('extracts only scar-related sentences from plain text and researcher HTML', () => {
    expect(extractScarSentences(
      'Feeding at the surface. Fresh propeller cuts on the first dorsal fin! Calm encounter.',
      '<p>Old rope injury is healing.</p><p>Photo approved by reviewer.</p>',
    )).toEqual([
      'Fresh propeller cuts on the first dorsal fin!',
      'Old rope injury is healing.',
    ]);
  });

  test('uses only schema-valid text hints and combines obvious suggestions', () => {
    const suggestions = suggestScarFields(
      'Fresh propeller cut on the dorsal fin with part of the fin missing.',
      getSpecies('whale-shark'),
    );

    expect(suggestions).toEqual({
      likely_cause: 'propeller',
      body_region: 'dorsal_fin_1',
      freshness: 'fresh',
      type: 'amputation',
    });
  });
});
