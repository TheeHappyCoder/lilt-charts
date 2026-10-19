/**
 * Data for the market families: quotes, a market map, a fund's monthly closes, earnings, a
 * Treasury curve, and signup cohorts. Every value is generated deterministically, so the preview
 * and the copied code agree to the cent.
 */

const round = (value: number, places = 2) => Math.round(value * 10 ** places) / 10 ** places;

/** A smooth, repeatable walk: no randomness, so server and client render the same path. */
const walk = (count: number, start: number, end: number, wobble: number, phase: number) =>
  Array.from({ length: count }, (_, index) => {
    const t = index / (count - 1);
    const trend = start + (end - start) * t;
    const swing =
      Math.sin(index * 0.9 + phase) * wobble + Math.sin(index * 0.37 + phase * 2) * wobble * 0.6;
    return round(trend + swing * (1 - t * 0.35));
  });

interface Quote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  history: number[];
  low: number;
  high: number;
}

const quote = (
  symbol: string,
  name: string,
  open: number,
  price: number,
  wobble: number,
  phase: number,
): Quote => {
  const history = walk(24, open, price, wobble, phase);
  history[history.length - 1] = price;
  return {
    symbol,
    name,
    price,
    change: round(price / open - 1, 4),
    history,
    low: round(Math.min(...history) * 0.997),
    high: round(Math.max(...history) * 1.003),
  };
};

/** Six tokens over the day, with their intraday path and range. */
export const tokenWatchlist: Quote[] = [
  quote('SOL', 'Solana', 197.2, 205.56, 2.4, 0.4),
  quote('ETH', 'Ethereum', 3152.4, 3114.78, 21, 1.1),
  quote('BTC', 'Bitcoin', 63_480, 64_912.5, 380, 2.2),
  quote('JUP', 'Jupiter', 0.94, 1.02, 0.018, 0.8),
  quote('LINK', 'Chainlink', 14.62, 14.21, 0.16, 1.9),
  quote('AVAX', 'Avalanche', 27.8, 28.04, 0.4, 2.7),
];

/** Large-cap stocks, a smaller list without a range column. */
export const stockWatchlist: Quote[] = [
  quote('AAPL', 'Apple', 228.1, 231.42, 1.6, 0.3),
  quote('MSFT', 'Microsoft', 437.9, 431.08, 2.8, 1.4),
  quote('NVDA', 'NVIDIA', 121.4, 126.9, 1.4, 2.1),
  quote('AMZN', 'Amazon', 186.2, 188.75, 1.2, 0.9),
];

/** One trading day of a market: each company's weight and move, by sector. */
export const marketDay = [
  ['AAPL', 'Technology', 3480, 0.0124],
  ['MSFT', 'Technology', 3210, -0.0042],
  ['NVDA', 'Technology', 3050, 0.0331],
  ['AVGO', 'Technology', 780, 0.0186],
  ['ORCL', 'Technology', 470, -0.0118],
  ['AMZN', 'Consumer', 1960, 0.0071],
  ['TSLA', 'Consumer', 780, -0.0412],
  ['HD', 'Consumer', 390, 0.0035],
  ['MCD', 'Consumer', 210, -0.0061],
  ['JPM', 'Financials', 620, 0.0093],
  ['V', 'Financials', 560, 0.0022],
  ['MA', 'Financials', 450, -0.0017],
  ['BAC', 'Financials', 310, 0.0148],
  ['LLY', 'Health', 820, -0.0237],
  ['UNH', 'Health', 540, 0.0054],
  ['JNJ', 'Health', 390, -0.0029],
  ['XOM', 'Energy', 520, 0.0211],
  ['CVX', 'Energy', 290, 0.0167],
].map(([symbol, sector, cap, change]) => ({
  symbol: symbol as string,
  sector: sector as string,
  cap: (cap as number) * 1e9,
  change: change as number,
}));

/** Tokens without sectors: one level, each tile its own. */
export const tokenMarket = tokenWatchlist.map((token, index) => ({
  symbol: token.symbol,
  cap: [96, 374, 1280, 1.4, 8.6, 11.2][index]! * 1e9,
  change: token.change,
}));

/** A fund's net asset value at each month end, January 2024 to September 2026. */
export const fundCloses = Array.from({ length: 33 }, (_, index) => {
  const month = new Date(Date.UTC(2024, index + 1, 0));
  const growth = 1 + index * 0.0115;
  const cycle = Math.sin(index * 0.85) * 0.035 + Math.sin(index * 0.31 + 1) * 0.05;
  return { month, nav: round(100 * (growth + cycle)) };
});

/** The same fund with no prices in two months, as when a feed went down. */
export const fundClosesWithGap = fundCloses.filter((_, index) => index !== 20 && index !== 21);

/** Earnings per share against the consensus, eight reported quarters and one to come. */
export const quarterlyEarnings = [
  ["Q3 '24", 1.38, 1.45],
  ["Q4 '24", 1.52, 1.61],
  ["Q1 '25", 1.47, 1.42],
  ["Q2 '25", 1.55, 1.63],
  ["Q3 '25", 1.64, 1.71],
  ["Q4 '25", 1.78, 1.74],
  ["Q1 '26", 1.71, 1.83],
  ["Q2 '26", 1.86, 1.94],
  ["Q3 '26", 1.97, null],
].map(([quarter, estimate, actual]) => ({
  quarter: quarter as string,
  estimate: estimate as number,
  actual: actual as number | null,
}));

/** A company still losing money: estimates and results below zero, the losses narrowing. */
export const narrowingLosses = [
  ["Q3 '25", -0.42, -0.38],
  ["Q4 '25", -0.35, -0.36],
  ["Q1 '26", -0.31, -0.24],
  ["Q2 '26", -0.22, -0.17],
  ["Q3 '26", -0.14, null],
].map(([quarter, estimate, actual]) => ({
  quarter: quarter as string,
  estimate: estimate as number,
  actual: actual as number | null,
}));

/** Treasury yields by maturity, in percent: today, a month ago, and a year ago. */
export const treasuryCurve = [
  ['1M', 5.31, 5.28, 5.52],
  ['3M', 5.24, 5.25, 5.55],
  ['6M', 5.05, 5.11, 5.49],
  ['1Y', 4.71, 4.83, 5.31],
  ['2Y', 4.38, 4.52, 5.04],
  ['3Y', 4.19, 4.33, 4.78],
  ['5Y', 4.07, 4.2, 4.51],
  ['7Y', 4.11, 4.22, 4.46],
  ['10Y', 4.19, 4.28, 4.41],
  ['20Y', 4.48, 4.55, 4.66],
  ['30Y', 4.41, 4.47, 4.55],
].map(([maturity, today, monthAgo, yearAgo]) => ({
  maturity: maturity as string,
  today: today as number,
  monthAgo: monthAgo as number,
  yearAgo: yearAgo as number,
}));

/** A normal, upward curve: longer money yields more. */
export const upwardCurve = [
  ['3M', 3.42],
  ['6M', 3.51],
  ['1Y', 3.6],
  ['2Y', 3.74],
  ['5Y', 3.98],
  ['10Y', 4.26],
  ['30Y', 4.61],
].map(([maturity, today]) => ({ maturity: maturity as string, today: today as number }));

const cohortRow = (
  cohort: string,
  users: number,
  start: number,
  decay: number,
  reached: number,
) => ({
  cohort,
  users,
  ...Object.fromEntries(
    Array.from({ length: 8 }, (_, period) => [
      `m${period}`,
      period >= reached ? null : period === 0 ? 1 : round(start * decay ** (period - 1), 3),
    ]),
  ),
});

/** Monthly signup cohorts and the share of each still active, month by month. */
export const signupCohorts = [
  cohortRow('Feb 2026', 1840, 0.46, 0.86, 8),
  cohortRow('Mar 2026', 2110, 0.48, 0.87, 7),
  cohortRow('Apr 2026', 1960, 0.44, 0.85, 6),
  cohortRow('May 2026', 2480, 0.51, 0.88, 5),
  cohortRow('Jun 2026', 2730, 0.53, 0.88, 4),
  cohortRow('Jul 2026', 2390, 0.55, 0.89, 3),
  cohortRow('Aug 2026', 2950, 0.57, 0.9, 2),
  cohortRow('Sep 2026', 3120, 1, 1, 1),
] as {
  cohort: string;
  users: number;
  m0: number | null;
  m1: number | null;
  m2: number | null;
  m3: number | null;
  m4: number | null;
  m5: number | null;
  m6: number | null;
  m7: number | null;
}[];

/** Weekly cohorts for a newer product: smaller groups, without sizes. */
export const weeklyCohorts = Array.from({ length: 6 }, (_, index) => ({
  week: `Week ${index + 31}`,
  ...Object.fromEntries(
    Array.from({ length: 6 }, (_, period) => [
      `w${period}`,
      period >= 6 - index
        ? null
        : period === 0
          ? 1
          : round((0.62 + index * 0.02) * 0.82 ** (period - 1), 3),
    ]),
  ),
})) as {
  week: string;
  w0: number | null;
  w1: number | null;
  w2: number | null;
  w3: number | null;
  w4: number | null;
  w5: number | null;
}[];

export const marketData = {
  tokenWatchlist,
  stockWatchlist,
  marketDay,
  tokenMarket,
  fundCloses,
  fundClosesWithGap,
  quarterlyEarnings,
  narrowingLosses,
  treasuryCurve,
  upwardCurve,
  signupCohorts,
  weeklyCohorts,
};

/*
 * Periods for the period selects. Switching one plays the card's data change: prices roll,
 * sparklines reshape, tiles travel and re-tint, and marks that leave shrink away.
 */

/** The same six tokens over a day, a week and a month. */
export const watchlistRanges = [
  { id: '1d', label: '1D', data: tokenWatchlist },
  {
    id: '1w',
    label: '1W',
    data: [
      quote('SOL', 'Solana', 182.4, 205.56, 5.1, 1.7),
      quote('ETH', 'Ethereum', 3288.1, 3114.78, 48, 0.2),
      quote('BTC', 'Bitcoin', 61_240, 64_912.5, 820, 1.3),
      quote('JUP', 'Jupiter', 1.11, 1.02, 0.03, 2.4),
      quote('LINK', 'Chainlink', 13.12, 14.21, 0.3, 0.6),
      quote('AVAX', 'Avalanche', 29.9, 28.04, 0.7, 1.1),
    ],
  },
  {
    id: '1m',
    label: '1M',
    data: [
      quote('SOL', 'Solana', 151.8, 205.56, 9.4, 2.8),
      quote('ETH', 'Ethereum', 2894.6, 3114.78, 96, 1.6),
      quote('BTC', 'Bitcoin', 66_820, 64_912.5, 1400, 0.5),
      quote('JUP', 'Jupiter', 0.78, 1.02, 0.05, 1.2),
      quote('LINK', 'Chainlink', 15.4, 14.21, 0.5, 2.2),
      quote('AVAX', 'Avalanche', 24.1, 28.04, 1.1, 0.4),
    ],
  },
];

const marketMoves = (week: number, seed: number) =>
  marketDay.map((row, index) => ({
    ...row,
    cap: Math.round(row.cap * (1 + Math.sin(index * 1.7 + seed) * 0.06 * week)),
    change: round(row.change * 0.6 + Math.sin(index * 2.3 + seed) * 0.018 * week, 4),
  }));

/** The market today, over the week, and over the month: tiles resize and re-tint. */
export const marketRanges = [
  { id: 'today', label: 'Today', data: marketDay },
  { id: 'week', label: 'This week', data: marketMoves(1.4, 0.7) },
  { id: 'month', label: 'This month', data: marketMoves(2.6, 2.1) },
];

/** The fund over three years, the last twelve months, and this year. */
export const fundRanges = [
  { id: '3y', label: '3Y', data: fundCloses },
  { id: '1y', label: '1Y', data: fundCloses.slice(-13) },
  { id: 'ytd', label: 'YTD', data: fundCloses.slice(-10) },
];

/** Two years of quarters, or the last one. */
export const earningsRanges = [
  { id: '2y', label: '2Y', data: quarterlyEarnings },
  { id: '1y', label: '1Y', data: quarterlyEarnings.slice(-5) },
];

const curveAt = (shift: number, twist: number) =>
  treasuryCurve.map((row, index) => ({
    maturity: row.maturity,
    curve: round(row.today + shift + (index - 5) * twist),
    yearEarlier: row.yearAgo,
  }));

/** The curve at three dates, each against the year before it: the inversion eases over time. */
export const curveRanges = [
  { id: 'sep', label: 'Sep 2026', data: curveAt(0, 0) },
  { id: 'jun', label: 'Jun 2026', data: curveAt(0.18, -0.035) },
  { id: 'mar', label: 'Mar 2026', data: curveAt(0.34, -0.07) },
];

/** Eight monthly cohorts, or the latest four. */
export const cohortRanges = [
  { id: '8m', label: '8 months', data: signupCohorts },
  { id: '4m', label: '4 months', data: signupCohorts.slice(-4) },
];

export const marketRangeSets = {
  watchlistRanges,
  marketRanges,
  fundRanges,
  earningsRanges,
  curveRanges,
  cohortRanges,
};
