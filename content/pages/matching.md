---
page: matching
seo:
  title: Photo-ID matching · whaleshark.org
  description: Review local photo-ID batches and record decisions and scars.
heading: Photo-ID matching
empty: Build and import a local batch, then open it here. Decisions stay in local D1 until you export them.
commands:
  - 'npm run matching:build -- --report <report.json> --id <id> --title "<title>" --site <site>'
  - 'npm run matching:import -- local-data/matching/batches/<id>.json'
  - 'npm run matching:demo -- <id>'
ui:
  open: Open batch →
  imported: Imported
  progress: '{decided} / {total} decided'
  all: All
  likely: Likely
  possible: Possible
  undecided: Undecided
  prefetch: Prefetch all
  prefetchProgress: '{n} of {total}'
  prefetchDone: '{n} of {total} cached · {failed} unavailable'
  download: Download decisions
  newSighting: New sighting
  sharkbook: Open in Sharkbook ↗
  refresh: Refresh photos
  duplicate: Possible duplicate upload
  cosine: cosine
  margin: margin
  tier: tier
  flank: flank
  unknown: Unknown
  noPhotos: No photos available for this sighting.
  embedded: Photos from the batch file — may be incomplete
  unavailable: Sharkbook did not answer. Any batch photos are shown below; try refreshing.
  candidateUnavailable: Candidate sightings unavailable; try refreshing.
  sightings: '{n} sightings (+{hidden} more in Sharkbook)'
  matched: Matched sighting
  pick: Select a new-sighting photo to compare.
  picked: Now click a candidate photo.
  new: New shark
  same: 'Same as {label}'
  cantTell: Can't tell
  notes: Notes
  scarNotes: Quick scar notes
  save: Save
  saved: Saved
  notSaved: 'Not saved ({status})'
  dirty: Not saved
  recordScars: Record scars for this sighting →
  scarBadge: '{n} structured scars · {status}'
  back: ← Back to matching
  nextUndecided: Next undecided →
  previous: ← Previous
  next: Next →
  compare: Compare side by side
  compareHelp: 'Scroll to zoom · drag to pan · double-click to fit · ←/→ candidate · Shift+←/→ new sighting · 1–9 candidate · Esc close'
  close: Close (Esc)
  fit: Fit
  idArea: ID area
  whole: Whole photo
  photoCount: '{n} of {total}'
classes:
  likely: Likely
  possible: Possible
  weak: Weak
  none: No likely match
  no_fingerprint: No fingerprint
reviewStatuses:
  needs_record: Needs a scar record
  recorded: Recorded
  no_new_scars: No new scars
  examined_clean: Examined, no scars
  not_examined: Photographed, not examined
views:
  left: Left
  right: Right
  other: Other
  no box: No box
  unknown: Unknown
---
