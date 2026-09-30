---
page: app
seo:
  workbenchTitle: Encounters · whaleshark.org
  workbenchDescription: Review whale shark encounters, matching queues, and scar records.
  scarTitle: Scar record · {individual}
  scarDescription: Record standardized whale shark scar observations for a Sharkbook encounter.
header:
  menuLabel: Menu
  navAriaLabel: Application navigation
  nav:
    - { key: matching, label: Matching, href: /app/matching }
    - { key: encounters, label: Encounters, href: /app }
    - { key: individuals, label: Individuals }
    - { key: scars, label: Scar records }
    - { key: matches, label: Matches to confirm }
    - { key: exports, label: Exports }
    - { key: practice, label: Practice, href: /app/practice }
    - { key: contribute, label: Contribute, href: /app/contribute }
    - { key: collaboration, label: Collaboration, href: /app/collaboration }
  connectedLabel: SHARKBOOK · CONNECTED
  accountName: Clare Prebble
rail:
  sitesHeading: Sites
  sitesAriaLabel: Research sites
  seasonHeading: Season · {year}
  labels:
    encounters: Encounters
    namedIndividuals: Named individuals · page
    needsRecord: Need a scar record · page
    unnamed: Unnamed · page
    scarRecords: Scar records
  schemaHeading: Schema
  schemaName: Whale shark scars
workbench:
  heading: Encounters · {site}
  helper: Pulled from Sharkbook 4 min ago · showing this season · {count} still need a scar record
  searchLabel: Search
  searchPlaceholder: Search encounter or shark ID
  statusAriaLabel: Scar record status
  statusOptions: [Needs scar record, "Has Sharkbook scar text, no structured record", All encounters]
  exportButton: Export CSV
  stats:
    encounters: Encounters
    namedIndividuals: Named individuals · page
    scarText: Scar text to categorise
    noStructuredRecord: No structured record
    unnamed: Unnamed · new sharks
    batchesAwaiting: Batches awaiting review
    pageCaption: on this page
  unavailable: Sharkbook didn't answer — showing nothing, try again
  queue:
    eyebrow: Public bulk uploads
    heading: Batches awaiting review
    help: Match groupings need a final check before publication.
    counts: "{photos} photos · {animals} animals"
    review: Review →
  publicQueue:
    eyebrow: Public sighting reports
    heading: Reports awaiting a Sharkbook link
    help: Dry-run reports remain visible here until reviewed publication is enabled.
    singleLabel: Single photo
    batchLabel: Whole dive
    open: Open report →
  tableHeaders: [Encounter, Individual, Date · photographer, Sex · size, Photos, Provenance, Scar record, " "]
  sightings: "· {count} sightings"
  newLabel: · new
  unassignedPending: Unassigned · match pending
  noNewScars: No new scars
  examinedClean: Examined · clean
  notExamined: Not examined
  recorded: Recorded
  needsRecord: Needs record
  textChip: text
  view: View
  recordScars: Record scars →
  showing: Showing {shown} of {total} encounters this season
  next: Next →
  cardsAriaLabel: Encounters
  unassigned: Unassigned
  cardLabels:
    datePhotographer: Date · photographer
    sexSize: Sex · size
    photos: Photos
  viewRecord: View scar record →
  publicNotesLabel: Public notes
scar:
  breadcrumb: "{site} · Encounters · {encounter}"
  heading: Scar record · {individual} · {date}
  unassigned: Unassigned
  metadata: "{sex} · {size} · {sightings} sightings since 2019"
  schemaLabel: SCHEMA whale-shark-scars v{version}
  openSharkbook: Open on Sharkbook ↗
  saved: Scar saved to this encounter.
  photoTabs:
    left: Left flank
    right: Right flank
    dorsal: Dorsal
    allPhotos: All {count} photos
    help: Tap the photo to place a scar
  imageAlt: Flank photo of {individual}
  tableHeaders: ["#", Body region, Anthropogenic, Threat / cause, Severity, Confidence, First seen]
  thisEncounter: This encounter
  newScarHelp: New scar — fill in the panel on the right
  cardsAriaLabel: Recorded scars
  scarLabel: Scar {number}
  draftLabel: Draft
  draftHelp: New scar — fill in the form below.
  recordHelp: Fields follow the MMF whale shark scar-classification method (v0.1). Terminology lives in the species schema file in the repo — change it once, every site’s form changes.
  examined:
    heading: No scars on this encounter?
    help: Record the explicit zero — tick the regions you actually looked at. Without it nobody can tell “no scar” from “nobody looked”.
    regionsLabel: Regions examined
    cleanButton: Examined · no scars
    notExaminedButton: Photographed, not examined
    recorded: "Examined, no scars — {regions}"
    notExaminedRecorded: Photographed, not examined
    regionsError: Tick at least one region you examined before saving the explicit zero.
  finishNext: Finish record · next encounter →
  placementPending: Left flank · click photo to place
  placementDone: Left flank · placed
  notesPlaceholder: Why you coded it this way; anything ambiguous
  descriptionPlaceholder: The observer’s own words, unedited
  linkedLabel: Linked to Sharkbook encounter
  discard: Discard
  save: Save scar
  finish: Finish record
  pull:
    heading: What Sharkbook already says
    empty: No scar text, life stage, length or behaviour is recorded on Sharkbook.
    distinguishingScar: Distinguishing scar
    relatedText: Scar-related note
    recorded: "Recorded on whaleshark.org:"
    categorise: Categorise this
    lifeStage: Life stage
    length: Length
    behavior: Behaviour
  sync:
    label: Sharkbook
    upToDate: "Sharkbook: up to date"
    pending: "Sharkbook: {count} pending"
    disabled: Write-back to Sharkbook is off for this site; records are kept here.
    statuses:
      pending: Pending
      synced: Synced
      failed: Not yet on Sharkbook
      disabled: Local only
    retry: Retry
---
