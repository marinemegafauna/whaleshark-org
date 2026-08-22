import { withoutScarSummaryLine } from './scar-summary';
import type { WorkbenchEncounter } from './wildbook';

export type WorkbenchScarFilter = 'needs_record' | 'scar_text' | 'all';
const EMPTY_SCAR_VALUES = new Set(['none', 'n/a', 'na', 'no', 'nil', 'unknown', '—', '-']);

export function hasSharkbookScarText(encounter: Pick<WorkbenchEncounter, 'distinguishingScar'>): boolean {
  const humanText = withoutScarSummaryLine(encounter.distinguishingScar).trim();
  return Boolean(humanText) && !EMPTY_SCAR_VALUES.has(humanText.toLowerCase());
}

export function workbenchScarFilter(
  encounters: WorkbenchEncounter[],
  filter: WorkbenchScarFilter,
  scarredEncounterIds: Set<string>,
  reviewedEncounterIds: Set<string>,
): WorkbenchEncounter[] {
  if (filter === 'all') return encounters;
  if (filter === 'scar_text') return encounters.filter((encounter) => hasSharkbookScarText(encounter) && !scarredEncounterIds.has(encounter.id));
  return encounters.filter((encounter) => !reviewedEncounterIds.has(encounter.id));
}
