/** Data for the Cool charts film: the same stories the docs pages tell. */

export const yearContributions = Array.from({ length: 365 }, (_, index) => ({
  date: new Date(Date.UTC(2025, 9, 8 + index)).toISOString().slice(0, 10),
  commits:
    index % 7 >= 5
      ? index % 11 === 0
        ? 3
        : 0
      : Math.round(14 * Math.max(0, Math.sin(index / 6) * Math.sin(index / 19)) ** 2) +
        ((index * 37) % 4),
}));

export const regionSales = ['North', 'East', 'South', 'West'].flatMap((region, row) =>
  ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'].map((month, column) => ({
    region,
    month,
    sales: 20 + ((column * 7 + row * 11) % 13) * 6 + column * 4,
  })),
);

export const weekdayTraffic = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].flatMap(
  (day, row) =>
    Array.from({ length: 24 }, (_, hour) => ({
      day,
      hour: String(hour).padStart(2, '0') + ':00',
      visits: Math.round(
        (row < 5 ? 900 : 520) * Math.exp(-(((hour - (row < 5 ? 14 : 16)) / 4) ** 2)) +
          (row < 5 ? 420 * Math.exp(-(((hour - 9) / 1.6) ** 2)) : 0) +
          40 +
          ((hour * 13 + row * 7) % 9) * 6,
      ),
    })),
);

export const dailySteps = Array.from({ length: 1004 }, (_, index) => ({
  date: new Date(Date.UTC(2024, 0, 1 + index)).toISOString().slice(0, 10),
  steps: Math.round(
    6500 -
      2500 * Math.cos((index / 365.25) * Math.PI * 2) +
      ((index * 7919) % 2400) +
      (index % 7 === 5 ? 3000 : 0),
  ),
}));

export const serverLoad = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].flatMap((day, row) =>
  Array.from({ length: 12 }, (_, slot) => ({
    day,
    hour: String(slot * 2).padStart(2, '0') + ':00',
    load: Math.round(
      12 +
        (row < 5 ? 70 : 34) * Math.exp(-(((slot - 6.5) / 2.2) ** 2)) +
        (row === 2 ? 18 * Math.exp(-(((slot - 4) / 1.2) ** 2)) : 0),
    ),
  })),
);

export const storeRevenue = [
  { store: 'Soho', region: 'London', revenue: 98 },
  { store: 'Shoreditch', region: 'London', revenue: 76 },
  { store: 'Camden', region: 'London', revenue: 61 },
  { store: 'Brixton', region: 'London', revenue: 44 },
  { store: 'Mitte', region: 'Berlin', revenue: 83 },
  { store: 'Kreuzberg', region: 'Berlin', revenue: 69 },
  { store: 'Neukölln', region: 'Berlin', revenue: 38 },
  { store: 'Marais', region: 'Paris', revenue: 88 },
  { store: 'Pigalle', region: 'Paris', revenue: 57 },
  { store: 'Bastille', region: 'Paris', revenue: 49 },
  { store: 'Belleville', region: 'Paris', revenue: 31 },
  { store: 'Jordaan', region: 'Amsterdam', revenue: 64 },
  { store: 'De Pijp', region: 'Amsterdam', revenue: 52 },
  { store: 'Noord', region: 'Amsterdam', revenue: 27 },
];

export const teamTime = [
  { work: 'Building', hours: 412 },
  { work: 'Reviews', hours: 188 },
  { work: 'Meetings', hours: 141 },
  { work: 'Support', hours: 96 },
  { work: 'Planning', hours: 63 },
];

export const teamHandoffs = [
  { from: 'Design', to: 'Build', count: 84 },
  { from: 'Design', to: 'Research', count: 26 },
  { from: 'Build', to: 'Review', count: 68 },
  { from: 'Review', to: 'Design', count: 32 },
  { from: 'Review', to: 'Launch', count: 46 },
  { from: 'Research', to: 'Build', count: 38 },
  { from: 'Launch', to: 'Research', count: 20 },
];

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

export const serviceEvents = Array.from({ length: 30 }, (_, i) => ({
  event: `Run ${String(i + 1).padStart(2, '0')}`,
  at: new Date(
    Date.UTC(2026, 8, 28, Math.floor(i / 6) * 24 + [2, 6, 9, 12, 16, 21][i % 6]!),
  ).toISOString(),
  service: ['API', 'Workers', 'Edge'][i % 3]!,
  requests: 12 + ((i * 17) % 80),
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
