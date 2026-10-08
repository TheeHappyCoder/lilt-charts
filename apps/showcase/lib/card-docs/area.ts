import { streamgraphExample, streamgraphForm, areaForecastFanExample } from './expansion-variants';
import { cartesianProps, decimateProp, curate, type CardDocContent } from './content';
import { cardExample, type CardExampleRow } from './examples';

const usd = { style: 'currency', currency: 'USD', maximumFractionDigits: 0 } as const;

const visitorSeries = [
  { key: 'organic', label: 'Organic' },
  { key: 'referral', label: 'Referral' },
  { key: 'paid', label: 'Paid' },
] as const;

const areaContent = {
  forms: [streamgraphForm],
  kind: 'area',
  title: 'Area chart',
  lede: 'Trends over time, layered or stacked.',
  heroFile: 'VisitorsCard.tsx',
  hero: cardExample({
    id: 'hero',
    title: 'Area chart card',
    description: '',
    kind: 'area',
    source: 'visitorRanges',
    props: { title: 'Visitors', x: 'month', series: visitorSeries },
  }),
  usage: `<AreaChartCard
  title="Visitors"
  data={visitors}
  x="month"
  series={[{ key: 'organic' }, { key: 'referral' }, { key: 'paid' }]}
/>`,
  dataShape: `// One row per x position, one numeric field per series.
const visitors = [
  { month: 'Jan', organic: 2400, referral: 400, paid: 800, target: 3000 },
  { month: 'Feb', organic: 2800, referral: 500, paid: 700, target: 3200 },
];

<AreaChartCard
  title="Visitors"
  data={visitors}
  x="month"                       // text, number, or Date field
  series={[
    { key: 'organic', label: 'Organic' },            // palette color
    { key: 'paid', label: 'Paid', color: '#8b5cf6' }, // or your own
    { key: 'target', label: 'Target', dashed: true },  // line only
  ]}
/>`,
  dataNote:
    'Pass your rows as they are. `x` and each series `key` name fields on the row, and TypeScript rejects keys that don’t exist or aren’t numbers. Totals, tiles, and hover values are derived. `null` is a gap, not zero. With `stack="percent"`, each complete period fills to 100% and the headline and tiles read shares of the latest period; a missing, negative, or zero-total period becomes a gap across the whole stack.',
  rangesUsage: `<AreaChartCard
  title="Visitors"
  x="month"
  series={series}
  ranges={[
    { id: 'year', label: 'This year', data: thisYear, delta: 0.184 },
    { id: 'last-year', label: 'Last year', data: lastYear, delta: 0.062 },
  ]}
/>`,
  hover:
    'Hovering the plot moves Lilt’s hover dots along each series, with soft pills on the axes that fade the labels they pass over. The y pill follows the line nearest the pointer, even while a point is pinned. The headline counts to the hovered total and every tile shows its value at that point. Set `hover` to `tooltip` or `headline` for a different readout.',
  props: cartesianProps([
    {
      name: 'stack',
      type: "boolean | 'percent'",
      description:
        'Stack the areas: `true` adds them, `percent` shows shares. Omit to overlap them. Dashed series stay lines over the stack.',
    },
    {
      name: 'curve',
      type: "'smooth' | 'linear'",
      description: 'Monotone spline or straight segments.',
    },
    {
      name: 'bleed',
      type: 'boolean',
      description: 'Run areas to the card edges with a soft fade. Defaults to true.',
    },
    {
      name: 'pillValue',
      type: "'series' | 'stack'",
      description: 'In stacks, show a series’ own value (default) or its stacked height.',
    },
    {
      name: 'depth',
      type: 'boolean',
      description:
        'Draws each line as a lit tube with a soft shadow over its fade. Every point reads where the flat line puts it.',
    },
    decimateProp,
  ]),
  examples: [
    areaForecastFanExample,
    streamgraphExample,
    cardExample({
      id: 'overlap',
      title: 'Overlap',
      description:
        'The default. Translucent series share one baseline, so you can compare them directly.',
      kind: 'area',
      source: 'visitors',
      props: { title: 'Visitors', x: 'month', series: visitorSeries, delta: 0.184 },
    }),
    cardExample({
      id: 'stacked',
      title: 'Stacked',
      description:
        'Series add up, so the top edge is the total. Use it when the parts make a whole.',
      kind: 'area',
      source: 'visitors',
      props: {
        title: 'Visitors',
        x: 'month',
        series: visitorSeries,
        stack: true,
        delta: 0.184,
      },
    }),
    cardExample({
      id: 'percent',
      title: 'Percent',
      description:
        'Every x position fills to 100%, so the chart reads as share rather than volume. The headline and tiles read shares of the latest month.',
      kind: 'area',
      source: 'visitors',
      props: { title: 'Visitor mix', x: 'month', series: visitorSeries, stack: 'percent' },
    }),
    cardExample({
      id: 'linear',
      title: 'Straight segments',
      description: 'Swap the monotone spline for straight lines between observations.',
      kind: 'area',
      source: 'visitors',
      props: {
        title: 'Visitors',
        x: 'month',
        series: visitorSeries,
        stack: true,
        curve: 'linear',
      },
    }),
    cardExample({
      id: 'dates',
      title: 'Dates and a previous period',
      description:
        'Date values on x are detected automatically. A dashed series draws a reference line without a fill.',
      kind: 'area',
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
      id: 'goal',
      title: 'Target',
      description:
        '`target` draws a labeled goal line. At rest the header counts days on target; hover reads each day against it.',
      kind: 'area',
      source: 'dailyRevenue',
      props: {
        title: 'Revenue',
        valueFormat: usd,
        x: 'date',
        series: [{ key: 'revenue', label: 'Revenue' }],
        target: 3000,
      },
    }),
    cardExample({
      id: 'forecast',
      title: 'Forecast',
      description:
        'Rows from `forecast.from` onward are projections: dotted, shaded, and left out of the headline and tiles. `lower` and `upper` add the range around them.',
      kind: 'area',
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
      id: 'loading',
      title: 'Loading',
      description:
        'Pass `loading` while data is on its way. The plot shows a skeleton, not fake values.',
      kind: 'area',
      source: 'visitors',
      props: {
        title: 'Visitors',
        x: 'month',
        series: visitorSeries,
        stack: true,
        loading: true,
      },
    }),
    cardExample({
      id: 'depth',
      title: '3D',
      description:
        'Each line becomes a lit tube with a soft shadow over its fade. Every point still reads where the flat chart puts it.',
      kind: 'area',
      source: 'visitors',
      props: { title: 'Visitors', x: 'month', series: visitorSeries, delta: 0.184, depth: true },
    }),
    cardExample({
      id: 'legend-list',
      title: 'List legend',
      description:
        'One row per series with its value aligned right; hairlines keep long lists easy to scan.',
      kind: 'area',
      source: 'visitors',
      props: { title: 'Visitors', x: 'month', series: visitorSeries, delta: 0.184, legend: 'list' },
    }),
  ],
} satisfies CardDocContent;

/** Shown on the home page for a Feature; not a variant of the chart itself. */
export const areaLinkedExample: CardExampleRow = {
  id: 'linked',
  title: 'Linked hover',
  description:
    'Cards that share a `sync` name hover together: every card shows its marks, pills, and headline for the same day.',
  kind: 'area',
  row: [
    cardExample({
      id: 'linked-revenue',
      title: 'Revenue',
      description: '',
      kind: 'area',
      source: 'dailyKpis',
      props: {
        title: 'Revenue',
        valueFormat: usd,
        x: 'date',
        series: [{ key: 'revenue', label: 'Revenue' }],
        tiles: false,
        height: 160,
        sync: 'area-kpis',
      },
    }),
    cardExample({
      id: 'linked-users',
      title: 'Active users',
      description: '',
      kind: 'area',
      source: 'dailyKpis',
      props: {
        title: 'Active users',
        x: 'date',
        series: [{ key: 'activeUsers', label: 'Active users' }],
        aggregate: 'last',
        tiles: false,
        height: 160,
        palette: 'emerald',
        sync: 'area-kpis',
      },
    }),
  ],
};

export const areaDoc = curate(areaContent, {
  drop: ['overlap', 'stacked', 'percent', 'linear', 'depth', 'legend-list'],
  style: { goal: { curve: 'linear' } },
});
