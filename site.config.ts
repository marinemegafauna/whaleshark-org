const siteConfig = {
  name: 'whaleshark.org',
  steward: 'Marine Megafauna Foundation',
  wildbookBaseUrl: import.meta.env.WILDBOOK_BASE_URL ?? 'https://www.sharkbook.ai',
  species: ['whale-shark'],
  // TODO: map these placeholders to the real Wildbook locationId values.
  sites: [
    { id: 'tofo', label: 'Tofo, Mozambique', locationIds: ['Tofo'] },
    { id: 'mafia-island', label: 'Mafia Island, Tanzania', locationIds: ['Mafia Island'] },
    { id: 'nosy-be', label: 'Nosy Be, Madagascar', locationIds: ['Nosy Be'] },
    { id: 'oman', label: 'Oman', locationIds: ['Oman'] },
    { id: 'seychelles', label: 'Seychelles', locationIds: ['Seychelles'] },
  ],
} as const;

export default siteConfig;
