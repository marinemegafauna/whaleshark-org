---
title: How it works
eyebrow: The system behind the site
lede: whaleshark.org is a front end. The catalogue, the matching and the science records live on Sharkbook, an open-source platform used by researchers around the world. Here is how the pieces fit — and how to build a site like this for another species.
sections:
  - id: sharkbook
    heading: Sharkbook is the database
    body: |
      Sharkbook.ai is the Wildbook for sharks: a shared, online photo-identification library where researchers and members of the public log sightings, and individual animals are catalogued and tracked over their lives. It started as the ECOCEAN Whale Shark Photo-identification Library — the original whaleshark.org — and today holds more than 25,000 identified sharks, roughly 150,000 reported sightings, and contributions from over 11,000 citizen scientists and 500 researchers and volunteers.

      Wildbook is the open-source software underneath it, developed by Wild Me, now a lab within the non-profit Conservation X Labs. The same platform runs catalogues for whales, manta rays, giraffes, zebras, sea turtles and dozens of other species. The code is public on GitHub (GPL-2.0), and each species community keeps ownership and control of its own data.
  - id: records
    heading: What a record is
    body: |
      Wildbook keeps three kinds of record. An **encounter** is one animal at one time and place — your photo, the date, the site, and anything you noted. A **sighting** groups the encounters from the same outing, so a dive with three sharks is one sighting and three encounters. A **marked individual** is a named animal: every encounter that has been confirmed as that animal, which is how a shark's history — first seen, last seen, everywhere in between — gets built up.

      Inside each encounter, the photos carry **annotations**: the box around the animal, which side is showing, and the pattern the algorithms work from.
  - id: matching
    heading: How a photo becomes a match
    body: |
      When a photo arrives, Wildbook first runs **detection** — a neural network finds the shark in the frame, draws a box around it, labels the species and works out the viewpoint (left flank, right flank, and so on). Only then does **identification** run.

      For whale sharks the main identifier is **MiewID**, a deep-learning model that turns the spot pattern behind the gills into a numerical fingerprint and compares it with every other left- or right-flank fingerprint in the catalogue. Sharkbook also keeps the **modified Groth** spot-pattern matcher that started it all — an algorithm adapted from the one astronomers use to match star fields, first applied to whale sharks in 2005. Other species on Wildbook use other tools (PIE for mantas and whales, HotSpotter for textured patterns, CurvRank for fin edges); the platform chooses per species.

      The result is a ranked list of candidates with similarity scores. The number that matters is not the score itself but the gap between the first candidate and the next different animal: a clear gap is a confident re-sight, a crowded top is a "please look closely".
  - id: humans
    heading: People make the final call
    body: |
      No match is accepted automatically. A researcher at the site looks at the candidate pair side by side and confirms or rejects it. That is the step that turns "probably MZ-284" into a line in MZ-284's history, and it is why a sighting you upload may take a little while to appear.

      Scars and injuries are recorded the same way — by a person, against a standard vocabulary — so that sites can be compared.
  - id: this-site
    heading: What whaleshark.org adds
    body: |
      Sharkbook's own interface is built for researchers managing many species. whaleshark.org is a simpler front door for one: drop a photo or a whole dive, see the ranked matches in plain language, and — for the research teams — record scars to one shared standard. Everything it shows comes from Sharkbook through its public API, and everything it records goes back there or is linked to it. Nothing lives only here.
  - id: open-source
    heading: Open source — build one for your species
    body: |
      This site is open source, and it is deliberately a template. The code is on GitHub at **github.com/marinemegafauna/whaleshark-org**. The whale-shark-specific parts — the scar vocabulary, the sites, the words on the pages, the logos — live in configuration and content files, not in the code. Point it at your own Wildbook (any instance running the version-3 API), describe your species in one file, change the text, and you have a front end for manta rays, leopard sharks, sea turtles or whatever you study.

      Wildbook and MiewID are Wild Me's work. If you build on this, please credit them, and consider contributing back — both here and to Wildbook itself.
credits:
  - label: Matching and catalogue
    value: Sharkbook.ai — Wildbook, by Wild Me / Conservation X Labs
  - label: Whale shark identification
    value: MiewID and the modified Groth spot-pattern algorithm
  - label: This front end
    value: Open source (MIT), maintained by the Marine Megafauna Foundation
  - label: Counts
    value: Sharkbook.ai, August 2026
---
