---
page: contribute
seo:
  title: Contribute · whaleshark.org
  description: Request a feature, report a problem, follow open site requests, or propose a code change.
title: Contribute
eyebrow: Improve whaleshark.org
lede: Tell the site team what would make the work clearer or easier. Connected requests become public GitHub issues so their progress stays visible.
github:
  pageLine: "Page: {url}"
  footer: "Filed from whaleshark.org by Sharkbook user `{username}` · site `{site}` · {date}"
form:
  heading: File a request
  kindLabel: Request type
  kinds:
    - { id: feature, label: Feature request }
    - { id: problem, label: Problem }
  titleLabel: Title
  titlePlaceholder: A short, specific summary
  descriptionLabel: What do you need, and why?
  descriptionHelp: Include the outcome you need and enough detail for someone else to understand it.
  pageUrlLabel: Page or URL where it happened
  pageUrlHelp: Optional
  submitLabel: Send request
  statuses:
    created: Your request is now on GitHub.
    createdLinkLabel: Open the issue ↗
    stored: "Requests aren't connected to GitHub on this site yet — [email the site team](mailto:{contactEmail}). Your request has still been saved."
    rateLimited: You have already sent a request in the past minute. Wait a moment, then try again.
    invalid: Add a request type, title and description, then try again.
issues:
  heading: Open requests
  body: Requests filed from the site stay visible here while they are open.
  count: "{count} open"
  empty: There are no open site requests.
  unavailable: Open requests could not be loaded from GitHub just now.
  kindLabels:
    feature: Feature request
    problem: Problem
    request: Request
  unknownUser: Unknown GitHub user
  opened: "opened by {username} · {date}"
  openLinkLabel: Open on GitHub ↗
propose:
  heading: Propose a change
  body: The code and the editable content are public. A pull request is a proposed set of changes in GitHub; maintainers can read the exact diff, discuss it and merge it without giving contributors direct access to the live site.
  links:
    - { label: whaleshark.org repository ↗, href: "https://github.com/marinemegafauna/whaleshark-org" }
    - { label: Template guide ↗, href: "https://github.com/marinemegafauna/whaleshark-org/blob/main/docs/TEMPLATE.md" }
---
