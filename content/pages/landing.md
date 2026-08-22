---
page: landing
seo:
  title: whaleshark.org · Help identify a whale shark
  description: Upload a whale shark photo, find its Sharkbook match, and add a sighting to the global research record.
hero:
  eyebrow: The community front door to Sharkbook
  heading: Every whale shark has a fingerprint. Help us read it.
  body: The spots on a whale shark’s flank are unique for life. Photograph them and we can tell you which shark you met, where it has been seen before, and whether it’s new to science. Every photo joins the world’s largest shark photo-identification database.
  actions:
    - { label: Drop a photo, href: "#drop-photo", style: primary }
    - { label: Upload a whole dive, href: /bulk, style: secondary }
    - { label: Browse the sharks, href: "https://www.sharkbook.ai", style: link }
  note: Free, no account needed. Your name stays on your photo.
  image:
    image: /landing/hero-whale-shark-mafia.jpg
    alt: Whale shark swimming near the surface at Mafia Island, Tanzania
  detectionLabel: LEFT FLANK · MATCHED MZ-284 · 0.68
  liveMatch:
    image: /landing/hero-whale-shark-mafia.jpg
    alt: Detail of the matched whale shark’s spot pattern
    heading: MZ-284 · first seen Tofo, 2019
    body: 14 sightings · last seen 14 Aug 2026 · once at Mafia Island, 1,800 km away
    label: live match
upload:
  eyebrow: Start with one clear image
  heading: Drop a left-flank photo here
  choosePrefix: or
  chooseLabel: choose a file
  formats: JPEG, HEIC or RAW
  help: Your name stays on your photo. Nothing is published without you.
  buttonLabel: Compare my photo
  bulkPrompt: Have a whole dive’s worth?
  bulkLabel: Bulk upload →
  bulkStartingLabel: Starting bulk upload…
  errors:
    missingPhoto: Choose a photo to continue.
    unavailable: We couldn’t start the upload. Please try again.
stats:
  ariaLabel: Sharkbook catalogue statistics
  labels:
    individuals: Known whale sharks
    encounters: Sightings on Sharkbook
    encountersYtd: Sightings so far in {year}
    allIndividuals: Sharks of all species on Sharkbook
  liveCaption: live from sharkbook.ai
  cachedCaption: sharkbook.ai counts as of {month}
why:
  eyebrow: Why it matters
  heading: Whale sharks are endangered. Photos are how we count them.
  body: You can’t tag every shark in the ocean. But a photo of the spots behind the left gills identifies an animal for the rest of its life, without touching it. Enough photos, over enough years, and we can see what a population is doing.
  cards:
    - icon: eye
      heading: How many are there
      body: Re-sightings of known sharks against new ones tell us population size and whether it is rising or falling at each site.
    - icon: movement
      heading: Where they go
      body: The same shark photographed in Mozambique and Tanzania is a movement record no satellite tag was needed for.
    - icon: shield
      heading: What hurts them
      body: Scars from propellers and nets, recorded to one standard at every site, show whether protection is working.
how:
  eyebrow: How it works
  heading: Three steps, and you get the shark’s story back.
  moreLink: { label: Read how the whole system works →, href: /how-it-works }
  steps:
    - number: "01"
      heading: Photograph the left side
      body: Behind the gills, above the pectoral fin, as square-on as you can. Phone, GoPro or camera all work. Right side is a bonus.
      image:
        image: /landing/step-photograph-left-side.jpg
        alt: Diver photographing the left side of a whale shark behind its gills
    - number: "02"
      heading: We match the spots
      body: Sharkbook’s algorithm compares your shark’s pattern with every known whale shark and ranks the closest matches with a confidence score.
      image:
        image: /landing/step-spot-pattern.jpg
        alt: Whale shark spot pattern behind the gills used for photo identification
    - number: "03"
      heading: Researchers confirm it
      body: The team at that site checks the match. You get the shark’s history, and an email every time it’s seen again.
      placeholderLabel: SCREENSHOT · shark history page
where:
  image:
    image: /landing/where-mafia-baitball.jpg
    alt: Whale shark feeding beneath a bait ball at Mafia Island, Tanzania
  eyebrow: Where the sharks are
  heading: One database, every ocean.
  body: Sharkbook holds whale shark records from dozens of sites. whaleshark.org starts with the Western Indian Ocean network, where research teams and dive operators run the season-by-season science.
  sitesAriaLabel: Whale shark research sites
  extraSites: [Ningaloo, Galápagos, "La Paz, Mexico", Donsol, Maldives]
  manyMoreLabel: + many more
community:
  eyebrow: Built on open tools
  heading: Built on Sharkbook. Open to everyone.
  body: Sharkbook.ai is Wild Me's open-source Wildbook platform for sharks — the world's largest shark photo-ID database, built over two decades by thousands of contributors. whaleshark.org is an open front door to it for whale sharks, and the code is open source so other species can have one too.
  resources:
    - { term: Matching, description: Sharkbook.ai / Wild Me }
    - { term: Your photos, description: Yours. Credited. Never sold. }
    - { term: Code, description: github.com/marinemegafauna/whaleshark-org, href: "https://github.com/marinemegafauna/whaleshark-org" }
footerLinks:
  - { label: Privacy, href: "#privacy" }
  - { label: Data use, href: "#data-use" }
  - { label: Contact, href: "#contact" }
---
