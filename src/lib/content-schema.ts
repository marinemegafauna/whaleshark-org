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

const bulkSchema = z.object({
  page: z.literal('bulk'),
  seo: seoSchema,
  intro: z.object({ eyebrow: text, heading: text, body: text }).strict(),
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
  errors: z.object({ refresh: text, upload: text }).strict(),
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
  heading: z.object({ eyebrow: text, title: template, fallbackAnimal: text, body: text }).strict(),
  decisions: z.object({ confirm: text, none: text, uncertain: text }).strict(),
  candidates: z.object({ imageAlt: text, gapLabel: text, showMore: text }).strict(),
  actions: z.object({ confirm: template, notSure: text, none: text }).strict(),
  researcherNote: template,
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
    labels: z.object({ encounters: text, individuals: text, newThisSeason: text, scarRecords: text, freshMajor: text }).strict(),
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
    stats: z.object({ needsRecord: text, recordedWeek: text, freshMajor: text, matchesAwaiting: text, batchesAwaiting: text }).strict(),
    queue: z.object({ eyebrow: text, heading: text, help: text, counts: template, review: text }).strict(),
    tableHeaders: z.array(text).length(7),
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

export const pageCollectionSchema = z.discriminatedUnion('page', [
  landingSchema,
  bulkSchema,
  matchSchema,
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
  publicNav: z.array(z.object({ key: z.enum(['catalogue', 'match', 'sites', 'photographers', 'about']), label: text, href: text }).strict()),
  researchSites: z.array(z.object({ id: text, label: text }).strict()),
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

export const speciesSchema = z.object({
  id: text,
  version: text,
  common_name: text,
  scientific_name: text,
  wildbook_taxonomy: text,
  fields: z.array(speciesFieldSchema).min(1),
}).strict().superRefine((species, context) => {
  const seen = new Set<string>();
  for (const field of species.fields) {
    if (seen.has(field.id)) context.addIssue({ code: 'custom', message: `Duplicate field id "${field.id}"` });
    seen.add(field.id);
  }
});

export type PageCopy = z.infer<typeof pageCollectionSchema>;
export type PageId = PageCopy['page'];
export type PageCopyFor<T extends PageId> = Extract<PageCopy, { page: T }>;
export type SiteContent = z.infer<typeof siteContentSchema>;
export type SpeciesOption = z.infer<typeof speciesOptionSchema>;
export type SpeciesField = z.infer<typeof speciesFieldSchema>;
export type Species = z.infer<typeof speciesSchema>;
