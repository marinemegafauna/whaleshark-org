---
page: provenance
chips:
  score1: Check provenance
  score2: Possible edit / AI
  score3: Likely AI or synthetic
  credentials: Content Credentials
guidance: A flag means look closer, not reject. Camera data is often removed by screenshots, messaging apps and social-media downloads.
detailsHeading: Provenance check
batchFlagged: "{flagged} of {total} photos flagged for provenance — review before submitting"
metadata:
  heading: Metadata seen
  makeModel: Camera
  software: Software
  date: Captured
  dimensions: Dimensions
  none: No camera details were readable.
signals:
  no_exif: No camera data
  no_camera: Camera make/model missing
  ai_software: AI-generation software declared
  c2pa_ai: Content Credentials describe AI-generated media
  c2pa_present: Content Credentials
  heavy_edit: Edited with no camera origin remaining
  png_or_webp: PNG or WebP upload
  ai_dimensions: Common generated-image dimensions
  stripped_thumbnail: Embedded camera thumbnail missing
  unreadable: Metadata could not be read
  no_shark_detected: No whale shark detected
  implausible_match: Implausibly perfect catalogue match
  duplicate_in_batch: Exact duplicate in this batch
  known_catalogue_image: Exact image already received
aiTools:
  - midjourney
  - dall-e
  - dall·e
  - stable diffusion
  - stability ai
  - firefly
  - imagen
  - gemini
  - chatgpt
  - openai
  - ideogram
  - leonardo
  - flux
  - runway
  - sora
  - nano banana
  - ai generated
---
