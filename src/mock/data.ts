import type { ProvenanceResult } from '../lib/provenance';

export interface MockEncounter {
  id: string;
  individualId: string | null;
  sightings: number;
  date: string;
  photographer: string;
  sex: string;
  size: string;
  photos: string;
  siteId: string;
  image: string;
  imageFilename: string;
  provenance?: ProvenanceResult;
}

const mockMetadata = { hasExif: false, hasXmp: false, hasIptc: false, hasC2pa: false };
const mockProvenance = (score: 0 | 1 | 2 | 3, signals: ProvenanceResult['signals']): ProvenanceResult => ({ score, signals, metadata: mockMetadata, version: 1 });

export const mockEncounters: MockEncounter[] = [
  { id: '2fca3548', individualId: 'MZ-284', sightings: 14, date: '14 Aug 2026', photographer: 'C. Prebble', sex: 'M', size: '~7 m', photos: '6 · L+R', siteId: 'tofo', image: '/mock/whale-shark-1.svg', imageFilename: 'IMG_4471.JPG', provenance: mockProvenance(3, [{ code: 'ai_software', weight: 2, label: 'ai_software' }, { code: 'no_camera', weight: 1, label: 'no_camera' }]) },
  { id: 'b3453961', individualId: 'MZ-412', sightings: 3, date: '14 Aug 2026', photographer: 'O. Patterson', sex: 'F', size: '~5.5 m', photos: '4 · L', siteId: 'tofo', image: '/mock/whale-shark-2.svg', imageFilename: 'IMG_4472.JPG', provenance: mockProvenance(1, [{ code: 'no_exif', weight: 1, label: 'no_exif' }]) },
  { id: '4935bac7', individualId: null, sightings: 0, date: '13 Aug 2026', photographer: '[guide]', sex: '—', size: '~6 m', photos: '2 · L', siteId: 'tofo', image: '/mock/whale-shark-3.svg', imageFilename: 'IMG_4473.JPG' },
  { id: 'c5983598', individualId: 'MZ-091', sightings: 31, date: '12 Aug 2026', photographer: 'C. Prebble', sex: 'M', size: '~8 m', photos: '9 · L+R', siteId: 'tofo', image: '/mock/whale-shark-4.svg', imageFilename: 'IMG_4474.JPG' },
  { id: 'a17e02d9', individualId: 'MZ-284', sightings: 14, date: '9 Aug 2026', photographer: '[guide]', sex: 'M', size: '~7 m', photos: '3 · L', siteId: 'tofo', image: '/mock/whale-shark-5.svg', imageFilename: 'IMG_4475.JPG' },
  { id: 'd8f1c2a0', individualId: 'MZ-377', sightings: 1, date: '8 Aug 2026', photographer: 'O. Patterson', sex: 'F', size: '~4.5 m', photos: '5 · L+R', siteId: 'tofo', image: '/mock/whale-shark-6.svg', imageFilename: 'IMG_4476.JPG' },
  { id: 'e92bc110', individualId: 'TZ-117', sightings: 6, date: '5 Aug 2026', photographer: 'M. Hassan', sex: 'F', size: '~6 m', photos: '4 · L+R', siteId: 'mafia-island', image: '/mock/whale-shark-2.svg', imageFilename: 'IMG_4477.JPG' },
  { id: 'f04ad281', individualId: 'MZ-284', sightings: 14, date: '2 Aug 2026', photographer: 'A. Said', sex: 'M', size: '~7 m', photos: '2 · L', siteId: 'mafia-island', image: '/mock/whale-shark-1.svg', imageFilename: 'IMG_4478.JPG' },
];

export const mockScarFirstSeenLabels: Record<string, string> = { 'old-2023': '2 Nov 2023' };

export const mockScarRecords = [
  {
    id: 'scar-1', species_id: 'whale-shark', schema_version: '1.0', encounter_id: '2fca3548', individual_id: 'MZ-284', site_id: 'tofo', observer: 'clare', recorded_at: '2026-08-14T10:00:00.000Z', photo_asset_id: 'mock-1', x: 0.42, y: 0.32,
    fields_json: JSON.stringify({ body_region: 'dorsal_fin_1', type: 'laceration', severity: 'major', freshness: 'healing', likely_cause: 'propeller', confidence: 'probable' }), notes: 'Leading-edge laceration.', first_seen_encounter_id: '2fca3548',
  },
  {
    id: 'scar-2', species_id: 'whale-shark', schema_version: '1.0', encounter_id: '2fca3548', individual_id: 'MZ-284', site_id: 'tofo', observer: 'clare', recorded_at: '2026-08-14T10:05:00.000Z', photo_asset_id: 'mock-1', x: 0.75, y: 0.58,
    fields_json: JSON.stringify({ body_region: 'caudal_fin', type: 'nick', severity: 'minor', freshness: 'healed', likely_cause: 'unknown', confidence: 'certain' }), notes: null, first_seen_encounter_id: 'old-2023',
  },
];

export const mockReviewStatuses = [
  { encounter_id: 'c5983598', species_id: 'whale-shark', status: 'recorded' as const, reviewed_by: 'clare', reviewed_at: '2026-08-12T12:00:00.000Z' },
  { encounter_id: 'a17e02d9', species_id: 'whale-shark', status: 'no_new_scars' as const, reviewed_by: 'clare', reviewed_at: '2026-08-09T12:00:00.000Z' },
  { encounter_id: 'd8f1c2a0', species_id: 'whale-shark', status: 'recorded' as const, reviewed_by: 'clare', reviewed_at: '2026-08-08T12:00:00.000Z' },
];

export const mockSubmissions = [
  {
    id: 'submission-demo', created_at: '2026-08-21T08:30:00.000Z', photographer_name: 'Your name', photographer_email: 'photographer@example.org', site_id: 'tofo', observed_at: '2026-08-14', image_key: '/mock/whale-shark-1.svg', wildbook_encounter_id: '2fca3548', status: 'matched',
    match_json: JSON.stringify([
      { individualId: 'MZ-284', score: 0.68, site: 'Tofo', detail: 'last seen 14 Aug 2026 · male · ~7 m', image: '/mock/whale-shark-1.svg' },
      { individualId: 'TZ-117', score: 0.31, site: 'Mafia Island', detail: '2024', image: '/mock/whale-shark-2.svg' },
      { individualId: 'MD-393', score: 0.24, site: 'Nosy Be', detail: '2023', image: '/mock/whale-shark-3.svg' },
    ]),
    observations_json: JSON.stringify({
      observed_date: '2026-08-14', site_id: 'tofo', sex: 'male', life_stage: 'adult', length: { value: 7, unit: 'm', estimated: true },
      behavior: ['feeding_surface'], living_status: 'alive', individual_count: 1,
      injuries: { severity: 'minor', regions: ['dorsal_fin_1'], types: ['healed_scar'], description: 'Small healed mark.' },
      submitter_name: 'Your name', submitter_email: 'photographer@example.org', inform_other: [], comments: '', consented_at: '2026-08-21T08:31:00.000Z',
    }),
    provenance_json: JSON.stringify(mockProvenance(0, [])),
    sha256: 'mock-submission-demo',
  },
];

export const publicSubmissionDefaults = {
  photographer_name: '',
  photographer_email: '',
  site_id: 'tofo',
  observed_at: '2026-08-14',
};

export const mockBatches = [
  {
    id: 'batch-demo', created_at: '2026-08-21T09:00:00.000Z', updated_at: '2026-08-21T09:06:00.000Z',
    site_id: 'tofo', observed_at: '2026-08-14', photographer_name: 'O. Patterson', photographer_email: 'o.patterson@example.org',
    observations_json: null, status: 'review' as const, wildbook_task_id: null,
  },
];

export const mockBatchItems = [
  ['MZ-284', 0.68], ['MZ-284', 0.64], ['MZ-412', 0.57], ['MZ-091', 0.71],
].map(([individualId, score], index) => ({
  id: `batch-demo-item-${index + 1}`, batch_id: 'batch-demo', created_at: `2026-08-21T09:00:0${index}.000Z`,
  filename: `IMG_${4471 + index}.JPG`, mime_type: 'image/jpeg', size_bytes: 13_000_000 + index * 500_000,
  image_key: `/mock/whale-shark-${(index % 6) + 1}.svg`, status: 'matched' as const,
  match_json: JSON.stringify({ bbox: [0.14, 0.2, 0.68, 0.58], candidates: [{ individualId, score }] }), observations_json: null, wildbook_task_id: null,
  provenance_json: JSON.stringify(index === 0
    ? mockProvenance(2, [{ code: 'ai_software', weight: 2, label: 'ai_software' }])
    : index === 1
      ? mockProvenance(1, [{ code: 'no_exif', weight: 1, label: 'no_exif' }])
      : mockProvenance(0, [])),
  sha256: `mock-batch-demo-${index + 1}`,
}));
