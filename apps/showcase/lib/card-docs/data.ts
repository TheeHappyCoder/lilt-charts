import * as expansionData from './expansion-data';
import * as spatialData from './spatial-data';
import type { CardRange } from '@lilt-ui/charts';
import {
  teamHandoffs,
  handoffsWithGaps,
  productLeague,
  leagueWithGaps,
  serviceEvents,
  eventBurst,
  customerCloud,
  productProfiles,
  profilesWithGaps,
} from './sculpted-data';

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const utcDay = (day: number) => new Date(Date.UTC(2026, 8, day));

export interface VisitorMonth {
  month: string;
  organic: number;
  referral: number;
  paid: number;
}

function visitorsFrom(organic: number[], referral: number[], paid: number[]): VisitorMonth[] {
  return months.map((month, index) => ({
    month,
    organic: organic[index]!,
    referral: referral[index]!,
    paid: paid[index]!,
  }));
}

export const visitors = visitorsFrom(
  [2400, 2800, 3100, 2900, 3600, 4100, 4500, 4300, 4900, 5400, 5800, 6700],
  [1200, 1400, 1500, 1700, 1900, 2100, 2400, 2500, 2600, 2900, 3100, 3500],
  [800, 700, 900, 1100, 1000, 1300, 1400, 1600, 1500, 1800, 2000, 2200],
);

export const lastYearVisitors = visitorsFrom(
  [2100, 2300, 2500, 2600, 2900, 3300, 3500, 3600, 3900, 4200, 4600, 5100],
  [1100, 1200, 1300, 1400, 1500, 1700, 1800, 2000, 2100, 2300, 2500, 2700],
  [900, 900, 1000, 1000, 1100, 1200, 1200, 1300, 1400, 1500, 1600, 1800],
);

export const visitorRanges: CardRange<VisitorMonth>[] = [
  { id: 'year', label: 'This year', data: visitors, delta: 0.184 },
  { id: 'last-year', label: 'Last year', data: lastYearVisitors, delta: 0.062 },
];

export interface RevenueDay {
  date: Date;
  revenue: number;
  previous: number;
}

export const dailyRevenue: RevenueDay[] = [
  [2180, 1950],
  [2340, 2050],
  [2110, 2020],
  [2670, 2140],
  [2510, 2220],
  [2880, 2300],
  [2750, 2250],
  [3090, 2470],
  [2870, 2390],
  [3360, 2680],
  [3190, 2760],
  [3520, 2840],
  [3440, 2920],
  [3710, 3060],
  [3580, 3010],
  [3960, 3180],
  [3820, 3120],
  [4150, 3300],
  [4030, 3260],
  [4420, 3410],
  [4310, 3380],
].map(([revenue, previous], index) => ({
  date: utcDay(index + 1),
  revenue: revenue!,
  previous: previous!,
}));

/** The same revenue, then a week of projections with a range around them. */
export interface ForecastDay {
  date: Date;
  revenue: number;
  low: number | null;
  high: number | null;
}

export const revenueForecast: ForecastDay[] = [
  ...dailyRevenue.map(({ date, revenue }, index, rows) =>
    // The band starts at the last measured day so it grows out of the line.
    index === rows.length - 1
      ? { date, revenue, low: revenue, high: revenue }
      : { date, revenue, low: null, high: null },
  ),
  ...[4480, 4560, 4610, 4700, 4760, 4850, 4920].map((revenue, index) => ({
    date: utcDay(22 + index),
    revenue,
    low: Math.round(revenue * (1 - 0.035 * (index + 1))),
    high: Math.round(revenue * (1 + 0.03 * (index + 1))),
  })),
];

/** Daily active users by platform, with a flat goal line. */
export interface SessionDay {
  date: Date;
  desktop: number;
  mobile: number;
  goal: number;
}

export const dailySessions: SessionDay[] = [
  [1840, 1210],
  [1910, 1290],
  [1780, 1340],
  [2050, 1420],
  [2210, 1390],
  [1690, 1580],
  [1620, 1660],
  [2140, 1610],
  [2260, 1700],
  [2330, 1760],
  [2190, 1850],
  [2410, 1930],
  [1880, 2040],
  [1790, 2120],
  [2380, 2080],
  [2510, 2190],
  [2470, 2260],
  [2620, 2310],
  [2560, 2420],
  [2040, 2530],
  [1960, 2610],
].map(([desktop, mobile], index) => ({
  date: utcDay(index + 1),
  desktop: desktop!,
  mobile: mobile!,
  goal: 4200,
}));

export const sessionRanges: CardRange<SessionDay>[] = [
  { id: 'three-weeks', label: 'Last 21 days', data: dailySessions, delta: 0.126 },
  { id: 'two-weeks', label: 'Last 14 days', data: dailySessions.slice(7), delta: 0.081 },
  { id: 'week', label: 'Last 7 days', data: dailySessions.slice(14), delta: 0.034 },
];

/** Response time percentiles over a day, sampled every three hours. */
export interface LatencySample {
  hour: string;
  p50: number;
  p95: number;
}

export const latency: LatencySample[] = [
  ['00:00', 82, 210],
  ['03:00', 76, 188],
  ['06:00', 91, 236],
  ['09:00', 128, 342],
  ['12:00', 141, 388],
  ['15:00', 136, 361],
  ['18:00', 118, 309],
  ['21:00', 97, 254],
].map(([hour, p50, p95]) => ({ hour: hour as string, p50: p50 as number, p95: p95 as number }));

/** Paid seats, which change in steps when teams upgrade or cancel. */
export interface SeatWeek {
  week: string;
  pro: number;
  team: number;
}

export const seats: SeatWeek[] = [
  [120, 40],
  [120, 40],
  [135, 40],
  [135, 64],
  [150, 64],
  [150, 64],
  [142, 88],
  [165, 88],
  [165, 112],
  [180, 112],
].map(([pro, team], index) => ({ week: `W${index + 1}`, pro: pro!, team: team! }));

export interface OrderMonth {
  month: string;
  online: number;
  retail: number;
  target: number;
}

function ordersFrom(online: number[], retail: number[], target: number[]): OrderMonth[] {
  return months.map((month, index) => ({
    month,
    online: online[index]!,
    retail: retail[index]!,
    target: target[index]!,
  }));
}

export const orders = ordersFrom(
  [420, 460, 510, 480, 560, 620, 690, 650, 720, 780, 860, 980],
  [310, 290, 330, 350, 340, 380, 400, 390, 420, 450, 510, 620],
  [700, 720, 760, 800, 840, 880, 920, 960, 1000, 1040, 1100, 1200],
);

export const lastYearOrders = ordersFrom(
  [360, 380, 420, 410, 470, 520, 560, 560, 600, 640, 700, 810],
  [300, 280, 300, 320, 320, 340, 360, 350, 380, 400, 450, 540],
  [640, 660, 680, 700, 740, 780, 820, 860, 900, 940, 980, 1040],
);

export const orderRanges: CardRange<OrderMonth>[] = [
  { id: 'year', label: 'This year', data: orders, delta: 0.143 },
  { id: 'six-months', label: 'Last 6 months', data: orders.slice(-6), delta: 0.088 },
  { id: 'last-year', label: 'Last year', data: lastYearOrders, delta: 0.071 },
];

/** A single weekly pattern, the classic earnings-card shape. */
export interface WeekdayEarnings {
  day: string;
  earnings: number;
}

export const weekdayEarnings: WeekdayEarnings[] = [
  ['Mon', 3420],
  ['Tue', 4180],
  ['Wed', 3860],
  ['Thu', 5240],
  ['Fri', 6120],
  ['Sat', 4470],
  ['Sun', 2980],
].map(([day, earnings]) => ({ day: day as string, earnings: earnings as number }));

/** Revenue by acquisition channel: text categories on x. */
export interface ChannelRevenue {
  channel: string;
  revenue: number;
}

export const channelRevenue: ChannelRevenue[] = [
  ['Organic search', 42800],
  ['Direct', 24100],
  ['Paid social', 31500],
  ['Email', 18200],
  ['Referral', 12600],
].map(([channel, revenue]) => ({ channel: channel as string, revenue: revenue as number }));

/** Daily sales split by customer type, for the segmented stack. */
export interface SalesDay {
  date: Date;
  newUsers: number;
  existing: number;
}

export const dailySales: SalesDay[] = [
  [4200, 9800],
  [5600, 10400],
  [4800, 8100],
  [4300, 7200],
  [5100, 9300],
  [4900, 10100],
  [3400, 6800],
  [3100, 5700],
  [5800, 9100],
  [5200, 8300],
  [4400, 7200],
  [5000, 9900],
  [4700, 10200],
  [4100, 6700],
  [3600, 5300],
  [6400, 11400],
  [5900, 9600],
  [4800, 8000],
  [4500, 11500],
  [5700, 10200],
  [4600, 7600],
  [4300, 5900],
  [6200, 11600],
  [5800, 10900],
  [5400, 9800],
  [5100, 8600],
  [5900, 10400],
  [5200, 9900],
  [3900, 6600],
  [5600, 9100],
].map(([newUsers, existing], index) => ({
  date: new Date(Date.UTC(2026, 2, 22 + index)),
  newUsers: newUsers!,
  existing: existing!,
}));

/** Campaign revenue per month, for the needle bars. */
export interface CampaignMonth {
  month: string;
  revenue: number;
}

export const campaignRevenue: CampaignMonth[] = [
  28400, 84600, 49200, 61800, 38700, 74300, 36100, 92500, 64800, 49100, 77900, 70200,
].map((revenue, index) => ({ month: months[index]!, revenue }));

/** Thirty days of dashboard metrics, one row per day, for the stat cards. */
export interface KpiDay {
  date: Date;
  revenue: number;
  activeUsers: number;
  orders: number;
  conversion: number;
}

export const dailyKpis: KpiDay[] = [
  [3120, 1840, 96, 0.031],
  [3380, 1910, 104, 0.033],
  [2940, 1870, 88, 0.029],
  [3510, 1960, 110, 0.034],
  [3720, 2010, 118, 0.035],
  [3290, 1990, 101, 0.032],
  [2860, 1930, 84, 0.028],
  [3640, 2080, 112, 0.033],
  [3910, 2140, 121, 0.036],
  [4080, 2170, 126, 0.035],
  [3760, 2150, 115, 0.033],
  [3450, 2120, 103, 0.031],
  [4210, 2230, 131, 0.036],
  [4390, 2290, 137, 0.037],
  [4020, 2270, 124, 0.034],
  [3680, 2240, 112, 0.032],
  [4460, 2330, 139, 0.036],
  [4620, 2390, 145, 0.037],
  [4280, 2360, 132, 0.035],
  [3940, 2340, 119, 0.033],
  [4710, 2420, 148, 0.038],
  [4930, 2480, 155, 0.038],
  [4560, 2460, 141, 0.036],
  [4180, 2430, 128, 0.034],
  [5020, 2510, 158, 0.038],
  [5240, 2570, 166, 0.039],
  [4870, 2550, 151, 0.037],
  [4490, 2520, 138, 0.035],
  [5310, 2610, 169, 0.039],
  [5560, 2680, 177, 0.04],
].map(([revenue, activeUsers, orders, conversion], index) => ({
  date: utcDay(index + 1),
  revenue: revenue!,
  activeUsers: activeUsers!,
  orders: orders!,
  conversion: conversion!,
}));

/** Weekly signups with one week missing: the gap stays a gap. */
export interface SignupWeek {
  week: string;
  signups: number | null;
}

export const weeklySignups: SignupWeek[] = [
  412,
  468,
  455,
  503,
  null,
  544,
  596,
  571,
  638,
  662,
  701,
  689,
].map((signups, index) => ({ week: `W${index + 1}`, signups }));

/** Top pages by views, for the ranking list. */
export interface PageViews {
  page: string;
  views: number;
}

export const pageViews: PageViews[] = [
  ['/pricing', 18420],
  ['/', 42310],
  ['/docs/getting-started', 15260],
  ['/blog/launch-week', 9840],
  ['/changelog', 7310],
  ['/docs/api', 6120],
  ['/careers', 3480],
  ['/about', 2950],
  ['/legal/privacy', 1210],
].map(([page, views]) => ({ page: page as string, views: views as number }));

/** Sales by country with one country still reporting. */
export interface CountrySales {
  country: string;
  sales: number | null;
}

export const countrySales: CountrySales[] = [
  ['United States', 128400],
  ['Germany', 46200],
  ['United Kingdom', 51800],
  ['Japan', 33900],
  ['Brazil', null],
  ['Canada', 27400],
].map(([country, sales]) => ({ country: country as string, sales: sales as number | null }));

/** Net revenue change by product line: gains and losses around zero. */
export interface ProductChange {
  product: string;
  change: number;
}

export const productChange: ProductChange[] = [
  ['Analytics', 18400],
  ['Billing', 9200],
  ['Storage', -4100],
  ['Messaging', 5600],
  ['Legacy API', -11800],
].map(([product, change]) => ({ product: product as string, change: change as number }));

const lastMonthChannels: ChannelRevenue[] = [
  ['Organic search', 36900],
  ['Direct', 25800],
  ['Paid social', 22400],
  ['Email', 19600],
  ['Referral', 9800],
].map(([channel, revenue]) => ({ channel: channel as string, revenue: revenue as number }));

/** A quarter where email climbs and partners replace referral, so rows re-rank, arrive and leave. */
const quarterChannels: ChannelRevenue[] = [
  ['Organic search', 118400],
  ['Email', 86300],
  ['Paid social', 71900],
  ['Direct', 64200],
  ['Partners', 38700],
].map(([channel, revenue]) => ({ channel: channel as string, revenue: revenue as number }));

export const channelRanges: CardRange<ChannelRevenue>[] = [
  { id: 'month', label: 'This month', data: channelRevenue, delta: 0.124 },
  { id: 'last-month', label: 'Last month', data: lastMonthChannels, delta: 0.038 },
  { id: 'quarter', label: 'This quarter', data: quarterChannels, delta: 0.217 },
];

/** Monthly revenue, costs, budget, and margin for the combo card. */
export interface FinanceMonth {
  month: string;
  revenue: number;
  costs: number;
  budget: number;
  margin: number;
}

function financeFrom(revenue: number[], costs: number[], budget: number[]): FinanceMonth[] {
  return months.map((month, index) => ({
    month,
    revenue: revenue[index]!,
    costs: costs[index]!,
    budget: budget[index]!,
    margin: Math.round((1 - costs[index]! / revenue[index]!) * 1000) / 1000,
  }));
}

export const finance = financeFrom(
  [42, 46, 51, 49, 55, 61, 58, 64, 70, 68, 75, 83].map((value) => value * 1000),
  [31, 33, 36, 35, 37, 40, 39, 41, 44, 43, 46, 49].map((value) => value * 1000),
  [44, 46, 48, 50, 53, 56, 59, 62, 65, 68, 72, 76].map((value) => value * 1000),
);

const lastYearFinance = financeFrom(
  [34, 36, 39, 38, 42, 45, 44, 48, 51, 50, 55, 60].map((value) => value * 1000),
  [27, 28, 30, 30, 32, 34, 34, 36, 38, 37, 40, 43].map((value) => value * 1000),
  [35, 37, 39, 41, 43, 45, 47, 49, 51, 53, 55, 58].map((value) => value * 1000),
);

export const financeRanges: CardRange<FinanceMonth>[] = [
  { id: 'year', label: 'This year', data: finance, delta: 0.212 },
  { id: 'last-year', label: 'Last year', data: lastYearFinance, delta: 0.094 },
];

/** Sessions by traffic source: more categories than a donut can color apart. */
export interface TrafficSource {
  source: string;
  sessions: number;
}

export const trafficSources: TrafficSource[] = [
  ['Google', 48200],
  ['Direct', 31500],
  ['Newsletter', 12800],
  ['LinkedIn', 9400],
  ['Hacker News', 7300],
  ['Bing', 4100],
  ['Reddit', 3600],
  ['DuckDuckGo', 2200],
  ['GitHub', 1900],
].map(([source, sessions]) => ({ source: source as string, sessions: sessions as number }));

/** Sessions by device: a three-way split. */
export interface DeviceSessions {
  device: string;
  sessions: number;
}

export const deviceSessions: DeviceSessions[] = [
  ['Desktop', 61200],
  ['Mobile', 44800],
  ['Tablet', 7100],
].map(([device, sessions]) => ({ device: device as string, sessions: sessions as number }));

/** Spend by team with one team yet to report. */
export interface TeamSpend {
  team: string;
  spend: number | null;
}

export const teamSpend: TeamSpend[] = [
  ['Engineering', 184000],
  ['Marketing', 96000],
  ['Sales', 121000],
  ['Design', null],
  ['Support', 42000],
].map(([team, spend]) => ({ team: team as string, spend: spend as number | null }));

/** Weekly visitors by browser, for the concentric rings. */
export interface BrowserVisitors {
  browser: string;
  visitors: number;
}

export const browserVisitors: BrowserVisitors[] = [
  ['Chrome', 275],
  ['Safari', 200],
  ['Firefox', 187],
  ['Edge', 173],
  ['Other', 90],
].map(([browser, visitors]) => ({ browser: browser as string, visitors: visitors as number }));

/** Weekly visitors by device: a two-way split for the half donut. */
export interface DeviceVisitors {
  device: string;
  visitors: number;
}

export const deviceVisitors: DeviceVisitors[] = [
  { device: 'Desktop', visitors: 1260 },
  { device: 'Mobile', visitors: 570 },
];

/** Funnel stages: one row per stage, in order. */
export interface FunnelStage {
  stage: string;
  people: number | null;
}

const stagesFrom = (stages: [string, number | null][]): FunnelStage[] =>
  stages.map(([stage, people]) => ({ stage, people }));

export const signupFunnel = stagesFrom([
  ['Link opened', 197],
  ['Started', 110],
  ['Completed', 77],
  ['Converted', 38],
]);

const signupFunnelMonth = stagesFrom([
  ['Link opened', 860],
  ['Started', 470],
  ['Completed', 330],
  ['Converted', 160],
]);

export const signupRanges: CardRange<FunnelStage>[] = [
  { id: 'week', label: 'Last 7 days', data: signupFunnel, delta: 0.052 },
  { id: 'month', label: 'Last 30 days', data: signupFunnelMonth, delta: 0.031 },
];

export const checkoutFunnel = stagesFrom([
  ['Viewed', 41800],
  ['Basket', 18400],
  ['Checkout', 9400],
  ['Payment', 6200],
  ['Paid', 5200],
]);

export const hiringFunnel = stagesFrom([
  ['Applied', 1240],
  ['Screened', 420],
  ['Phone', 96],
  ['Offer', 18],
  ['Hired', 11],
]);

export const onboardingFunnel = stagesFrom([
  ['Signed up', 5200],
  ['Verified email', 4100],
  ['Invited team', null],
  ['Created project', 1900],
]);

/** Heatmap cells: one row per weekday and two-hour block. */
export interface ActivityCell {
  day: string;
  hour: string;
  sessions: number | null;
}

const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const blocks = Array.from({ length: 12 }, (_, index) => `${String(index * 2).padStart(2, '0')}:00`);

/** A working-hours peak that fades at the weekend; `shift` nudges each cell for another week. */
const activityFrom = (
  shift: number,
  missing: (day: number, block: number) => boolean = () => false,
) =>
  weekdays.flatMap((day, y) =>
    blocks.map((hour, x) => ({
      day,
      hour,
      sessions: missing(y, x)
        ? null
        : Math.round(
            Math.max(
              0,
              (Math.sin(((x - 3) / 11) * Math.PI * 1.5) * 270 + 90 + Math.cos(y * 0.8 + x) * 55) *
                (y > 4 ? 0.45 : 1) +
                shift * (42 + Math.sin(x + y) * 30),
            ),
          ),
    })),
  ) satisfies ActivityCell[];

export const weeklyActivity: ActivityCell[] = activityFrom(0);
const lastWeekActivity: ActivityCell[] = activityFrom(-0.6);

export const activityRanges: CardRange<ActivityCell>[] = [
  { id: 'week', label: 'This week', data: weeklyActivity, delta: 0.149 },
  { id: 'last-week', label: 'Last week', data: lastWeekActivity, delta: -0.021 },
];

/** Tracking was down Monday to Wednesday at 10:00, and on Sunday at 18:00. */
export const activityWithGaps: ActivityCell[] = activityFrom(
  0,
  (day, block) => (block === 5 && day < 3) || (day === 6 && block === 9),
);

/** Cohort retention: the share of each month's sign-ups still active in each later week. */
export interface RetentionCell {
  cohort: string;
  week: string;
  retained: number | null;
}

const cohorts = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'];
export const weeklyRetention: RetentionCell[] = cohorts.flatMap((cohort, index) =>
  Array.from({ length: 6 }, (_, week) => ({
    cohort,
    week: `Week ${week + 1}`,
    // Newer cohorts have not reached their later weeks yet.
    retained:
      week >= cohorts.length - index
        ? null
        : Math.round((0.62 + index * 0.025) * Math.exp(-0.21 * week) * 1000) / 1000,
  })),
);

/** Scatter points: one row per campaign, with spend, sign-ups, and reach. */
export interface CampaignResult {
  campaign: string;
  channel: string;
  spend: number;
  signups: number | null;
  reach: number;
}

const campaignsFrom = (rows: [string, string, number, number | null, number][]): CampaignResult[] =>
  rows.map(([campaign, channel, spend, signups, reach]) => ({
    campaign,
    channel,
    spend,
    signups,
    reach,
  }));

export const campaignResults = campaignsFrom([
  ['Brand search', 'Search', 4200, 610, 18000],
  ['Competitor terms', 'Search', 9800, 720, 22000],
  ['Product search', 'Search', 14500, 1380, 31000],
  ['Shopping ads', 'Search', 21000, 1690, 42000],
  ['Generic terms', 'Search', 27500, 1540, 50000],
  ['Launch video', 'Social', 6400, 290, 64000],
  ['Creator series', 'Social', 12800, 820, 71000],
  ['Carousel ads', 'Social', 18200, 760, 48000],
  ['Story ads', 'Social', 24600, 1120, 83000],
  ['Lookalike audiences', 'Social', 33800, 1470, 96000],
  ['Welcome series', 'Email', 1800, 540, 9000],
  ['Newsletter feature', 'Email', 3100, 460, 14000],
  ['Win-back', 'Email', 5200, 830, 12000],
  ['Partner list', 'Email', 8600, 690, 21000],
]);

const campaignsLastQuarter = campaignResults.map((row, index) => ({
  ...row,
  spend: Math.round(row.spend * (0.78 + (index % 4) * 0.05)),
  signups: Math.round((row.signups ?? 0) * (0.7 + ((index * 3) % 5) * 0.06)),
}));

export const campaignRanges: CardRange<CampaignResult>[] = [
  { id: 'quarter', label: 'This quarter', data: campaignResults, delta: 0.198 },
  { id: 'last-quarter', label: 'Last quarter', data: campaignsLastQuarter, delta: 0.074 },
];

/** Two campaigns are still attributing sign-ups. */
export const campaignsInFlight = campaignResults.map((row) =>
  row.campaign === 'Story ads' || row.campaign === 'Partner list' ? { ...row, signups: null } : row,
);

/** Page speed against conversion: slower pages convert less. */
export interface PageSpeed {
  page: string;
  loadTime: number;
  conversion: number;
}

export const pageSpeed: PageSpeed[] = [
  ['/pricing', 0.9, 0.058],
  ['/', 1.1, 0.049],
  ['/signup', 1.2, 0.061],
  ['/features', 1.4, 0.044],
  ['/customers', 1.6, 0.041],
  ['/integrations', 1.8, 0.037],
  ['/docs', 2.0, 0.039],
  ['/blog', 2.3, 0.028],
  ['/changelog', 2.5, 0.031],
  ['/careers', 2.8, 0.022],
  ['/security', 3.1, 0.026],
  ['/compare', 3.4, 0.019],
  ['/partners', 3.8, 0.017],
  ['/events', 4.3, 0.012],
].map(([page, loadTime, conversion]) => ({
  page: page as string,
  loadTime: loadTime as number,
  conversion: conversion as number,
}));

/** Sankey flows: one row per flow from one step to the next. */
export interface Flow {
  from: string;
  to: string;
  visitors: number | null;
}

const flowsFrom = (rows: [string, string, number | null][]): Flow[] =>
  rows.map(([from, to, visitors]) => ({ from, to, visitors }));

export const visitorFlow = flowsFrom([
  ['Search', 'Pricing', 2400],
  ['Search', 'Product tour', 1800],
  ['Social', 'Product tour', 1500],
  ['Social', 'Pricing', 500],
  ['Email', 'Pricing', 900],
  ['Email', 'Product tour', 300],
  ['Pricing', 'Signed up', 1300],
  ['Pricing', 'Left', 2500],
  ['Product tour', 'Signed up', 900],
  ['Product tour', 'Left', 2700],
]);

const lastWeekFlow = visitorFlow.map((flow, index) => ({
  ...flow,
  visitors: Math.round((flow.visitors ?? 0) * (index < 6 ? 0.86 : 0.8)),
}));

export const visitorFlowRanges: CardRange<Flow>[] = [
  { id: 'week', label: 'This week', data: visitorFlow, delta: 0.163 },
  { id: 'last-week', label: 'Last week', data: lastWeekFlow, delta: 0.042 },
];

/** Two-step checkout where people leave between steps without a tracked exit. */
export const checkoutFlow = flowsFrom([
  ['Cart', 'Shipping', 1000],
  ['Shipping', 'Payment', 640],
  ['Payment', 'Paid', 410],
]);

/** The same visitors, before the Email → Product tour flow was instrumented. */
export const visitorFlowWithGap = visitorFlow.map((flow) =>
  flow.from === 'Email' && flow.to === 'Product tour' ? { ...flow, visitors: null } : flow,
);

/** Where revenue goes: every step passes on exactly what it receives. */
export interface BudgetFlow {
  from: string;
  to: string;
  amount: number;
}

export const budgetFlow: BudgetFlow[] = [
  ['Revenue', 'Salaries', 520000],
  ['Revenue', 'Infrastructure', 180000],
  ['Revenue', 'Marketing', 140000],
  ['Revenue', 'Profit', 360000],
  ['Salaries', 'Engineering', 310000],
  ['Salaries', 'Sales', 120000],
  ['Salaries', 'Support', 90000],
].map(([from, to, amount]) => ({
  from: from as string,
  to: to as string,
  amount: amount as number,
}));

/** Radar dimensions: one row per area, with one score per profile. */
export interface ReadinessScore {
  area: string;
  current: number | null;
  target: number;
}

export const releaseReadiness: ReadinessScore[] = [
  { area: 'Quality', current: 82, target: 92 },
  { area: 'Test coverage', current: 74, target: 90 },
  { area: 'Accessibility', current: 88, target: 90 },
  { area: 'Reliability', current: 91, target: 95 },
  { area: 'Performance', current: 69, target: 85 },
  { area: 'Documentation', current: 63, target: 80 },
];

const lastQuarterReadiness = releaseReadiness.map((row, index) => ({
  ...row,
  current: (row.current ?? 0) - [6, 9, 2, 4, 11, 5][index]!,
}));

export const readinessRanges: CardRange<ReadinessScore>[] = [
  { id: 'quarter', label: 'This quarter', data: releaseReadiness, delta: 0.086 },
  { id: 'last-quarter', label: 'Last quarter', data: lastQuarterReadiness, delta: 0.031 },
];

/** Accessibility wasn't audited this quarter. */
export const readinessWithGap = releaseReadiness.map((row) =>
  row.area === 'Accessibility' ? { ...row, current: null } : row,
);

/** Three products scored out of ten on the same criteria. */
export interface ProductScore {
  criterion: string;
  lilt: number;
  northwind: number;
  contoso: number;
}

export const productScores: ProductScore[] = [
  { criterion: 'Speed', lilt: 9, northwind: 6, contoso: 7 },
  { criterion: 'Price', lilt: 7, northwind: 8, contoso: 5 },
  { criterion: 'Support', lilt: 8, northwind: 5, contoso: 9 },
  { criterion: 'Features', lilt: 7, northwind: 9, contoso: 6 },
  { criterion: 'Integrations', lilt: 6, northwind: 7, contoso: 8 },
  { criterion: 'Security', lilt: 9, northwind: 7, contoso: 8 },
];

/** Activity ring slots: one row per time slot, with the hour of day. */
export interface RequestSlot {
  hour: number;
  requests: number | null;
}

/** Requests in 40-minute slots: quiet overnight, busiest mid-afternoon. */
const rhythmFrom = (lift: number, missing: readonly number[] = []): RequestSlot[] =>
  Array.from({ length: 36 }, (_, index) => {
    const hour = (index * 40) / 60;
    return {
      hour,
      requests: missing.includes(index)
        ? null
        : Math.round(
            Math.max(
              0,
              14 + 64 * Math.exp(-Math.pow((hour - 14) / 5, 2)) + 10 * Math.sin(hour * 0.9) + lift,
            ),
          ),
    };
  });

export const requestRhythm = rhythmFrom(0);
const yesterdayRhythm = rhythmFrom(-6);

export const requestRhythmRanges: CardRange<RequestSlot>[] = [
  { id: 'today', label: 'Today', data: requestRhythm, delta: 0.186 },
  { id: 'yesterday', label: 'Yesterday', data: yesterdayRhythm, delta: -0.034 },
];

/** Logging was down from 02:40 to 04:00. */
export const requestRhythmWithGap = rhythmFrom(0, [4, 5]);

/** Support tickets opened in each hour of the day. */
export interface TicketHour {
  hour: number;
  tickets: number;
}

export const ticketsByHour: TicketHour[] = [
  2, 1, 0, 0, 1, 2, 5, 11, 19, 26, 31, 28, 22, 24, 27, 23, 18, 13, 9, 7, 6, 4, 3, 2,
].map((tickets, hour) => ({ hour, tickets }));

/** One category measured in two periods, for slope and dumbbell cards. */
export interface RegionRevenue {
  region: string;
  lastYear: number | null;
  thisYear: number | null;
}

const regionsFrom = (rows: [string, number | null, number | null][]): RegionRevenue[] =>
  rows.map(([region, lastYear, thisYear]) => ({ region, lastYear, thisYear }));

export const regionRevenue = regionsFrom([
  ['North America', 412000, 486000],
  ['Europe', 358000, 391000],
  ['Asia Pacific', 204000, 281000],
  ['Latin America', 118000, 104000],
  ['Middle East', 86000, 97000],
  ['Africa', 41000, 38000],
]);

export const regionsWithGap = regionsFrom([
  ['North America', 412000, 486000],
  ['Europe', 358000, 391000],
  ['Asia Pacific', 204000, 281000],
  ['Nordics', null, 64000],
  ['Latin America', 118000, null],
]);

const regionHalves = regionsFrom([
  ['North America', 228000, 258000],
  ['Europe', 181000, 176000],
  ['Asia Pacific', 121000, 149000],
  ['Latin America', 57000, 52000],
  ['Middle East', 44000, 51000],
  ['Africa', 19000, 20000],
]);

export const regionRanges: CardRange<RegionRevenue>[] = [
  { id: 'year', label: '2025 → 2026', data: regionRevenue },
  { id: 'half', label: 'H1 → H2', data: regionHalves },
];

/** Share of teams using each feature before and after a redesign. */
export interface FeatureAdoption {
  feature: string;
  before: number;
  after: number;
}

export const featureAdoption: FeatureAdoption[] = [
  ['Dashboards', 0.62, 0.71],
  ['Alerts', 0.48, 0.66],
  ['Exports', 0.41, 0.39],
  ['Sharing', 0.33, 0.52],
  ['API access', 0.21, 0.24],
  ['Annotations', 0.17, 0.12],
].map(([feature, before, after]) => ({
  feature: feature as string,
  before: before as number,
  after: after as number,
}));

/** A small seeded generator, so every fixture below renders identically everywhere. */
function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}
const cents = (value: number) => Math.round(value * 100) / 100;
const dayMs = 86_400_000;

/** One trading period: open, high, low, close and traded volume. */
export interface Candle {
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

function candlesFrom(options: {
  count: number;
  start: number;
  end: Date;
  seed: number;
  drift: number;
  swing: number;
  stepDays?: number;
  volume: number;
}): Candle[] {
  const random = seeded(options.seed);
  const step = (options.stepDays ?? 1) * dayMs;
  const first = options.end.getTime() - (options.count - 1) * step;
  let close = options.start;
  return Array.from({ length: options.count }, (_, index) => {
    const open = close;
    const wave = Math.sin(index / 9) * options.swing * 0.35;
    close = Math.max(1, open * (1 + options.drift + (random() - 0.5) * options.swing + wave / 100));
    const high = Math.max(open, close) * (1 + random() * options.swing * 0.45);
    const low = Math.min(open, close) * (1 - random() * options.swing * 0.45);
    const move = Math.abs(close - open) / open;
    return {
      date: new Date(first + index * step),
      open: cents(open),
      high: cents(high),
      low: cents(low),
      close: cents(close),
      volume: Math.round(options.volume * (0.55 + random() * 0.7 + move * 18)),
    };
  });
}

const marketClose = new Date(Date.UTC(2026, 8, 25));

/** Solana against USDC: a year of daily candles ending 25 September 2026. */
export const solCandles = candlesFrom({
  count: 365,
  start: 168,
  end: marketClose,
  seed: 11,
  drift: 0.0011,
  swing: 0.034,
  volume: 2_400_000,
});

export const candleRanges: CardRange<Candle>[] = [
  { id: '1m', label: '1M', data: solCandles.slice(-30) },
  { id: '3m', label: '3M', data: solCandles.slice(-90) },
  { id: '6m', label: '6M', data: solCandles.slice(-182) },
  { id: '1y', label: '1Y', data: solCandles },
];

/** Ninety days of candles, for examples without a period select. */
export const solQuarter = solCandles.slice(-90);

/** Six years of weekly Bitcoin candles: a long, multiplicative history for a log scale. */
export const btcWeekly = candlesFrom({
  count: 312,
  start: 3_900,
  end: marketClose,
  seed: 23,
  drift: 0.0095,
  swing: 0.09,
  stepDays: 7,
  volume: 18_000,
});

/** Value and cost basis of an account, one row per day for a year. */
export interface PortfolioDay {
  date: Date;
  value: number;
  basis: number;
}

function portfolioFrom(seed: number): PortfolioDay[] {
  const random = seeded(seed);
  let value = 25_000;
  let basis = 25_000;
  return Array.from({ length: 365 }, (_, index) => {
    // A deposit every thirty days raises both the value and the basis.
    if (index > 0 && index % 30 === 0) {
      value += 1_250;
      basis += 1_250;
    }
    value *= 1 + 0.0009 + (random() - 0.5) * 0.013;
    return {
      date: new Date(marketClose.getTime() - (364 - index) * dayMs),
      value: Math.round(value),
      basis,
    };
  });
}

export const portfolio = portfolioFrom(5);

export const portfolioRanges: CardRange<PortfolioDay>[] = [
  { id: '3m', label: '3M', data: portfolio.slice(-90) },
  { id: '6m', label: '6M', data: portfolio.slice(-182) },
  { id: '1y', label: '1Y', data: portfolio },
];

/** Closing prices of three tokens on the same days, for price cards and comparisons. */
export interface TokenPrices {
  date: Date;
  sol: number;
  eth: number;
  btc: number;
}

const ethCandles = candlesFrom({
  count: 90,
  start: 3_100,
  end: marketClose,
  seed: 31,
  drift: -0.0004,
  swing: 0.03,
  volume: 1,
});
const btcDaily = candlesFrom({
  count: 90,
  start: 58_000,
  end: marketClose,
  seed: 37,
  drift: 0.0006,
  swing: 0.022,
  volume: 1,
});

export const tokenPrices: TokenPrices[] = solQuarter.map((candle, index) => ({
  date: candle.date,
  sol: candle.close,
  eth: ethCandles[index]!.close,
  btc: btcDaily[index]!.close,
}));

export const tokenPriceRanges: CardRange<TokenPrices>[] = [
  { id: '1w', label: '1W', data: tokenPrices.slice(-7) },
  { id: '1m', label: '1M', data: tokenPrices.slice(-30) },
  { id: '3m', label: '3M', data: tokenPrices },
];

/** A price level and the size resting at it. */
export interface BookLevel {
  price: number;
  size: number;
}

function bookFrom(mid: number, tick: number, seed: number) {
  const random = seeded(seed);
  const side = (direction: 1 | -1): BookLevel[] =>
    Array.from({ length: 16 }, (_, index) => ({
      price: cents(mid + direction * (tick / 2 + index * tick)),
      size: Math.round(150 + random() * 900 + (random() > 0.85 ? 900 : 0)),
    }));
  return { bids: side(-1), asks: side(1) };
}

/** A SOL/USDC order book around a mid of $182.40. */
export const solBook = bookFrom(182.4, 0.25, 43);

/** A thinner ETH book, for a second example. */
export const ethBook = bookFrom(3_012.4, 1.2, 29);

/** Monthly temperature: the lows, highs, and mean of each month. */
export interface MonthTemperature {
  month: string;
  low: number;
  high: number;
  mean: number;
}

export const cityTemperature: MonthTemperature[] = [
  [2, 9],
  [3, 11],
  [5, 14],
  [7, 17],
  [11, 21],
  [14, 25],
  [16, 28],
  [16, 27],
  [13, 23],
  [9, 18],
  [5, 12],
  [3, 9],
].map(([low, high], index) => ({
  month: months[index]!,
  low: low!,
  high: high!,
  mean: Math.round(((low! + high!) / 2) * 10) / 10,
}));

/** Conversion rate per experiment variant with its 95% confidence interval. */
export interface VariantEstimate {
  variant: string;
  rate: number;
  low: number;
  high: number;
}

export const experimentResults: VariantEstimate[] = [
  ['Control', 0.041, 0.036, 0.046],
  ['Short form', 0.052, 0.046, 0.058],
  ['Social proof', 0.047, 0.041, 0.053],
  ['Annual default', 0.039, 0.033, 0.045],
  ['Free trial', 0.061, 0.054, 0.068],
].map(([variant, rate, low, high]) => ({
  variant: variant as string,
  rate: rate as number,
  low: low as number,
  high: high as number,
}));

/** Raw response times, in milliseconds, for each region. */
export interface RegionLatency {
  region: string;
  samples: number[];
}

function latencySamples(seed: number, median: number, spread: number): number[] {
  const random = seeded(seed);
  return Array.from({ length: 120 }, () => {
    // A log-normal tail, like real request latency.
    const normal = Math.sqrt(-2 * Math.log(random() || 1e-9)) * Math.cos(2 * Math.PI * random());
    return Math.round(median * Math.exp(normal * spread));
  });
}

export const regionLatency: RegionLatency[] = [
  ['US East', 41, 0.22],
  ['US West', 48, 0.2],
  ['Europe', 62, 0.24],
  ['Asia Pacific', 96, 0.28],
  ['South America', 118, 0.25],
].map(([region, median, spread], index) => ({
  region: region as string,
  samples: latencySamples(101 + index, median as number, spread as number),
}));

/** Every dataset an example can render, by the name its printed code uses. */
/**
 * Five weeks of daily checkouts with quiet weekends, then two weekdays that fall well short:
 * enough history for a weekly normal to learn each weekday.
 */
export interface CheckoutDay {
  date: Date;
  checkouts: number;
}

export const dailyCheckouts: CheckoutDay[] = Array.from({ length: 37 }, (_, index) => {
  const date = utcDay(index - 13);
  const weekday = date.getUTCDay();
  const usual = weekday === 0 ? 610 : weekday === 6 ? 720 : 1180;
  const wobble = [0.97, 1.02, 0.99, 1.04, 0.98, 1.01, 1.03][index % 7]!;
  return { date, checkouts: Math.round(usual * wobble * (index >= 35 ? 0.35 : 1)) };
});

export const productRevenue = [
  { product: 'Analytics', department: 'Platform', revenue: 42000 },
  { product: 'Automations', department: 'Platform', revenue: 28000 },
  { product: 'Reports', department: 'Platform', revenue: 16000 },
  { product: 'Team', department: 'Workspace', revenue: 32000 },
  { product: 'Enterprise', department: 'Workspace', revenue: 24000 },
  { product: 'Storage', department: 'Services', revenue: 18000 },
  { product: 'Support', department: 'Services', revenue: 12000 },
];

export const calendarActivity = Array.from({ length: 92 }, (_, index) => ({
  date: new Date(Date.UTC(2026, 6, 1 + index)).toISOString().slice(0, 10),
  visits: index % 19 === 0 ? null : index % 13 === 0 ? 0 : 200 + ((index * 137) % 950),
}));

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

export const deployments = [
  {
    id: 'a',
    task: 'API release',
    service: 'API',
    state: 'Deploy',
    start: '2026-09-28T08:00:00Z',
    end: '2026-09-28T10:30:00Z',
  },
  {
    id: 'b',
    task: 'Index rebuild',
    service: 'API',
    state: 'Maintenance',
    start: '2026-09-28T09:30:00Z',
    end: '2026-09-28T12:00:00Z',
  },
  {
    id: 'c',
    task: 'Web release',
    service: 'Web',
    state: 'Deploy',
    start: '2026-09-28T10:00:00Z',
    end: '2026-09-28T13:00:00Z',
  },
  {
    id: 'd',
    task: 'Cache refresh',
    service: 'Workers',
    state: 'Maintenance',
    start: '2026-09-28T08:30:00Z',
    end: '2026-09-28T11:00:00Z',
  },
  {
    id: 'e',
    task: 'Queue drain',
    service: 'Workers',
    state: 'Recovery',
    start: '2026-09-28T12:00:00Z',
    end: '2026-09-28T15:00:00Z',
  },
];

export const deliveryTimes = ['Express', 'Standard', 'Economy'].flatMap((carrier, group) =>
  Array.from({ length: 24 }, (_, index) => ({
    parcel: carrier + ' ' + (index + 1),
    carrier,
    hours: 8 + group * 14 + ((index * 7) % 19) + (index % 4) * 0.5,
  })),
);

export const datasets = {
  ...spatialData,
  ...expansionData,
  teamHandoffs,
  handoffsWithGaps,
  productLeague,
  leagueWithGaps,
  serviceEvents,
  eventBurst,
  customerCloud,
  productProfiles,
  profilesWithGaps,
  productRevenue,
  calendarActivity,
  yearContributions,
  regionSales,
  weekdayTraffic,
  dailySteps,
  serverLoad,
  storeRevenue,
  teamTime,
  deployments,
  deliveryTimes,
  dailyCheckouts,
  visitors,
  dailyRevenue,
  revenueForecast,
  dailySessions,
  latency,
  seats,
  orders,
  weekdayEarnings,
  channelRevenue,
  dailySales,
  campaignRevenue,
  dailyKpis,
  weeklySignups,
  pageViews,
  countrySales,
  productChange,
  finance,
  trafficSources,
  deviceSessions,
  teamSpend,
  browserVisitors,
  deviceVisitors,
  signupFunnel,
  checkoutFunnel,
  hiringFunnel,
  onboardingFunnel,
  weeklyActivity,
  activityWithGaps,
  weeklyRetention,
  campaignResults,
  campaignsInFlight,
  pageSpeed,
  visitorFlow,
  checkoutFlow,
  visitorFlowWithGap,
  budgetFlow,
  releaseReadiness,
  readinessWithGap,
  productScores,
  requestRhythm,
  requestRhythmWithGap,
  ticketsByHour,
  regionRevenue,
  regionsWithGap,
  featureAdoption,
  solCandles,
  solQuarter,
  btcWeekly,
  portfolio,
  tokenPrices,
  cityTemperature,
  experimentResults,
  regionLatency,
};

/** Period selects, printed as `ranges={ranges}`. */
export const rangeSets = {
  visitorRanges,
  sessionRanges,
  orderRanges,
  channelRanges,
  financeRanges,
  signupRanges,
  activityRanges,
  campaignRanges,
  visitorFlowRanges,
  readinessRanges,
  requestRhythmRanges,
  regionRanges,
  candleRanges,
  portfolioRanges,
  tokenPriceRanges,
};

/** Order books, printed as `bids={book.bids}` and `asks={book.asks}`. */
export const bookSets = {
  solBook,
  ethBook,
};

export type DataName = keyof typeof datasets;
export type RangeName = keyof typeof rangeSets;
export type BookName = keyof typeof bookSets;
