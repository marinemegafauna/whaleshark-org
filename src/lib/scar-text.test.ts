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

    // The named cause (propeller) overwrites the bare wound words (cut, missing): METHOD 3.1.
    expect(suggestions).toEqual({
      anthropogenic: 'yes',
      threat: 'vessel',
      cause: 'propeller',
      confidence: 'probable',
      severity: 'major',
      body_region: 'dorsal_fin_1',
      healing_stage: 'open',
    });
  });

  test('never upgrades a bare wound word to a named cause', () => {
    expect(suggestScarFields('Small nick in the trailing edge of the first dorsal.', getSpecies('whale-shark'))).toEqual({
      severity: 'moderate',
      cause: 'cut_unstated',
      confidence: 'possible',
      body_region: 'dorsal_fin_1',
      region_detail: 'trailing_edge',
    });
    expect(suggestScarFields('Abrasion on the leading edge of the dorsal fin.', getSpecies('whale-shark'))).toEqual({
      anthropogenic: 'abrasion', threat: 'contact', cause: 'contact', confidence: 'possible', severity: 'minor', body_region: 'dorsal_fin_1', region_detail: 'leading_edge',
    });
  });

  test('specific regions win over their generic parent', () => {
    expect(suggestScarFields('cut on second dorsal', getSpecies('whale-shark')).body_region).toBe('dorsal_fin_2');
    expect(suggestScarFields('scar on caudal peduncle', getSpecies('whale-shark')).body_region).toBe('caudal_peduncle');
    expect(suggestScarFields('nick in the tail', getSpecies('whale-shark')).body_region).toBe('caudal_fin');
    expect(suggestScarFields('cut on upper caudal lobe tip', getSpecies('whale-shark'))).toMatchObject({ body_region: 'caudal_fin', region_detail: 'upper_lobe' });
  });
});
