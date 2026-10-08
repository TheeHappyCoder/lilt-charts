/**
 * Sunday Supply, a fictional apparel and goods store, as of Tuesday 30 September 2026.
 *
 * One deterministic story drives every view and export: steady growth through the summer, a quiet
 * early August, the Autumn drop on Friday 12 September (the store's best week), a payment-provider
 * outage on 19 September, wholesale slowly losing share, and returning customers rising.
 */

const DAY = 86_400_000;
const HISTORY = 180;
const FORECAST = 7;
/** The last full day of data. */
export const STORE_TODAY = new Date(Date.UTC(2026, 8, 30));
const LAUNCH = Date.UTC(2026, 8, 12);
const OUTAGE = Date.UTC(2026, 8, 19);

/** Seeded so server and client render the same numbers. */
function random(seed: number) {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

/** Weekend shoppers: Monday is the quietest day, Friday and Saturday the busiest. */
const WEEKDAY = [1.04, 0.9, 0.95, 0.97, 1.0, 1.1, 1.13];

export const products = [
  { id: 'overshirt', name: 'Field overshirt', category: 'Outerwear', price: 148, tone: 'clay' },
  { id: 'hoodie', name: 'Weekend hoodie', category: 'Fleece', price: 84, tone: 'iris' },
  { id: 'tote', name: 'Canvas tote', category: 'Bags', price: 42, tone: 'sand' },
  { id: 'beanie', name: 'Merino beanie', category: 'Accessories', price: 34, tone: 'sage' },
  { id: 'tee', name: 'Everyday tee', category: 'Basics', price: 32, tone: 'sky' },
  { id: 'socks', name: 'Ribbed socks', category: 'Basics', price: 16, tone: 'rose' },
] as const;
export type ProductId = (typeof products)[number]['id'];

const markets = [
  { country: 'United States', share: 0.41 },
  { country: 'United Kingdom', share: 0.19 },
  { country: 'Germany', share: 0.14 },
  { country: 'Canada', share: 0.11 },
  { country: 'Netherlands', share: 0.08 },
  { country: 'Australia', share: 0.07 },
] as const;

function buildDays() {
  const next = random(20260930);
  const first = STORE_TODAY.getTime() - (HISTORY - 1) * DAY;
  return Array.from({ length: HISTORY }, (_, index) => {
    const time = first + index * DAY;
    const date = new Date(time);
    const progress = index / (HISTORY - 1);
    const sinceLaunch = (time - LAUNCH) / DAY;
    // Growth, a quiet early August, then the launch spike that decays over two weeks.
    const trend = 2850 + 1650 * progress ** 1.15;
    const august = time >= Date.UTC(2026, 7, 1) && time < Date.UTC(2026, 7, 15) ? 0.91 : 1;
    const launch = sinceLaunch >= 0 && sinceLaunch < 16 ? 1 + 0.62 * Math.exp(-sinceLaunch / 4) : 1;
    const outage = time === OUTAGE ? 0.58 : 1;
    const noise = 0.93 + next() * 0.14;
    const revenue =
      Math.round(trend * WEEKDAY[date.getUTCDay()]! * august * launch * outage * noise * 100) / 100;
    const averageOrder =
      58 + progress * 5 + (sinceLaunch >= 0 && sinceLaunch < 16 ? 9 : 0) + next() * 3;
    const orders = Math.max(1, Math.round(revenue / averageOrder));
    const conversion = 0.026 + progress * 0.006 + (launch - 1) * 0.012 + (next() - 0.5) * 0.003;
    const sessions = Math.round(orders / conversion);
    const returning = Math.round(orders * (0.27 + progress * 0.07 + (next() - 0.5) * 0.03));
    // Social grows all season and carries the launch; email spikes on launch weekend.
    const launchLift = launch - 1;
    const traffic = allocate(sessions, [
      0.34 - progress * 0.05,
      0.14 + progress * 0.07 + launchLift * 0.22,
      0.08 + (sinceLaunch >= 0 && sinceLaunch < 3 ? 0.09 : 0),
      0.24,
      0.08 + (next() - 0.5) * 0.02,
    ]);
    const overshirt = sinceLaunch >= 0 ? 0.24 + 0.12 * Math.exp(-sinceLaunch / 6) : 0;
    const productMix = {
      overshirt,
      hoodie: (0.27 + progress * 0.04) * (1 - overshirt),
      tote: 0.2 * (1 - overshirt),
      beanie: (0.08 + progress * 0.08) * (1 - overshirt),
      tee: 0.25 * (1 - overshirt),
      socks: (0.2 - progress * 0.12) * (1 - overshirt),
    } satisfies Record<ProductId, number>;
    return {
      date,
      revenue,
      orders,
      units: Math.round(
        products.reduce(
          (total, product) => total + (revenue * productMix[product.id]) / product.price,
          0,
        ),
      ),
      sessions,
      returning,
      firstTime: orders - returning,
      customers: Math.round(orders * 0.91),
      traffic,
      productMix,
    };
  });
}

export const storeDays = buildDays();
export type StoreDay = (typeof storeDays)[number];
export type StorePeriod = 7 | 30 | 90;
export const storePeriods: readonly StorePeriod[] = [7, 30, 90];

/** The revenue chart's rows: measured days, then a week of forecast with a widening band. */
export interface RevenueRow {
  date: Date;
  revenue: number;
  low: number;
  high: number;
}

/** The hero chart's rows: revenue, with the launch day split out to be drawn in the accent. */
export interface StageRow {
  date: Date;
  revenue: number;
  launch: number;
}

const sum = <Row>(rows: readonly Row[], pick: (row: Row) => number) =>
  rows.reduce((total, row) => total + pick(row), 0);
const change = (current: number, previous: number) => current / previous - 1;

/** Keep allocated parts adding up to the total exactly. */
function allocate(total: number, weights: readonly number[]) {
  const scale = weights.reduce((a, b) => a + b, 0);
  let used = 0;
  return weights.map((weight, index) => {
    const value =
      index === weights.length - 1 ? total - used : Math.round((total * weight) / scale);
    used += value;
    return value;
  });
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** "Fri 12 Sep", the same on every machine. */
export function formatDay(date: Date) {
  return `${WEEKDAYS[date.getUTCDay()]} ${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]}`;
}

/** "24–30 Sep 2026", or "3 Jul – 30 Sep 2026" across months. */
function formatRange(from: Date, to: Date) {
  const end = `${to.getUTCDate()} ${MONTHS[to.getUTCMonth()]} ${to.getUTCFullYear()}`;
  return from.getUTCMonth() === to.getUTCMonth()
    ? `${from.getUTCDate()}–${end}`
    : `${from.getUTCDate()} ${MONTHS[from.getUTCMonth()]} – ${end}`;
}

export function storeSummary(period: StorePeriod) {
  const days = storeDays.slice(-period);
  const previous = storeDays.slice(-period * 2, -period);
  const revenue = Math.round(sum(days, (day) => day.revenue) * 100) / 100;
  const previousRevenue = sum(previous, (day) => day.revenue);
  const orders = sum(days, (day) => day.orders);
  const previousOrders = sum(previous, (day) => day.orders);
  const sessions = sum(days, (day) => day.sessions);
  const previousSessions = sum(previous, (day) => day.sessions);
  const returning = sum(days, (day) => day.returning);
  const best = days.reduce((top, day) => (day.revenue > top.revenue ? day : top));

  const sources = ['Search', 'Social', 'Email', 'Direct', 'Referral'].map((source, index) => ({
    source,
    sessions: sum(days, (day) => day.traffic[index]!),
    change: change(
      sum(days, (day) => day.traffic[index]!),
      sum(previous, (day) => day.traffic[index]!),
    ),
  }));
  const customers = sum(days, (day) => day.customers);
  const previousCustomers = sum(previous, (day) => day.customers);
  const marketCustomers = allocate(
    customers,
    markets.map((market) => market.share),
  );
  const units = sum(days, (day) => day.units);
  const previousUnits = sum(previous, (day) => day.units);

  const productRevenue = products.map((product) =>
    sum(days, (day) => day.revenue * day.productMix[product.id]),
  );
  const productBefore = products.map((product) =>
    sum(previous, (day) => day.revenue * day.productMix[product.id]),
  );
  const productCents = allocate(Math.round(revenue * 100), productRevenue);
  const productUnits = allocate(
    units,
    products.map((product, index) => productRevenue[index]! / product.price),
  );
  const productList = products.map((product, index) => {
    const value = productCents[index]! / 100;
    return {
      ...product,
      revenue: value,
      units: productUnits[index]!,
      share: value / revenue,
      change:
        productBefore[index]! > 0 ? change(productRevenue[index]!, productBefore[index]!) : null,
    };
  });

  // A week ahead from the last two weeks' level, keeping the weekly rhythm.
  const recent = storeDays.slice(-14);
  const level = sum(recent, (day) => day.revenue / WEEKDAY[day.date.getUTCDay()]!) / recent.length;
  const forecast: RevenueRow[] = Array.from({ length: FORECAST }, (_, index) => {
    const date = new Date(STORE_TODAY.getTime() + (index + 1) * DAY);
    const value = Math.round(level * 1.012 ** (index + 1) * WEEKDAY[date.getUTCDay()]!);
    const spread = 0.05 + index * 0.012;
    return {
      date,
      revenue: value,
      low: Math.round(value * (1 - spread)),
      high: Math.round(value * (1 + spread)),
    };
  });
  const revenueRows: RevenueRow[] = [
    // Measured days carry a zero-width band, so the forecast band grows out of the line.
    ...days.map((day) => ({
      date: day.date,
      revenue: day.revenue,
      low: day.revenue,
      high: day.revenue,
    })),
    ...forecast,
  ];

  // The stage: one bar per day; the launch day's revenue sits in its own series so it can be lit.
  const stageRows: StageRow[] = [
    ...days.map((day) => {
      const lit = day.date.getTime() === LAUNCH;
      return { date: day.date, revenue: lit ? 0 : day.revenue, launch: lit ? day.revenue : 0 };
    }),
    ...forecast.map((row) => ({ date: row.date, revenue: row.revenue, launch: 0 })),
  ];

  const dailyGoal = 4600;
  const goal = dailyGoal * period;
  const launchInPeriod = days.some((day) => day.date.getTime() === LAUNCH);

  return {
    period,
    days,
    revenueRows,
    stageRows,
    forecastFrom: forecast[0]!.date,
    forecastTotal: sum(forecast, (row) => row.revenue),
    range: formatRange(days[0]!.date, days.at(-1)!.date),
    revenue,
    revenueChange: change(revenue, previousRevenue),
    orders,
    ordersChange: change(orders, previousOrders),
    sessions,
    sessionsChange: change(sessions, previousSessions),
    conversion: orders / sessions,
    conversionChange: change(orders / sessions, previousOrders / previousSessions),
    averageOrder: revenue / orders,
    averageOrderChange: change(revenue / orders, previousRevenue / previousOrders),
    returning,
    returningShare: returning / orders,
    returningChange: change(
      returning,
      sum(previous, (day) => day.returning),
    ),
    dailyGoal,
    goal,
    best: { date: best.date, revenue: best.revenue, isLaunch: best.date.getTime() === LAUNCH },
    launchInPeriod,
    units,
    unitsChange: change(units, previousUnits),
    customers,
    customersChange: change(customers, previousCustomers),
    sources,
    markets: markets.map((market, index) => ({
      country: market.country,
      customers: marketCustomers[index]!,
    })),
    products: productList,
  };
}
export type StoreSummary = ReturnType<typeof storeSummary>;

export type OrderStatus = 'Paid' | 'Fulfilled' | 'Refunded';

/** The latest orders, newest first, as of 09:41 on the last day. */
export const recentOrders = [
  {
    id: '#4821',
    customer: 'Amara Okafor',
    initials: 'AO',
    items: 'Field overshirt, Merino beanie',
    total: 182,
    minutes: 3,
    status: 'Paid',
  },
  {
    id: '#4820',
    customer: 'Lukas Brandt',
    initials: 'LB',
    items: 'Weekend hoodie',
    total: 78,
    minutes: 11,
    status: 'Paid',
  },
  {
    id: '#4819',
    customer: 'Priya Natarajan',
    initials: 'PN',
    items: 'Canvas tote, Everyday tee ×2',
    total: 106,
    minutes: 26,
    status: 'Fulfilled',
  },
  {
    id: '#4818',
    customer: 'Tom Whitaker',
    initials: 'TW',
    items: 'Field overshirt',
    total: 148,
    minutes: 48,
    status: 'Fulfilled',
  },
  {
    id: '#4817',
    customer: 'Sofia Lindqvist',
    initials: 'SL',
    items: 'Ribbed socks ×3',
    total: 48,
    minutes: 64,
    status: 'Refunded',
  },
  {
    id: '#4816',
    customer: 'Kenji Mori',
    initials: 'KM',
    items: 'Merino beanie, Ribbed socks',
    total: 50,
    minutes: 92,
    status: 'Fulfilled',
  },
] as const satisfies readonly {
  id: string;
  customer: string;
  initials: string;
  items: string;
  total: number;
  minutes: number;
  status: OrderStatus;
}[];

export function storeCsv(days: readonly StoreDay[]) {
  return [
    'Date,Revenue,Orders,First-time orders,Returning orders,Sessions,Conversion rate,Average order value',
    ...days.map((day) =>
      [
        day.date.toISOString().slice(0, 10),
        day.revenue.toFixed(2),
        day.orders,
        day.firstTime,
        day.returning,
        day.sessions,
        (day.orders / day.sessions).toFixed(6),
        (day.revenue / day.orders).toFixed(2),
      ].join(','),
    ),
  ].join('\r\n');
}
