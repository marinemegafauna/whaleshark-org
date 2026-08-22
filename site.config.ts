const siteConfig = {
  wildbookBaseUrl: import.meta.env.WILDBOOK_BASE_URL ?? 'https://www.sharkbook.ai',
  species: ['whale-shark'],
  // TODO: map these placeholders to the real Wildbook locationId values.
  // locationIds are the literal Wildbook `locationId` values on sharkbook.ai (sampled 2026-08-22 from
  // the 3,000 most recent whale shark encounters). Sharkbook's sites are coarser than ours — Mafia Island
  // encounters carry locationId 'Tanzania'.
  sites: [
    { id: 'tofo', locationIds: ['Tofo', 'Mozambique'] },
    { id: 'mafia-island', locationIds: ['Tanzania'] },
    { id: 'nosy-be', locationIds: ['Madagascar'] },
    { id: 'oman', locationIds: ['Oman', 'Muscat', 'Daymaniyat Islands'] },
    { id: 'seychelles', locationIds: ['Seychelles'] },
  ],
} as const;

export default siteConfig;
