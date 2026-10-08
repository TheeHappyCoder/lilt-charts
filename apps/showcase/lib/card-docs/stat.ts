import { cardProps, curate, type CardDocContent } from './content';
import { cardExample, type CardExampleRow } from './examples';

const usd = { style: 'currency', currency: 'USD', maximumFractionDigits: 0 } as const;
const rate = { style: 'percent', maximumFractionDigits: 1 } as const;

const revenue = cardExample({
  id: 'revenue',
  title: 'Revenue',
  description: 'The default: the period total over a soft area.',
  kind: 'stat',
  source: 'dailyKpis',
  props: {
    title: 'Revenue',
    value: 'revenue',
    x: 'date',
    valueFormat: usd,
    delta: 0.124,
    caption: 'vs last month',
  },
});

const dashboardRow: CardExampleRow = {
  id: 'dashboard',
  title: 'Dashboard row',
  description:
    'Four tiles over the same rows. Each picks its own field, summary, and chart, and the grid is yours. A shared `sync` name makes the three charts hover together.',
  kind: 'stat',
  row: [
    cardExample({
      id: 'revenue',
      title: 'Revenue',
      description: '',
      kind: 'stat',
      source: 'dailyKpis',
      props: {
        title: 'Revenue',
        value: 'revenue',
        x: 'date',
        valueFormat: usd,
        delta: 0.124,
        caption: 'vs last month',
        sync: 'metrics',
      },
    }),
    cardExample({
      id: 'users',
      title: 'Active users',
      description: '',
      kind: 'stat',
      source: 'dailyKpis',
      props: {
        title: 'Active users',
        value: 'activeUsers',
        x: 'date',
        aggregate: 'last',
        chart: 'line',
        delta: 0.082,
        caption: 'vs last month',
        sync: 'metrics',
      },
    }),
    cardExample({
      id: 'orders',
      title: 'Orders',
      description: '',
      kind: 'stat',
      source: 'dailyKpis',
      props: {
        title: 'Orders',
        value: 'orders',
        x: 'date',
        chart: 'bars',
        barStyle: 'segmented',
        delta: 0.153,
        caption: 'vs last month',
        sync: 'metrics',
      },
    }),
    cardExample({
      id: 'goal',
      title: 'Monthly goal',
      description: '',
      kind: 'stat',
      source: 'dailyKpis',
      props: {
        title: 'Monthly goal',
        value: 'revenue',
        valueFormat: usd,
        chart: 'meter',
        target: 150000,
      },
    }),
  ],
};

const statContent: CardDocContent = {
  kind: 'stat',
  title: 'Stat cards',
  lede: 'Key metrics at a glance: a value, its change, and a small chart.',
  heroFile: 'RevenueCard.tsx',
  hero: revenue,
  usage: `<StatCard
  title="Revenue"
  data={dailyKpis}
  value="revenue"
  x="date"
  delta={0.124}
  caption="vs last month"
/>`,
  dataShape: `// One row per observation. Several tiles can share the same rows.
const dailyKpis = [
  { date: new Date('2026-09-01'), revenue: 3120, activeUsers: 1840 },
  { date: new Date('2026-09-02'), revenue: 3380, activeUsers: 1910 },
];

<StatCard title="Revenue" data={dailyKpis} value="revenue" x="date" />
<StatCard title="Active users" data={dailyKpis} value="activeUsers" aggregate="last" />

// Already have the number? Pass it directly.
<StatCard title="Seats" headline={128} chart="none" />`,
  dataNote:
    '`value` names the numeric field to chart, and TypeScript rejects fields that don’t exist or aren’t numbers. The big number is that field summed over the rows; use `aggregate` for levels (`last`) or rates (`mean`). `x` is optional and only names points on hover. `null` is a gap in the chart and is left out of the summary, never counted as zero.',
  hover:
    'Hovering the chart swaps the big number for that day’s reading and the change chip for its date, with Lilt’s hover dot on the line. Click to pin a point; with the chart focused, arrow keys move it.',
  props: cardProps([
    {
      name: 'data',
      type: 'Row[]',
      description: 'One row per observation. Optional when you pass `headline`.',
    },
    { name: 'value', type: 'key of Row', description: 'Numeric field to summarize and chart.' },
    {
      name: 'x',
      type: 'key of Row',
      description: 'Text, number, or Date field that names each point on hover.',
    },
    {
      name: 'aggregate',
      type: "'sum' | 'mean' | 'last' | 'max'",
      description: 'How the big number summarizes the rows. Defaults to sum.',
    },
    { name: 'headline', type: 'number', description: 'Set the resting number yourself.' },
    { name: 'delta', type: 'number', description: 'Fractional change: 0.124 shows +12.4%.' },
    {
      name: 'deltaTone',
      type: "'default' | 'inverse' | 'neutral'",
      description: 'Use inverse when a decrease is good, such as churn.',
    },
    { name: 'caption', type: 'string', description: 'Quiet text beside the change chip.' },
    {
      name: 'chart',
      type: "'area' | 'line' | 'bars' | 'meter' | 'ring' | 'none'",
      description:
        'The small chart. Area by default; meter and ring fill toward `target`, the ring beside the value.',
    },
    {
      name: 'barStyle',
      type: "'solid' | 'segmented' | 'needle' | 'gradient' | 'outline' | 'isometric'",
      description: 'Bar treatment when `chart` is bars.',
    },
    {
      name: 'target',
      type: 'number',
      description: 'Goal for the meter or ring, in the value’s unit.',
    },
    {
      name: 'sync',
      type: 'string',
      description:
        'Hover together with every card that shares this name, matched by x. Requires `x`.',
    },
    {
      name: 'height',
      type: 'number',
      description: 'Chart height, and the ring’s size. 56 by default, 10 for a meter.',
    },
    { name: 'color', type: 'string', description: 'Any CSS color for the chart.' },
    { name: 'aside', type: 'ReactNode', description: 'Header content on the right, e.g. an icon.' },
    {
      name: 'depth',
      type: 'boolean',
      description:
        'Lines and the ring become lit tubes, the meter a solid bar, and bars default to `isometric`.',
    },
  ]),
  examples: [
    dashboardRow,
    cardExample({
      id: 'line',
      title: 'Latest level',
      description:
        'For a level such as active users, `aggregate="last"` shows the latest reading rather than a total.',
      kind: 'stat',
      source: 'dailyKpis',
      props: {
        title: 'Active users',
        value: 'activeUsers',
        x: 'date',
        aggregate: 'last',
        chart: 'line',
        delta: 0.082,
        caption: 'vs last month',
      },
    }),
    cardExample({
      id: 'bars',
      title: 'Bars',
      description: 'One bar per day. Hovering a bar lifts it and reads its value.',
      kind: 'stat',
      source: 'dailyKpis',
      props: {
        title: 'Orders',
        value: 'orders',
        x: 'date',
        chart: 'bars',
        delta: 0.153,
        caption: 'vs last month',
      },
    }),
    cardExample({
      id: 'segmented',
      title: 'Segmented bars',
      description:
        'The same bars built from small cells, like a level meter. Every bar style from the Bar card works here.',
      kind: 'stat',
      source: 'dailyKpis',
      props: {
        title: 'Orders',
        value: 'orders',
        x: 'date',
        chart: 'bars',
        barStyle: 'segmented',
        delta: 0.153,
        caption: 'vs last month',
      },
    }),
    cardExample({
      id: 'meter',
      title: 'Progress to a target',
      description:
        'A row of cells fills toward `target`. The last cell is trimmed to the exact value, so 82% never rounds to a whole cell.',
      kind: 'stat',
      source: 'dailyKpis',
      props: {
        title: 'Monthly goal',
        value: 'revenue',
        valueFormat: usd,
        chart: 'meter',
        target: 150000,
      },
    }),
    cardExample({
      id: 'ring',
      title: 'Progress ring',
      description:
        'The same target as a ring beside the value. Past 100% the ring stays full and the label says how far over.',
      kind: 'stat',
      source: 'dailyKpis',
      props: {
        title: 'Monthly goal',
        value: 'revenue',
        valueFormat: usd,
        chart: 'ring',
        target: 150000,
      },
    }),
    cardExample({
      id: 'ring-over',
      title: 'Ring past its target',
      description: 'Orders beat a 3,000 goal: a full ring and 128% inside it.',
      kind: 'stat',
      source: 'dailyKpis',
      props: {
        title: 'Orders goal',
        value: 'orders',
        chart: 'ring',
        target: 3000,
        delta: 0.153,
        caption: 'Goal 3,000',
      },
    }),
    cardExample({
      id: 'rate',
      title: 'A rate',
      description:
        'Rates average rather than add up: `aggregate="mean"` with a percent `valueFormat`.',
      kind: 'stat',
      source: 'dailyKpis',
      props: {
        title: 'Conversion',
        value: 'conversion',
        x: 'date',
        aggregate: 'mean',
        valueFormat: rate,
        chart: 'line',
        delta: 0.041,
        caption: 'vs last month',
      },
    }),
    cardExample({
      id: 'gap',
      title: 'Missing data',
      description:
        'Week 5 was never reported, so the line breaks there and the total leaves it out. `null` is a gap, never zero.',
      kind: 'stat',
      source: 'weeklySignups',
      props: {
        title: 'Signups',
        value: 'signups',
        x: 'week',
        chart: 'line',
        delta: 0.067,
        caption: 'vs last quarter',
      },
    }),
    cardExample({
      id: 'plain',
      title: 'Number only',
      description: 'No chart, just the value and its change.',
      kind: 'stat',
      source: 'dailyKpis',
      props: {
        title: 'Orders',
        value: 'orders',
        chart: 'none',
        delta: -0.021,
        caption: 'vs last month',
      },
    }),
    cardExample({
      id: 'loading',
      title: 'Loading',
      description: 'The number and chart hold their space while data is on its way.',
      kind: 'stat',
      source: 'dailyKpis',
      props: { title: 'Revenue', value: 'revenue', x: 'date', loading: true },
    }),
    cardExample({
      id: 'depth',
      title: '3D',
      description:
        'With depth the ring becomes a lit tube in a groove; lines become tubes, bars blocks, and the meter a solid bar.',
      kind: 'stat',
      source: 'dailyKpis',
      props: {
        title: 'Monthly goal',
        value: 'revenue',
        valueFormat: usd,
        chart: 'ring',
        target: 150000,
        depth: true,
      },
    }),
  ],
};

export const statDoc = curate(statContent, {
  drop: ['bars', 'segmented', 'ring', 'plain', 'depth'],
});
