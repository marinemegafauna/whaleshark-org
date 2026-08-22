import { describe, expect, test } from 'vitest';
import { getSpecies } from './species';
import { buildWildbookRow } from './wildbook';
import { mergePublicObservations, parsePublicObservationForm, parseStoredPublicObservations, preserveConsentTimestamp, publicObservationFieldValue, publicObservationHint, publicReportFieldOptions, validatePublicObservations } from './public-observations';

const species = getSpecies('whale-shark');

function fullObservationForm() {
  const form = new FormData();
  const values: Record<string, string> = {
    observed_date: '2026-08-14',
    observed_time: '14:30',
    site_id: 'tofo',
    verbatim_locality: 'Clownfish Reef',
    decimal_latitude: '-15.9423',
    decimal_longitude: '40.7481',
    depth: '18',
    depth_unit: 'm',
    sex: 'male',
    life_stage: 'adult',
    length: '25',
    length_unit: 'ft',
    length_estimated: 'on',
    living_status: 'alive',
    individual_count: '3',
    injury_severity: 'major',
    injury_description: 'trailing rope on right side',
    temperature: '80',
    temperature_unit: 'f',
    submitter_name: 'A Diver',
    submitter_email: 'diver@example.org',
    photographer_name: 'Photo Person',
    photographer_email: 'photo@example.org',
    inform_other: 'guide@example.org, science@example.org',
    comments: 'Calm approach.',
    consent: 'agreed',
  };
  Object.entries(values).forEach(([key, value]) => form.set(key, value));
  form.append('behavior', 'feeding_surface');
  form.append('behavior', 'other_sharks');
  form.append('injury_regions', 'dorsal_fin_1');
  form.append('injury_regions', 'flank');
  form.append('injury_types', 'fresh_wound');
  form.append('injury_types', 'rope_net');
  return form;
}

describe('public sighting observations', () => {
  test('parses typed values, repeated chips, emails, and consent from a report form', () => {
    const observations = parsePublicObservationForm(fullObservationForm(), species, new Date('2026-08-22T02:30:00.000Z'));

    expect(observations).toMatchObject({
      observed_date: '2026-08-14',
      observed_time: '14:30',
      site_id: 'tofo',
      decimal_latitude: -15.9423,
      length: { value: 25, unit: 'ft', estimated: true },
      behavior: ['feeding_surface', 'other_sharks'],
      injuries: {
        severity: 'major',
        regions: ['dorsal_fin_1', 'flank'],
        types: ['fresh_wound', 'rope_net'],
        description: 'trailing rope on right side',
      },
      temperature: { value: 80, unit: 'f' },
      inform_other: ['guide@example.org', 'science@example.org'],
      consented_at: '2026-08-22T02:30:00.000Z',
    });
  });

  test('treats an unchecked estimated toggle as a measured length', () => {
    const form = fullObservationForm();
    form.delete('length_estimated');
    const observations = parsePublicObservationForm(form, species, new Date('2026-08-22T02:30:00.000Z'));

    expect(observations.length).toEqual({
      value: 25,
      unit: 'ft',
      estimated: false,
    });
    expect(buildWildbookRow({ species, observations, locationId: 'Tofo', sightingId: 'single-1', mediaFilenames: ['IMG.JPG'] })['Encounter.measurement.length.samplingProtocol']).toBe('samplingProtocol1');
  });

  test('merges batch-level details with one animal group and produces a compact researcher hint', () => {
    const shared = parsePublicObservationForm(fullObservationForm(), species, new Date('2026-08-22T02:30:00.000Z'));
    const animal = { sex: 'female', life_stage: 'juvenile', injuries: { severity: 'minor', regions: ['flank'], types: ['healed_scar'], description: '' } };
    const merged = mergePublicObservations(shared, animal);

    expect(merged.sex).toBe('female');
    expect(merged.submitter_email).toBe('diver@example.org');
    expect(publicObservationHint(merged)).toBe('Female · 7.6 m estimated · minor injuries reported');
  });

  test('keeps shared dive details when a parsed per-animal form omits those fields', () => {
    const shared = parsePublicObservationForm(fullObservationForm(), species, new Date('2026-08-22T02:30:00.000Z'));
    const animalForm = new FormData();
    animalForm.set('observation:sex', 'female');
    animalForm.set('observation:life_stage', 'juvenile');
    animalForm.set('observation:living_status', 'alive');
    animalForm.set('observation:injury_severity', 'none');
    const animalFields = ['sex', 'life_stage', 'length', 'behavior', 'living_status', 'injury_severity', 'injury_regions', 'injury_types', 'injury_description'];
    const animal = parsePublicObservationForm(animalForm, species, new Date('2026-08-22T02:30:00.000Z'), {
      prefix: 'observation:',
      groups: ['about_shark', 'injuries'],
      fieldIds: animalFields,
    });

    expect(mergePublicObservations(shared, animal)).toMatchObject({
      observed_date: '2026-08-14',
      site_id: 'tofo',
      submitter_name: 'A Diver',
      submitter_email: 'diver@example.org',
      consented_at: '2026-08-22T02:30:00.000Z',
      inform_other: ['guide@example.org', 'science@example.org'],
      sex: 'female',
      life_stage: 'juvenile',
    });
  });

  test('preserves the original consent timestamp when a saved report is edited', () => {
    const original = parsePublicObservationForm(fullObservationForm(), species, new Date('2026-08-20T00:00:00.000Z'));
    const edited = parsePublicObservationForm(fullObservationForm(), species, new Date('2026-08-22T00:00:00.000Z'));
    expect(preserveConsentTimestamp(edited, original).consented_at).toBe('2026-08-20T00:00:00.000Z');
  });

  test('builds the authoritative full Sharkbook bulk-import row', () => {
    const observations = parsePublicObservationForm(fullObservationForm(), species, new Date('2026-08-22T02:30:00.000Z'));

    expect(buildWildbookRow({
      species,
      observations,
      locationId: 'Tofo',
      sightingId: 'batch-42',
      mediaFilenames: ['IMG_4471.JPG', 'IMG_4472.JPG'],
    })).toEqual({
      'Encounter.genus': 'Rhincodon',
      'Encounter.specificEpithet': 'typus',
      'Encounter.year': '2026',
      'Encounter.month': '8',
      'Encounter.day': '14',
      'Encounter.hour': '14',
      'Encounter.minutes': '30',
      'Encounter.locationID': 'Tofo',
      'Encounter.verbatimLocality': 'Clownfish Reef',
      'Encounter.decimalLatitude': '-15.9423',
      'Encounter.decimalLongitude': '40.7481',
      'Encounter.depth': '18',
      'Encounter.sex': 'male',
      'Encounter.lifeStage': 'adult',
      'Encounter.livingStatus': 'alive',
      'Encounter.behavior': 'Feeding at surface; With other sharks',
      'Encounter.distinguishingScar': 'Major: Fresh wound; Rope or net marks on Dorsal fin, 1st; Flank — reporter: trailing rope on right side',
      'Encounter.measurement.length': '7.62',
      'Encounter.measurement.length.samplingProtocol': 'samplingProtocol0',
      'Encounter.measurement.temperature': '26.7',
      'Encounter.measurement.temperature.samplingProtocol': 'samplingProtocol1',
      'Encounter.researcherComments': 'Calm approach.\nPhotographer: Photo Person.',
      'Sighting.individualCount': '3',
      'Encounter.sightingID': 'batch-42',
      'Encounter.submitterName': 'A Diver',
      'Encounter.submitter.emailAddress': 'diver@example.org',
      'Encounter.photographer.emailAddress': 'photo@example.org',
      'Encounter.informOther.emailAddress': 'guide@example.org,science@example.org',
      'Encounter.mediaAsset': 'IMG_4471.JPG,IMG_4472.JPG',
    });
  });

  test('reports missing required fields for the groups an endpoint accepts', () => {
    const empty = parsePublicObservationForm(new FormData(), species, new Date('2026-08-22T02:30:00.000Z'));
    const complete = parsePublicObservationForm(fullObservationForm(), species, new Date('2026-08-22T02:30:00.000Z'));

    expect(validatePublicObservations(empty, species, ['about_you'])).toEqual([
      'Your name',
      'Your email',
      'Photo use',
    ]);
    expect(validatePublicObservations(complete, species)).toEqual([]);
  });

  test('requires a free-text place only when Other is selected', () => {
    const other = fullObservationForm();
    other.set('site_id', 'other');
    other.delete('verbatim_locality');
    const listed = fullObservationForm();
    listed.delete('verbatim_locality');

    expect(validatePublicObservations(parsePublicObservationForm(other, species), species)).toContain('Where were you?');
    expect(validatePublicObservations(parsePublicObservationForm(listed, species), species)).not.toContain('Where were you?');
  });

  test('rejects unknown options, out-of-range values, invalid dates, times, emails, and units', () => {
    const form = fullObservationForm();
    form.set('sex', 'robot');
    form.set('decimal_latitude', '100');
    form.set('observed_date', '2026-02-31');
    form.set('observed_time', '25:90');
    form.set('submitter_email', 'not-an-email');
    form.set('length_unit', 'cubits');
    form.set('individual_count', '1.5');

    expect(validatePublicObservations(parsePublicObservationForm(form, species), species)).toEqual(expect.arrayContaining([
      'Sex',
      'Latitude',
      'Encounter date',
      'Time',
      'Your email',
      'Total length',
      'Number of sharks seen on this dive',
    ]));
  });

  test('resolves dynamic field values and option sources for the schema-driven form', () => {
    const observations = parsePublicObservationForm(fullObservationForm(), species, new Date('2026-08-22T02:30:00.000Z'));
    const fields = species.public_report.groups.flatMap((group) => group.fields);

    expect(publicObservationFieldValue(observations, 'length')).toBe(25);
    expect(publicObservationFieldValue(observations, 'consent')).toBe('agreed');
    expect(publicObservationFieldValue(observations, 'injury_regions')).toEqual(['dorsal_fin_1', 'flank']);
    expect(publicReportFieldOptions(species, fields.find((field) => field.id === 'site_id')!, [{ id: 'tofo', label: 'Tofo, Mozambique' }])).toEqual([
      { id: 'tofo', label: 'Tofo, Mozambique' },
      { id: 'other', label: 'Other / not listed' },
    ]);
    expect(publicReportFieldOptions(species, fields.find((field) => field.id === 'injury_regions')!, [])[0]).toEqual({ id: 'head', label: 'Head' });
  });

  test('loads only complete observation JSON objects from storage', () => {
    expect(parseStoredPublicObservations('{"sex":"male","behavior":[],"injuries":{"regions":[],"types":[]},"inform_other":[]}')).toMatchObject({ sex: 'male' });
    expect(parseStoredPublicObservations('{bad')).toBeUndefined();
    expect(parseStoredPublicObservations('[]')).toBeUndefined();
  });

  test('omits locationID for an unlisted place while keeping verbatim locality', () => {
    const form = fullObservationForm();
    form.set('site_id', 'other');
    const observations = parsePublicObservationForm(form, species);
    const row = buildWildbookRow({ species, observations, locationId: '', sightingId: 'single-other', mediaFilenames: ['IMG.JPG'] });
    expect(row).not.toHaveProperty('Encounter.locationID');
    expect(row['Encounter.verbatimLocality']).toBe('Clownfish Reef');
  });

  test('parses only the requested per-animal fields for a bulk group', () => {
    const observations = parsePublicObservationForm(fullObservationForm(), species, new Date('2026-08-22T02:30:00.000Z'), {
      groups: ['about_shark', 'injuries'],
      fieldIds: ['sex', 'life_stage', 'length', 'behavior', 'living_status', 'injury_severity', 'injury_regions', 'injury_types', 'injury_description'],
    });

    expect(observations.sex).toBe('male');
    expect(observations.living_status).toBe('alive');
    expect(observations.individual_count).toBeUndefined();
    expect(observations.injuries.severity).toBe('major');
    expect(validatePublicObservations(observations, species, ['about_shark', 'injuries'], [
      'sex', 'life_stage', 'length', 'behavior', 'living_status', 'injury_severity', 'injury_regions', 'injury_types', 'injury_description',
    ])).toEqual([]);
  });
});
