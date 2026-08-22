import { z } from 'zod';
import siteConfig from '../../site.config';

const text = z.string().min(1);
const template = z.string().min(1);
const linkSchema = z.object({ label: text, href: text }).strict();
const imageSchema = z.object({ image: text, alt: text }).strict();
const seoSchema = z.object({ title: text, description: text }).strict();

const landingSchema = z.object({
  page: z.literal('landing'),
  seo: seoSchema,
  hero: z.object({
    eyebrow: text,
    heading: text,
    body: text,
    actions: z.array(z.object({ label: text, href: text, style: z.enum(['primary', 'secondary', 'link']) }).strict()).min(1),
    note: text,
    image: imageSchema,
    detectionLabel: text,
    liveMatch: z.object({ image: text, alt: text, heading: text, body: text, label: text }).strict(),
  }).strict(),
  upload: z.object({
    eyebrow: text,
    heading: text,
    choosePrefix: text,
    chooseLabel: text,
    formats: text,
    help: text,
    buttonLabel: text,
    bulkPrompt: text,
    bulkLabel: text,
    bulkStartingLabel: text,
    errors: z.object({ missingPhoto: text, unavailable: text }).strict(),
  }).strict(),
  stats: z.object({
    ariaLabel: text,
    labels: z.object({ individuals: text, encounters: text, encountersYtd: template, allIndividuals: text }).strict(),
    liveCaption: text,
    cachedCaption: template,
  }).strict(),
  why: z.object({
    eyebrow: text,
    heading: text,
    body: text,
    cards: z.array(z.object({ icon: z.enum(['eye', 'movement', 'shield']), heading: text, body: text }).strict()).min(1),
  }).strict(),
  how: z.object({
    eyebrow: text,
    heading: text,
    moreLink: linkSchema,
    steps: z.array(z.object({
      number: text,
      heading: text,
      body: text,
      image: imageSchema.optional(),
      placeholderLabel: text.optional(),
    }).strict()).min(1),
  }).strict(),
  where: z.object({
    image: imageSchema,
    eyebrow: text,
    heading: text,
    body: text,
    sitesAriaLabel: text,
    extraSites: z.array(text),
    manyMoreLabel: text,
  }).strict(),
  community: z.object({
    eyebrow: text,
    heading: text,
    body: text,
    resources: z.array(z.object({ term: text, description: text, href: text.optional() }).strict()).min(1),
  }).strict(),
  footerLinks: z.array(linkSchema),
}).strict();

const howItWorksSchema = z.object({
  page: z.literal('how-it-works').default('how-it-works'),
  title: text,
  eyebrow: text,
  lede: text,
  sections: z.array(z.object({ id: text, heading: text, body: text }).strict()).min(1),
  credits: z.array(z.object({ label: text, value: text }).strict()).min(1),
}).strict();

const bulkSchema = z.object({
  page: z.literal('bulk'),
  seo: seoSchema,
  intro: z.object({ eyebrow: text, heading: text, body: text, diagnosticNotice: text }).strict(),
  upload: z.object({ dropHeading: text, help: text, choosePhotos: text, chooseFolder: text, uploadedImageAlt: text }).strict(),
  summary: z.object({
    photoCount: template,
    size: template,
    progress: template,
    matched: text,
    likelyNew: text,
    noShark: text,
    working: text,
  }).strict(),
  grid: z.object({ grouped: template, empty: text, addMore: text }).strict(),
  batchCard: z.object({
    heading: text,
    help: text,
    siteLabel: text,
    dateLabel: text,
    dateSourcePending: text,
    dateSourcePhoto: text,
    photographerLabel: text,
    photographerPlaceholder: text,
    emailLabel: text,
    emailHelp: text,
    emailPlaceholder: text,
    readyLabel: text,
    publishNote: text,
    reviewButton: text,
    confirmationHelp: text,
    sightingHeading: text,
    sightingHelp: text,
  }).strict(),
  statuses: z.object({
    matchedFallback: text,
    likelyNew: template,
    noShark: text,
    error: text,
    matching: text,
    detecting: text,
    uploading: text,
    queued: text,
  }).strict(),
  errors: z.object({ refresh: text, upload: text, sharedDetails: text }).strict(),
  review: z.object({
    seoTitle: template,
    eyebrow: text,
    headingSubmitted: text,
    headingPending: template,
    introSubmitted: text,
    introPending: text,
    recordedLabel: text,
    backHome: text,
    knownLabel: text,
    newLabel: text,
    photoCountSingular: template,
    photoCountPlural: template,
    bestScore: template,
    withinBatchScore: template,
    uploadedPhotoAlt: template,
    candidateAlt: template,
    candidateHelp: text,
    decisionAria: template,
    confirmKnown: template,
    confirmNew: text,
    notSure: text,
    none: text,
    submitHeading: text,
    summaryLabels: z.object({ site: text, date: text, photographer: text, animalGroups: text, noShark: text, needsHelp: text }).strict(),
    submitButton: text,
    backToPhotos: text,
    submitHelp: text,
    perAnimalHeading: text,
    perAnimalHelp: text,
    missingAnimalFields: text,
  }).strict(),
}).strict();

const matchSchema = z.object({
  page: z.literal('match'),
  seo: z.object({ title: template, description: text }).strict(),
  photo: z.object({
    imageAlt: text,
    detectionLabel: text,
    fileLabel: text,
    photographedBy: text,
    editDetails: text,
    explanation: text,
  }).strict(),
  heading: z.object({ eyebrow: text, title: template, fallbackAnimal: text, body: text, pendingEyebrow: text, pendingTitle: text, pendingBody: text }).strict(),
  decisions: z.object({ confirm: text, none: text, uncertain: text }).strict(),
  candidates: z.object({ imageAlt: text, gapLabel: text, showMore: text, pending: text }).strict(),
  actions: z.object({ confirm: template, notSure: text, none: text }).strict(),
  researcherNote: template,
  report: z.object({
    heading: text,
    help: text,
    saved: text,
    missing: template,
    emailPreviewHeading: text,
    emailPreviewLabel: template,
  }).strict(),
}).strict();

const signinSchema = z.object({
  page: z.literal('signin'),
  seo: seoSchema,
  heading: text,
  intro: text,
  mockLabel: text,
  mockHelp: text,
  errors: z.object({ missing: text, rejected: text }).strict(),
  emailLabel: text,
  emailPlaceholder: text,
  passwordLabel: text,
  passwordPlaceholder: text,
  buttonLabel: text,
  links: z.array(linkSchema),
  footnote: text,
}).strict();

const provenanceSignalSchema = z.object({
  no_exif: text,
  no_camera: text,
  ai_software: text,
  c2pa_ai: text,
  c2pa_present: text,
  heavy_edit: text,
  png_or_webp: text,
  ai_dimensions: text,
  stripped_thumbnail: text,
  unreadable: text,
  no_shark_detected: text,
  implausible_match: text,
  duplicate_in_batch: text,
  known_catalogue_image: text,
}).strict();

const provenanceSchema = z.object({
  page: z.literal('provenance'),
  chips: z.object({ score1: text, score2: text, score3: text, credentials: text }).strict(),
  guidance: text,
  detailsHeading: text,
  batchFlagged: template,
  metadata: z.object({ heading: text, makeModel: text, software: text, date: text, dimensions: text, none: text }).strict(),
  signals: provenanceSignalSchema,
  aiTools: z.array(text).min(1),
}).strict();

const appSchema = z.object({
  page: z.literal('app'),
  seo: z.object({ workbenchTitle: text, workbenchDescription: text, scarTitle: template, scarDescription: text }).strict(),
  header: z.object({
    menuLabel: text,
    navAriaLabel: text,
    nav: z.array(text),
    connectedLabel: text,
    accountName: text,
  }).strict(),
  rail: z.object({
    sitesHeading: text,
    sitesAriaLabel: text,
    seasonHeading: template,
    labels: z.object({ encounters: text, namedIndividuals: text, needsRecord: text, unnamed: text, scarRecords: text }).strict(),
    schemaHeading: text,
    schemaName: text,
  }).strict(),
  workbench: z.object({
    heading: template,
    helper: template,
    searchLabel: text,
    searchPlaceholder: text,
    statusAriaLabel: text,
    statusOptions: z.array(text),
    exportButton: text,
    stats: z.object({ encounters: text, namedIndividuals: text, needsRecord: text, unnamed: text, batchesAwaiting: text }).strict(),
    unavailable: text,
    queue: z.object({ eyebrow: text, heading: text, help: text, counts: template, review: text }).strict(),
    publicQueue: z.object({ eyebrow: text, heading: text, help: text, singleLabel: text, batchLabel: text, open: text }).strict(),
    tableHeaders: z.array(text).length(8),
    sightings: template,
    newLabel: text,
    unassignedPending: text,
    noNewScars: text,
    recorded: text,
    needsRecord: text,
    view: text,
    recordScars: text,
    showing: template,
    next: text,
    cardsAriaLabel: text,
    unassigned: text,
    cardLabels: z.object({ datePhotographer: text, sexSize: text, photos: text }).strict(),
    viewRecord: text,
    publicNotesLabel: text,
  }).strict(),
  scar: z.object({
    breadcrumb: template,
    heading: template,
    unassigned: text,
    metadata: template,
    schemaLabel: template,
    openSharkbook: text,
    saved: text,
    photoTabs: z.object({ left: text, right: text, dorsal: text, allPhotos: template, help: text }).strict(),
    imageAlt: template,
    tableHeaders: z.array(text).length(7),
    thisEncounter: text,
    newScarHelp: text,
    cardsAriaLabel: text,
    scarLabel: template,
    draftLabel: text,
    draftHelp: text,
    recordHelp: text,
    noNewScars: text,
    finishNext: text,
    placementPending: text,
    placementDone: text,
    notesPlaceholder: text,
    linkedLabel: text,
    discard: text,
    save: text,
    finish: text,
  }).strict(),
}).strict();

export const pageCollectionSchema = z.union([
  landingSchema,
  bulkSchema,
  howItWorksSchema,
  matchSchema,
  provenanceSchema,
  signinSchema,
  appSchema,
]);

export const siteContentSchema = z.object({
  name: text,
  tagline: text,
  steward: text,
  defaultDescription: text,
  brandHomeAriaLabel: text,
  menuLabel: text,
  signInLabel: text,
  publicNavAriaLabel: text,
  partnerAriaLabel: text,
  howItWorksUi: z.object({ contentsLabel: text, creditsHeading: text, build: linkSchema, currentStageNotice: text }).strict(),
  publicNav: z.array(z.object({ key: z.enum(['catalogue', 'match', 'how', 'sites', 'photographers', 'about']), label: text, href: text }).strict()),
  researchSites: z.array(z.object({ id: text, label: text }).strict()),
  partners: z.array(z.object({ name: text, logo: text, url: text, alt: text }).strict()).min(1),
  footerText: text,
  footerNavAriaLabel: text,
  photoCredits: z.array(z.object({ image: text, credit: text }).strict()),
}).strict().superRefine((site, context) => {
  const displayIds = site.researchSites.map((researchSite) => researchSite.id).sort();
  const technicalIds = siteConfig.sites.map((researchSite) => researchSite.id).sort();
  if (displayIds.length !== technicalIds.length || displayIds.some((id, index) => id !== technicalIds[index])) {
    context.addIssue({
      code: 'custom',
      path: ['researchSites'],
      message: `Display site ids must match technical site ids exactly (${technicalIds.join(', ')})`,
    });
  }
});

const speciesOptionSchema = z.object({
  id: text,
  label: text,
  help: text.optional(),
  swatch: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  emphasis: z.boolean().optional(),
}).strict();

const speciesFieldSchema = z.object({
  id: text,
  label: text,
  type: z.enum(['text']).optional(),
  help: text.optional(),
  required: z.boolean(),
  default: z.string().optional(),
  options: z.array(speciesOptionSchema).optional(),
}).strict().superRefine((field, context) => {
  if (field.type !== 'text' && !field.options?.length) context.addIssue({ code: 'custom', message: `Field "${field.id}" must define options` });
  if (field.type === 'text' && field.options) context.addIssue({ code: 'custom', message: `Text field "${field.id}" cannot define options` });
  const seen = new Set<string>();
  for (const option of field.options ?? []) {
    if (seen.has(option.id)) context.addIssue({ code: 'custom', message: `Duplicate option id "${option.id}" in field "${field.id}"` });
    seen.add(option.id);
  }
  if (field.default && !field.options?.some((option) => option.id === field.default)) {
    context.addIssue({ code: 'custom', message: `Default "${field.default}" is not an option for field "${field.id}"` });
  }
});

const publicReportOptionSchema = z.object({
  id: text,
  label: text,
}).strict();

const publicReportFieldSchema = z.object({
  id: text,
  label: text,
  type: z.enum(['select', 'chips', 'text', 'number', 'textarea', 'date', 'email']),
  required: z.boolean(),
  help: text.optional(),
  placeholder: text.optional(),
  autocomplete: text.optional(),
  multiple: z.boolean().optional(),
  default: z.union([z.string(), z.number(), z.boolean()]).optional(),
  options: z.array(publicReportOptionSchema).optional(),
  options_source: z.enum(['sites', 'body_region']).optional(),
  units: z.array(publicReportOptionSchema).optional(),
  default_unit: text.optional(),
  estimated_toggle: text.optional(),
  estimated_default: z.boolean().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  step: z.number().positive().optional(),
  show_when: z.object({ field: text, equals: text.optional(), not_equals: text.optional() }).strict().optional(),
}).strict().superRefine((field, context) => {
  if ((field.type === 'select' || field.type === 'chips') && !field.options?.length && !field.options_source) {
    context.addIssue({ code: 'custom', message: `Public report field "${field.id}" must define options or options_source` });
  }
  if (field.type !== 'number' && (field.units || field.default_unit || field.estimated_toggle || field.estimated_default !== undefined)) {
    context.addIssue({ code: 'custom', message: `Only number field "${field.id}" can define units or an estimated toggle` });
  }
  if (field.show_when?.equals && field.show_when.not_equals) {
    context.addIssue({ code: 'custom', message: `Public report field "${field.id}" cannot use both equals and not_equals` });
  }
});

const publicReportSchema = z.object({
  version: text,
  submit_label: text,
  saved_label: text,
  choose_label: text,
  units_label: template,
  groups: z.array(z.object({
    id: text,
    label: text,
    help: text.optional(),
    fields: z.array(publicReportFieldSchema).min(1),
  }).strict()).min(1),
}).strict();

export const speciesSchema = z.object({
  id: text,
  version: text,
  common_name: text,
  scientific_name: text,
  wildbook_taxonomy: text,
  fields: z.array(speciesFieldSchema).min(1),
  public_report: publicReportSchema,
}).strict().superRefine((species, context) => {
  const seen = new Set<string>();
  for (const field of species.fields) {
    if (seen.has(field.id)) context.addIssue({ code: 'custom', message: `Duplicate field id "${field.id}"` });
    seen.add(field.id);
  }
  const publicIds = new Set<string>();
  for (const group of species.public_report.groups) {
    for (const field of group.fields) {
      if (publicIds.has(field.id)) context.addIssue({ code: 'custom', message: `Duplicate public report field id "${field.id}"` });
      publicIds.add(field.id);
    }
  }
});

export type PageCopy = z.infer<typeof pageCollectionSchema>;
export type PageId = PageCopy['page'];
export type PageCopyFor<T extends PageId> = Extract<PageCopy, { page: T }>;
export type SiteContent = z.infer<typeof siteContentSchema>;
export type SpeciesOption = z.infer<typeof speciesOptionSchema>;
export type SpeciesField = z.infer<typeof speciesFieldSchema>;
export type PublicReportField = z.infer<typeof publicReportFieldSchema>;
export type PublicReport = z.infer<typeof publicReportSchema>;
export type Species = z.infer<typeof speciesSchema>;
