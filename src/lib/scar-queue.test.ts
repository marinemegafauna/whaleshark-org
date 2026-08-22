import { describe, expect, test } from 'vitest';
import type { WorkbenchEncounter } from './wildbook';
import { hasSharkbookScarText, workbenchScarFilter } from './scar-queue';

const encounter = (id: string, distinguishingScar: string | null): WorkbenchEncounter => ({
  id, distinguishingScar, individualId: null, individualUuid: null, sightings: 0, date: '—', photographer: '—', sex: '—', size: '—', photos: '0', siteId: 'tofo', image: '', imageFilename: '', box: null, state: 'approved', lifeStage: null, locationId: 'Tofo', verbatimLocality: null, occurrenceId: null,
  occurrenceRemarks: null, researcherComments: null, measurements: null, behavior: null,
});

describe('scar workbench queue', () => {
  test('counts human Sharkbook text but not empty sentinels or our own summary', () => {
    expect(hasSharkbookScarText(encounter('human', 'Fresh propeller cuts.'))).toBe(true);
    expect(hasSharkbookScarText(encounter('none', 'None'))).toBe(false);
    expect(hasSharkbookScarText(encounter('own', '[scars v1.0] flank: abrasion · minor · healed · unknown (whaleshark.org, 2026-08-22, spierce)'))).toBe(false);
    expect(hasSharkbookScarText(encounter('both', 'Old rope wound.\n\n[scars v1.0] flank: abrasion · minor · healed · unknown (whaleshark.org, 2026-08-22, spierce)'))).toBe(true);
  });

  test('filters the current page into the requested workbench queues', () => {
    const encounters = [encounter('human', 'Fresh propeller cuts.'), encounter('blank', null), encounter('recorded', 'Old wound.')];
    const scarred = new Set(['recorded']);
    const reviewed = new Set(['recorded']);

    expect(workbenchScarFilter(encounters, 'scar_text', scarred, reviewed).map(({ id }) => id)).toEqual(['human']);
    expect(workbenchScarFilter(encounters, 'needs_record', scarred, reviewed).map(({ id }) => id)).toEqual(['human', 'blank']);
    expect(workbenchScarFilter(encounters, 'all', scarred, reviewed).map(({ id }) => id)).toEqual(['human', 'blank', 'recorded']);
  });
});
