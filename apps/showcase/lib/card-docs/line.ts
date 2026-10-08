import { indexedgrowthExample, forecastfanExample } from './expansion-variants';
import { cartesianProps, decimateProp, curate, type CardDocContent } from './content';
import { cardExample } from './examples';

const usd = { style: 'currency', currency: 'USD', maximumFractionDigits: 0 } as const;
const milliseconds = { style: 'unit', unit: 'millisecond', unitDisplay: 'short' } as const;

const platformSeries = [
  { key: 'desktop', label: 'Desktop' },
  { key: 'mobile', label: 'Mobile' },
] as const;

const lineContent: CardDocContent = {
  kind: 'line',
  title: 'Line chart',
  lede: 'Follow trends and compare changes over time.',
  heroFile: 'ActiveUsersCard.tsx',
  hero: cardExample({
    id: 'hero',
    title: 'Line chart card',
    description: '',
    kind: 'line',
    source: 'sessionRanges',
    props: { title: 'Active users', x: 'date', series: platformSeries },
  }),
  usage: `<LineChartCard
  title="Active users"
  data={dailySessions}
  x="date"
  series={[{ key: 'desktop' }, { key: 'mobile' }]}
/>`,
  dataShape: `// One row per x position, one numeric field per series.
const latency = [
  { hour: '00:00', p50: 82, p95: 210 },
  { hour: '03:00', p50: 76, p95: 188 },
];

<LineChartCard
  title="Response time"
  data={latency}
  x="hour"
  series={[{ key: 'p50' }, { key: 'p95' }]}
  aggregate="mean"        // average, not total
  headlineSeries="p95"    // the headline tracks p95
/>`,
  dataNote:
    'Pass your rows as they are. `x` and each series `key` name fields on the row, and TypeScript rejects keys that don’t exist or aren’t numbers. By default the headline totals every series; use `aggregate` and `headlineSeries` when the numbers are rates or levels rather than counts. `null` is a gap, not zero.',
  rangesUsage: `<LineChartCard
  title="Active users"
  x="date"
  series={series}
  ranges={[
    { id: 'three-weeks', label: 'Last 21 days', data: last21Days, delta: 0.126 },
    { id: 'week', label: 'Last 7 days', data: last7Days, delta: 0.034 },
  ]}
/>`,
  hover:
    'Hovering moves Lilt’s hover dots along every line. Move up and down and the y pill, the halo, and the matching tile follow the line nearest your pointer, even while a point is pinned. Up and Down keys do the same from the keyboard. Set `hover` to `tooltip` or `headline` for a different readout.',
  props: cartesianProps([
    {
      name: 'indexed',
      type: 'boolean',
      description:
        'Rebase each series to 100 at its first finite reading. Zero baselines are unindexable. Unitless output; defaults to the latest first-series headline. Forecast envelopes are omitted while indexed.',
    },
    {
      name: 'curve',
      type: "'smooth' | 'linear' | 'step'",
      description: 'Monotone spline, straight segments, or steps that hold each value.',
    },
    {
      name: 'points',
      type: 'boolean',
      description: 'Mark every observation with a small dot.',
    },
    {
      name: 'baseline',
      type: "'auto' | 'zero'",
      description: 'Fit the y axis to the data (default) or start it at zero.',
    },
    {
      name: 'aggregate',
      type: "'sum' | 'mean' | 'last' | 'max'",
      description: 'How the headline and tiles summarize the period. Defaults to sum.',
    },
    {
      name: 'headlineSeries',
      type: 'key',
      description: 'Make the headline follow one series instead of the total.',
    },
    {
      name: 'bleed',
      type: 'boolean',
      description: 'Run lines to the card edges with a soft fade. Defaults to true.',
    },
    {
      name: 'depth',
      type: 'boolean',
      description:
        'Draws each line as a lit tube with a soft shadow along its exact path. Dashed references stay flat.',
    },
    decimateProp,
  ]),
  examples: [
    indexedgrowthExample,
    forecastfanExample,
    cardExample({
      id: 'smooth',
      title: 'Smooth',
      description: 'The default: a monotone spline that never overshoots the data between points.',
      kind: 'line',
      source: 'dailySessions',
      props: { title: 'Active users', x: 'date', series: platformSeries, delta: 0.126 },
    }),
    cardExample({
      id: 'linear',
      title: 'Straight segments',
      description: 'Connect observations directly when every turn in the data matters.',
      kind: 'line',
      source: 'dailySessions',
      props: {
        title: 'Active users',
        x: 'date',
        series: platformSeries,
        curve: 'linear',
        delta: 0.126,
      },
    }),
    cardExample({
      id: 'step',
      title: 'Step',
      description:
        'For levels that change at a moment and hold, like seats, plans, or prices. Last shows the current level.',
      kind: 'line',
      source: 'seats',
      props: {
        title: 'Paid seats',
        x: 'week',
        series: [
          { key: 'pro', label: 'Pro' },
          { key: 'team', label: 'Team' },
        ],
        curve: 'step',
        aggregate: 'last',
        delta: 0.5,
      },
    }),
    cardExample({
      id: 'points',
      title: 'Points and an average',
      description:
        'Mark each sample, headline the p95 average instead of a meaningless total, and read values off the inline axis.',
      kind: 'line',
      source: 'latency',
      props: {
        title: 'Response time (p95)',
        x: 'hour',
        series: [
          { key: 'p50', label: 'p50' },
          { key: 'p95', label: 'p95' },
        ],
        points: true,
        aggregate: 'mean',
        headlineSeries: 'p95',
        valueFormat: milliseconds,
        axis: 'inline',
        delta: -0.08,
        deltaTone: 'inverse',
      },
    }),
    cardExample({
      id: 'reference',
      title: 'Previous period',
      description: 'A dashed series is a reference: drawn quietly, never counted in the headline.',
      kind: 'line',
      source: 'dailyRevenue',
      props: {
        title: 'Revenue',
        valueFormat: usd,
        x: 'date',
        series: [
          { key: 'revenue', label: 'Revenue' },
          {
            key: 'previous',
            label: 'Previous period',
            color: 'var(--lilt-reference)',
            dashed: true,
          },
        ],
        delta: 0.156,
        range: 'Sep 1–21',
      },
    }),
    cardExample({
      id: 'forecast',
      title: 'Forecast with a range',
      description:
        'The line turns dotted where measurements end, inside a band from `lower` to `upper`. The headline counts only measured days; hovering a projection says so.',
      kind: 'line',
      source: 'revenueForecast',
      props: {
        title: 'Revenue',
        valueFormat: usd,
        x: 'date',
        series: [{ key: 'revenue', label: 'Revenue' }],
        forecast: { from: new Date('2026-09-22'), lower: 'low', upper: 'high' },
      },
    }),
    cardExample({
      id: 'goal',
      title: 'Target to stay under',
      description:
        'With `deltaTone="inverse"`, on target means at or below the line, and the hover chip turns red above it.',
      kind: 'line',
      source: 'latency',
      props: {
        title: 'p95 latency',
        valueFormat: milliseconds,
        x: 'hour',
        series: [{ key: 'p95', label: 'p95' }],
        aggregate: 'mean',
        deltaTone: 'inverse',
        target: { value: 300, label: 'SLO' },
      },
    }),
    cardExample({
      id: 'loading',
      title: 'Loading',
      description: 'The skeleton mirrors the axis and edges of the chart that will arrive.',
      kind: 'line',
      source: 'dailySessions',
      props: { title: 'Active users', x: 'date', series: platformSeries, loading: true },
    }),
    cardExample({
      id: 'depth',
      title: '3D',
      description:
        'Each line becomes a lit tube with a soft shadow, running along its exact path. Hover still reads every point.',
      kind: 'line',
      source: 'dailySessions',
      props: {
        title: 'Active users',
        x: 'date',
        series: platformSeries,
        delta: 0.126,
        depth: true,
      },
    }),
    cardExample({
      id: 'legend-pills',
      title: 'Pill legend',
      description:
        'Tinted pills with a short line for each mark: a compact key that still reads each value.',
      kind: 'line',
      source: 'dailySessions',
      props: {
        title: 'Active users',
        x: 'date',
        series: platformSeries,
        delta: 0.126,
        legend: 'pills',
        legendSwatch: 'line',
      },
    }),
  ],
};

export const lineDoc = curate(lineContent, {
  drop: ['smooth', 'linear', 'points', 'depth', 'legend-pills'],
  style: { reference: { points: true }, goal: { curve: 'step' } },
  titles: { step: 'Values that hold until they change' },
});
