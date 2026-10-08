import { cartesianProps, curate, type CardDocContent } from './content';
import { cardExample } from './examples';

const usd = { style: 'currency', currency: 'USD', maximumFractionDigits: 0 } as const;
const rate = { style: 'percent', maximumFractionDigits: 1 } as const;

const comboContent: CardDocContent = {
  kind: 'combo',
  title: 'Combo chart',
  lede: 'Bring amounts and trends together with bars and lines.',
  heroFile: 'RevenueCard.tsx',
  hero: cardExample({
    id: 'hero',
    title: 'Combo chart card',
    description: '',
    kind: 'combo',
    source: 'financeRanges',
    props: {
      title: 'Revenue',
      valueFormat: usd,
      x: 'month',
      bars: [{ key: 'revenue', label: 'Revenue' }],
      lines: [{ key: 'budget', label: 'Budget', dashed: true }],
    },
  }),
  usage: `<ComboChartCard
  title="Revenue"
  data={finance}
  x="month"
  bars={[{ key: 'revenue' }]}
  lines={[{ key: 'budget' }]}
/>`,
  dataShape: `// One row per x position, one numeric field per bar or line.
const finance = [
  { month: 'Jan', revenue: 42000, budget: 44000, margin: 0.262 },
  { month: 'Feb', revenue: 46000, budget: 46000, margin: 0.283 },
];

<ComboChartCard
  title="Revenue"
  data={finance}
  x="month"
  bars={[{ key: 'revenue', label: 'Revenue' }]}
  lines={[
    // A rate on its own scale, with its own format and summary.
    { key: 'margin', label: 'Margin', valueFormat: { style: 'percent' } },
  ]}
  lineScale="own"
/>`,
  dataNote:
    'Pass your rows as they are; `x`, and every `key` in `bars` and `lines`, are checked against your row type. The headline totals the bars only, since a budget or a rate is not part of the amount. Each series gets a tile. `null` is an empty bar slot or a gap in the line, never zero.',
  rangesUsage: `<ComboChartCard
  title="Revenue"
  x="month"
  bars={bars}
  lines={lines}
  ranges={[
    { id: 'year', label: 'This year', data: thisYear, delta: 0.212 },
    { id: 'last-year', label: 'Last year', data: lastYear, delta: 0.094 },
  ]}
/>`,
  hover:
    'Hovering a month lifts its bars and puts Lilt’s hover dot on each line. The pill reads the bar under the pointer, or the line when the pointer comes close to it, even while a month is pinned. The headline counts to that month’s bar total and every tile shows its value there. Set `hover` to `tooltip` or `headline` for a different readout.',
  props: cartesianProps([
    {
      name: 'bars',
      type: '{ key, label?, color? }[]',
      description: 'Numeric fields drawn as grouped bars. They make up the headline.',
    },
    {
      name: 'lines',
      type: '{ key, label?, color?, dashed?, valueFormat?, aggregate? }[]',
      description: 'Numeric fields drawn over the bars, e.g. a budget, a forecast, or a rate.',
    },
    {
      name: 'lineScale',
      type: "'shared' | 'own'",
      description:
        'Shared (default) compares lines against bar heights directly. Own fits lines to their own scale for a different unit, labelled on the right with the same gridlines.',
    },
    {
      name: 'radius',
      type: 'number',
      description: 'Corner radius of each bar’s value end. Defaults to 6.',
    },
    { name: 'barWidth', type: 'number', description: 'Maximum bar width in pixels.' },
    {
      name: 'barStyle',
      type: "'solid' | 'segmented' | 'needle' | 'gradient' | 'outline' | 'isometric'",
      description: 'How bars are drawn.',
    },
    { name: 'curve', type: "'smooth' | 'linear'", description: 'Line shape. Smooth by default.' },
    { name: 'points', type: 'boolean', description: 'Dots on line observations. On by default.' },
    {
      name: 'aggregate',
      type: "'sum' | 'mean' | 'last' | 'max'",
      description:
        'How the headline and tiles summarize the period. Lines on their own scale average by default.',
    },
    {
      name: 'depth',
      type: 'boolean',
      description: 'Bars become solid blocks and lines lit tubes. Both keep their exact values.',
    },
  ]).filter((row) => row.name !== 'series'),
  examples: [
    cardExample({
      id: 'budget',
      title: 'Against a budget',
      description:
        'The default shared scale: bar heights and the dashed budget line compare directly, so you see which months beat the plan.',
      kind: 'combo',
      source: 'finance',
      props: {
        title: 'Revenue',
        valueFormat: usd,
        x: 'month',
        bars: [{ key: 'revenue', label: 'Revenue' }],
        lines: [{ key: 'budget', label: 'Budget', dashed: true }],
        delta: 0.212,
      },
    }),
    cardExample({
      id: 'own-scale',
      title: 'A rate on its own scale',
      description:
        'Margin is a percentage, so `lineScale="own"` fits it to its own scale. Its tile averages the year, and its pill and tile use its own `valueFormat`.',
      kind: 'combo',
      source: 'finance',
      props: {
        title: 'Revenue and margin',
        valueFormat: usd,
        x: 'month',
        bars: [{ key: 'revenue', label: 'Revenue' }],
        lines: [{ key: 'margin', label: 'Margin', valueFormat: rate }],
        lineScale: 'own',
        delta: 0.212,
      },
    }),
    cardExample({
      id: 'classic',
      title: 'Two labelled scales',
      description:
        'With the classic axis, bar values sit on the left and the line’s scale on the right. Both share one set of gridlines, so every label lines up.',
      kind: 'combo',
      source: 'finance',
      props: {
        title: 'Revenue and margin',
        valueFormat: usd,
        x: 'month',
        bars: [{ key: 'revenue', label: 'Revenue' }],
        lines: [{ key: 'margin', label: 'Margin', valueFormat: rate }],
        lineScale: 'own',
        axis: 'classic',
      },
    }),
    cardExample({
      id: 'grouped',
      title: 'Grouped bars and a line',
      description: 'Revenue and costs side by side, with margin tracing the gap between them.',
      kind: 'combo',
      source: 'finance',
      props: {
        title: 'Revenue and costs',
        valueFormat: usd,
        x: 'month',
        bars: [
          { key: 'revenue', label: 'Revenue' },
          { key: 'costs', label: 'Costs' },
        ],
        lines: [{ key: 'margin', label: 'Margin', valueFormat: rate }],
        lineScale: 'own',
        headlineSeries: 'revenue',
      },
    }),
    cardExample({
      id: 'straight',
      title: 'Straight line, quiet bars',
      description: 'A linear line without dots over gradient bars, for a lighter look.',
      kind: 'combo',
      source: 'finance',
      props: {
        title: 'Revenue',
        valueFormat: usd,
        x: 'month',
        bars: [{ key: 'revenue', label: 'Revenue' }],
        lines: [{ key: 'budget', label: 'Budget' }],
        curve: 'linear',
        points: false,
        barStyle: 'gradient',
      },
    }),
    cardExample({
      id: 'loading',
      title: 'Loading',
      description: 'The skeleton draws bars and a line in the right layout.',
      kind: 'combo',
      source: 'finance',
      props: {
        title: 'Revenue',
        x: 'month',
        bars: [{ key: 'revenue' }],
        lines: [{ key: 'budget' }],
        loading: true,
      },
    }),
    cardExample({
      id: 'depth',
      title: '3D',
      description:
        'Bars become solid blocks and the line a lit tube; both still read their exact values.',
      kind: 'combo',
      source: 'finance',
      props: {
        title: 'Revenue',
        valueFormat: usd,
        x: 'month',
        bars: [{ key: 'revenue', label: 'Revenue' }],
        lines: [{ key: 'budget', label: 'Budget', dashed: true }],
        delta: 0.212,
        depth: true,
      },
    }),
  ],
};

export const comboDoc = curate(comboContent, {
  drop: ['budget', 'classic', 'straight', 'depth'],
  style: { 'own-scale': { barStyle: 'gradient' }, grouped: { barStyle: 'outline' } },
});
