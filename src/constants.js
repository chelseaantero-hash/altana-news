/** Category labels (aligned with lib/feeds-config CAT_META). */
export const CAT_META = {
  'white-house': { label: 'White House', color: '#E8401C' },
  congress: { label: 'Congress & Hearings', color: '#C49A2A' },
  'federal-register': { label: 'Federal Register', color: '#2563EB' },
  dhs: { label: 'DHS & Border', color: '#94A3B8' },
  'state-dept': { label: 'State Department', color: '#16A34A' },
  treasury: { label: 'Treasury / OFAC', color: '#E8401C' },
  commerce: { label: 'Commerce / BIS', color: '#C49A2A' },
  dod: { label: 'DOD & Pentagon', color: '#2563EB' },
  trade: { label: 'Trade & Tariffs', color: '#94A3B8' },
  'supply-chain': { label: 'Supply Chain', color: '#16A34A' },
  sanctions: { label: 'Sanctions & Compliance', color: '#E8401C' },
  geopolitics: { label: 'Geopolitics', color: '#C49A2A' },
  china: { label: 'China', color: '#2563EB' },
  'tech-ai': { label: 'Tech & AI', color: '#16A34A' },
  finance: { label: 'Finance & Markets', color: '#E8401C' },
  energy: { label: 'Energy & Commodities', color: '#C49A2A' },
  defense: { label: 'Defense Industry', color: '#2563EB' },
  'dc-politics': { label: 'DC Politics & Appointments', color: '#94A3B8' },
  'intl-reg': { label: 'Intl Regulatory', color: '#16A34A' },
};

/** Grouped for navigation UI; order matches previous flat CAT_ORDER. */
export const CAT_GROUPS = [
  { label: 'Overview', ids: ['all'] },
  {
    label: 'US Government',
    ids: ['white-house', 'congress', 'federal-register', 'dhs', 'state-dept'],
  },
  {
    label: 'Economy & security',
    ids: ['treasury', 'commerce', 'dod', 'trade', 'supply-chain', 'sanctions'],
  },
  {
    label: 'Global & markets',
    ids: ['geopolitics', 'china', 'tech-ai', 'finance', 'energy', 'defense', 'dc-politics', 'intl-reg'],
  },
];

export const CAT_ORDER = CAT_GROUPS.flatMap((g) => g.ids);
