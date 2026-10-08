import { divergingExample, divergingForm } from './expansion-variants';
import { curate, cartesianProps, type CardDocContent } from './content';
import { cardExample } from './examples';

const usd = { style: 'currency', currency: 'USD', maximumFractionDigits: 0 } as const;

const channelSeries = [
  { key: 'online', label: 'Online' },
  { key: 'retail', label: 'Retail' },
] as const;

export const isometricBarExample = cardExample({
  id: 'isometric',
  title: '3D',
  description:
    'Square blocks with a lit top and a shaded side. Read the value at the front face; hover and pin work as usual.',
  kind: 'bar',
  source: 'weekdayEarnings',
  props: {
    title: 'Earnings',
    x: 'day',
    series: [{ key: 'earnings', label: 'Earnings' }],
    valueFormat: usd,
    range: 'This week',
    delta: 0.092,
    depth: true,
    barWidth: 52,
    height: 300,
    tiles: false,
  },
});

const heroExample = cardExample({
  id: 'hero',
  title: 'Bar chart card',
  description: '',
  kind: 'bar',
  source: 'orderRanges',
  props: { title: 'Orders', x: 'month', series: channelSeries },
});

const barContent: CardDocContent = {
  forms: [divergingForm],
  kind: 'bar',
  title: 'Bar chart',
  lede: 'Compare amounts side by side, stacked, or as shares.',
  heroFile: 'OrdersCard.tsx',
  hero: heroExample,
  usage: `<BarChartCard
  title="Orders"
  data={orders}
  x="month"
  series={[{ key: 'online' }, { key: 'retail' }]}
/>`,
  dataShape: `// One row per x position, one numeric field per series.
const orders = [
  { month: 'Jan', online: 420, retail: 310, target: 700 },
  { month: 'Feb', online: 460, retail: 290, target: 720 },
];

<BarChartCard
  title="Orders"
  data={orders}
  x="month"
  series={[
    { key: 'online', label: 'Online' },
    { key: 'target', label: 'Target', dashed: true }, // a line over the bars
  ]}
/>`,
  dataNote:
    'Pass your rows as they are. `x` and each series `key` name fields on the row, and TypeScript rejects keys that don’t exist or aren’t numbers. A dashed series is always a reference line over the bars, grouped or stacked, and stays out of the headline. `null` leaves an empty slot, not a zero bar. With `stack="percent"`, each complete period fills to 100% and the headline and tiles read shares of the latest period. A missing, negative, or zero-total period becomes a gap across the whole stack, and hiding a series keeps the original denominator.',
  rangesUsage: `<BarChartCard
  title="Orders"
  x="month"
  series={series}
  ranges={[
    { id: 'year', label: 'This year', data: thisYear, delta: 0.143 },
    { id: 'last-year', label: 'Last year', data: lastYear, delta: 0.071 },
  ]}
/>`,
  hover:
    'Hovering a slot lifts its bars while the rest recede, the headline counts to that period’s total, and every tile shows its value there. Click to pin a period; arrow keys move it. Set `hover` to `tooltip` or `headline` for a different readout.',
  props: cartesianProps([
    {
      name: 'stack',
      type: "boolean | 'percent'",
      description:
        'Stack the bars: `true` adds them, `percent` shows shares. Omit to group them side by side. Dashed series stay lines over the stack.',
    },
    {
      name: 'radius',
      type: 'number',
      description: 'Corner radius in pixels. Defaults to 6.',
    },
    {
      name: 'corners',
      type: "'end' | 'all'",
      description:
        'Round only the value end (default) or every corner, so stacked segments read as separate rounded blocks.',
    },
    {
      name: 'tracks',
      type: 'boolean',
      description: 'Quiet full-height lanes behind each bar, or behind each stacked column.',
    },
    { name: 'barWidth', type: 'number', description: 'Maximum bar width in pixels.' },
    {
      name: 'barStyle',
      type: "'solid' | 'segmented' | 'needle' | 'gradient' | 'outline' | 'isometric'",
      description:
        'How bars are drawn. Needles expand on hover; segmented cells trim to the exact value. Isometric bars are square prisms with a lit top and shaded side; the front keeps the measured height and `radius` does not apply.',
    },
    {
      name: 'depth',
      type: 'boolean',
      description:
        'Shorthand for `barStyle="isometric"`: square blocks with a lit top and a shaded side. The front keeps the measured height.',
    },
    {
      name: 'aggregate',
      type: "'sum' | 'mean' | 'last' | 'max'",
      description: 'How the headline and tiles summarize the period. Defaults to sum.',
    },
    {
      name: 'bleed',
      type: 'boolean',
      description: 'Bars stay inside the card padding by default so labels center on them.',
    },
  ]),
  examples: [
    divergingExample,
    cardExample({
      id: 'segmented',
      title: 'Thirty days of sales',
      description:
        'A month of daily, stacked sales built from small cells like a level meter. Stacked cells run straight across the color change, and the top cell is trimmed to the exact value.',
      kind: 'bar',
      source: 'dailySales',
      props: {
        title: 'Sales',
        valueFormat: usd,
        x: 'date',
        series: [
          { key: 'newUsers', label: 'New users' },
          { key: 'existing', label: 'Existing users' },
        ],
        stack: true,
        barStyle: 'segmented',
        radius: 2,
        delta: 0.015,
        range: 'Last 30 days',
      },
    }),
    cardExample({
      id: 'needle',
      title: 'A year at a glance',
      description:
        'Thin needles keep twelve months quiet. The one you hover expands into a full bar with its value above it.',
      kind: 'bar',
      source: 'campaignRevenue',
      props: {
        title: 'Campaign revenue',
        valueFormat: usd,
        x: 'month',
        series: [{ key: 'revenue', label: 'Revenue' }],
        barStyle: 'needle',
        barWidth: 22,
        tiles: false,
        delta: 0.052,
      },
    }),
    cardExample({
      id: 'category',
      title: 'By category',
      description:
        'Put a text field on `x` and every bar gets its name. Here, revenue by acquisition channel, each bar fading toward its baseline.',
      kind: 'bar',
      source: 'channelRevenue',
      props: {
        title: 'Revenue by channel',
        valueFormat: usd,
        x: 'channel',
        series: [{ key: 'revenue', label: 'Revenue' }],
        barStyle: 'gradient',
        radius: 8,
        barWidth: 48,
        tiles: false,
        range: 'Sep 2026',
      },
    }),
    cardExample({
      id: 'goal',
      title: 'A daily goal',
      description:
        'A single `target` value draws a labeled line across every bar and counts the days that reach it, over rounded bars on quiet lanes.',
      kind: 'bar',
      source: 'weekdayEarnings',
      props: {
        title: 'Earnings',
        valueFormat: usd,
        x: 'day',
        series: [{ key: 'earnings', label: 'Earnings' }],
        target: { value: 4000, label: 'Goal' },
        corners: 'all',
        tracks: true,
        radius: 10,
        barWidth: 36,
        tiles: false,
        range: 'This week',
      },
    }),
    cardExample({
      id: 'stacked-target',
      title: 'Against a target',
      description:
        'A dashed target series stays a line over the stack on the same scale, so you see which months cleared it. Each channel is its own rounded block over one lane per month.',
      kind: 'bar',
      source: 'orders',
      props: {
        title: 'Orders',
        x: 'month',
        series: [
          ...channelSeries,
          { key: 'target', label: 'Target', color: 'var(--lilt-reference)', dashed: true },
        ],
        stack: true,
        corners: 'all',
        tracks: true,
        radius: 8,
        barWidth: 28,
        delta: 0.143,
      },
    }),
    cardExample({
      id: 'forecast',
      title: 'Projected months',
      description:
        'Months from `forecast.from` onward draw dotted and stay out of the total until they are real.',
      kind: 'bar',
      source: 'orders',
      props: {
        title: 'Orders',
        x: 'month',
        series: channelSeries,
        stack: true,
        forecast: { from: 'Nov' },
      },
    }),
  ],
};

export const barDoc = curate(barContent, {});
