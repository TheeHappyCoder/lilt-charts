export const teamHandoffs = [
  { from: 'Design', to: 'Build', count: 84 },
  { from: 'Design', to: 'Research', count: 26 },
  { from: 'Build', to: 'Review', count: 68 },
  { from: 'Review', to: 'Design', count: 32 },
  { from: 'Review', to: 'Launch', count: 46 },
  { from: 'Research', to: 'Build', count: 38 },
  { from: 'Launch', to: 'Research', count: 20 },
];
export const handoffsWithGaps = teamHandoffs.map((row, i) => ({
  ...row,
  count: i === 2 ? null : i === 4 ? 0 : row.count,
}));

const rankMonths = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'];
export const productLeague = [
  { product: 'Orbit', scores: [92, 88, 84, 90, 96, 98] },
  { product: 'Field', scores: [72, 86, 94, 96, 90, 93] },
  { product: 'Forma', scores: [86, 92, 90, 85, 82, 88] },
  { product: 'Muse', scores: [65, 70, 78, 86, 92, 96] },
  { product: 'Dawn', scores: [78, 76, 72, 74, 80, 84] },
].flatMap(({ product, scores }) =>
  scores.map((score, i) => ({ product, month: rankMonths[i]!, score })),
);
export const leagueWithGaps = productLeague.map((row, i) => ({
  ...row,
  score: i === 8 || i === 9 || i === 21 ? null : row.score,
}));

export const serviceEvents = Array.from({ length: 30 }, (_, i) => ({
  event: `Run ${String(i + 1).padStart(2, '0')}`,
  at: new Date(
    Date.UTC(2026, 8, 28, Math.floor(i / 6) * 24 + [2, 6, 9, 12, 16, 21][i % 6]!),
  ).toISOString(),
  service: ['API', 'Workers', 'Edge'][i % 3]!,
  requests: 12 + ((i * 17) % 80),
}));
export const eventBurst = serviceEvents.map((row, i) => ({
  ...row,
  at: i > 15 && i < 22 ? new Date(Date.UTC(2026, 8, 30, 14, (i - 16) * 8)).toISOString() : row.at,
  requests: i === 18 ? 180 : row.requests,
}));

export const customerCloud = Array.from({ length: 72 }, (_, i) => ({
  account: `Account ${String(i + 1).padStart(2, '0')}`,
  sessions: Math.round([28, 78, 60][i % 3]! + Math.sin(i * 2.39996) * (3 + (i % 13))),
  actions: Math.round([38, 70, 22][i % 3]! + Math.cos(i * 1.71) * (3 + (i % 11))),
  seats: 1 + (i % 8),
}));

export const productProfiles = [
  { product: 'Orbit', speed: 92, quality: 88, cost: 42, reach: 75 },
  { product: 'Field', speed: 72, quality: 96, cost: 68, reach: 90 },
  { product: 'Forma', speed: 86, quality: 74, cost: 28, reach: 60 },
  { product: 'Muse', speed: 65, quality: 92, cost: 56, reach: 98 },
  { product: 'Dawn', speed: 78, quality: 80, cost: 35, reach: 72 },
];
export const profilesWithGaps = productProfiles.map((row, i) => ({
  ...row,
  quality: i === 1 ? null : row.quality,
  cost: i === 3 ? null : row.cost,
}));
