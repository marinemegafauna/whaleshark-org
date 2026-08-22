const siteConfig = {
  name: 'whaleshark.org',
  steward: 'Marine Megafauna Foundation',
  wildbookBaseUrl: import.meta.env.WILDBOOK_BASE_URL ?? 'https://www.sharkbook.ai',
  species: ['whale-shark'],
  // TODO: map these placeholders to the real Wildbook locationId values.
  // locationIds are the literal Wildbook `locationId` values on sharkbook.ai (sampled 2026-08-22 from
  // the 3,000 most recent whale shark encounters). Sharkbook's sites are coarser than ours — Mafia Island
  // encounters carry locationId 'Tanzania'.
  sites: [
    { id: 'tofo', label: 'Tofo, Mozambique', locationIds: ['Tofo', 'Mozambique'] },
    { id: 'mafia-island', label: 'Mafia Island, Tanzania', locationIds: ['Tanzania'] },
    { id: 'nosy-be', label: 'Nosy Be, Madagascar', locationIds: ['Madagascar'] },
    { id: 'oman', label: 'Oman', locationIds: ['Oman', 'Muscat', 'Daymaniyat Islands'] },
    { id: 'seychelles', label: 'Seychelles', locationIds: ['Seychelles'] },
  ],
} as const;

export default siteConfig;
