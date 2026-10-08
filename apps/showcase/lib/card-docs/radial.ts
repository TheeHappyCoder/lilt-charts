import { nesteddonutExample, nesteddonutForm } from './expansion-variants';
import { cardProps, curate, type CardDocContent } from './content';
import { cardExample } from './examples';

const usd = { style: 'currency', currency: 'USD', maximumFractionDigits: 0 } as const;

const radialContent = {
  forms: [nesteddonutForm],
  kind: 'radial',
  title: 'Radial chart',
  lede: 'Show how each part contributes to the whole.',
  heroFile: 'ChannelShareCard.tsx',
  hero: cardExample({
    id: 'hero',
    title: 'Radial chart card',
    description: '',
    kind: 'radial',
    source: 'channelRanges',
    props: {
      title: 'Revenue by channel',
      category: 'channel',
      value: 'revenue',
      valueFormat: usd,
    },
  }),
  usage: `<RadialChartCard
  title="Revenue by channel"
  data={channelRevenue}
  category="channel"
  value="revenue"
/>`,
  dataShape: `// One row per category, in any order. Names must be unique.
const channelRevenue = [
  { channel: 'Organic search', revenue: 42800 },
  { channel: 'Direct', revenue: 24100 },
  { channel: 'Referral', revenue: null }, // not reported: listed, not drawn
];

<RadialChartCard
  title="Revenue by channel"
  data={channelRevenue}
  category="channel" // a text field
  value="revenue"    // a numeric field, never negative
  limit={4}          // four slices, the rest as "Other"
/>`,
  dataNote:
    '`category` names a text field and `value` a numeric one; TypeScript rejects anything else. The headline is the total and each share is a slice’s part of it. `null` rows stay in the legend as “No data” but take no room in the circle. A slice can’t be negative, so a negative value shows an error instead of a misleading chart.',
  rangesUsage: `<RadialChartCard
  title="Revenue by channel"
  category="channel"
  value="revenue"
  ranges={[
    { id: 'month', label: 'This month', data: thisMonth, delta: 0.124 },
    { id: 'last-month', label: 'Last month', data: lastMonth, delta: 0.038 },
  ]}
/>`,
  hover:
    'Hovering a slice or its legend row lifts that slice, dims the rest, and counts the headline to its value with its name and share beside it. The donut’s center shows the share. Click to pin; legend rows are buttons, so Tab and the arrow keys work too. Escape clears the pin in every legend layout. With legend={false}, Tab focuses the graphic; arrows inspect, Home/End jump, and Enter/Space pin or release. Switching the period eases every slice to its new size, and each category keeps its color.',
  props: cardProps([
    { name: 'data', type: 'Row[]', description: 'One row per category. Omit when using ranges.' },
    { name: 'category', type: 'text key of Row', description: 'Names each slice. Must be unique.' },
    {
      name: 'value',
      type: 'numeric key of Row',
      description: 'Sizes each slice. Never negative; null is No data.',
    },
    {
      name: 'variant',
      type: "'donut' | 'pie' | 'semi' | 'rings'",
      description:
        'Donut (default) shows the share in the middle, pie fills the circle, semi is a half donut, and rings give each category its own ring.',
    },
    {
      name: 'legend',
      type: "false | 'tiles' | 'inline' | 'list' | 'pills' | 'bars'",
      description:
        'False removes the legend without changing the data. Ranked rows with shares (list), value tiles, an inline key, tinted pills, or bars against the largest. Rings default to tiles, semi to inline.',
    },
    {
      name: 'legendSwatch',
      type: "'square' | 'dot' | 'line'",
      description: 'The mark beside each legend label. Defaults to a rounded square.',
    },
    {
      name: 'limit',
      type: 'number',
      description: 'Slices before the rest become “Other”. Defaults to 5; Infinity shows all.',
    },
    { name: 'otherLabel', type: 'string', description: 'Label of the combined slice.' },
    {
      name: 'sort',
      type: "'descending' | 'ascending' | 'input'",
      description: 'Largest first by default; input keeps your order.',
    },
    {
      name: 'headline',
      type: 'number',
      description: 'Resting headline. Defaults to the total of all slices.',
    },
    { name: 'delta', type: 'number', description: 'Fractional change for the chip.' },
    {
      name: 'deltaTone',
      type: "'default' | 'inverse' | 'neutral'",
      description: 'Use inverse when a decrease is good.',
    },
    { name: 'range', type: 'string', description: 'Static period label in the header.' },
    {
      name: 'selected',
      type: 'string | null',
      description:
        'The pinned category, by name, when you own the selection, so outside filters and a click on the chart share it. `null` pins nothing; omit it and the card keeps its own pin.',
    },
    {
      name: 'onSelectedChange',
      type: '(category: string | null) => void',
      description: 'Asked when a click, tap, or Escape pins or releases a category.',
    },
    {
      name: 'colors',
      type: 'Record<string, string>',
      description:
        'Fixed colors by category name, e.g. `{ Critical: "#ef4444" }`. Others take the palette and keep it as values change.',
    },
    {
      name: 'center',
      type: '({ category, value, share, active, pinned }) => ReactNode',
      description:
        'Replaces the middle of a donut or half donut, which by default shows the share of the hovered, pinned, or largest category.',
    },
    {
      name: 'ranges',
      type: '{ id, label, data, delta?, headline? }[]',
      description: 'Turns the period label into a select. Each range swaps the rows.',
    },
    {
      name: 'depth',
      type: 'boolean',
      description:
        'Lights every slice or ring as a tube, makes ring tracks grooves, and adds a soft shadow. Outlines keep their exact angles.',
    },
  ]),
  examples: [
    nesteddonutExample,
    cardExample({
      id: 'donut',
      title: 'Donut',
      description:
        'The default. The largest slice’s share sits in the middle until you hover another.',
      kind: 'radial',
      source: 'channelRevenue',
      props: {
        title: 'Revenue by channel',
        category: 'channel',
        value: 'revenue',
        valueFormat: usd,
        delta: 0.124,
        range: 'This month',
      },
    }),
    cardExample({
      id: 'pie',
      title: 'Pie',
      description: 'The full circle, for a few large parts such as a device split.',
      kind: 'radial',
      source: 'deviceSessions',
      props: {
        title: 'Sessions by device',
        category: 'device',
        value: 'sessions',
        variant: 'pie',
        delta: 0.071,
      },
    }),
    cardExample({
      id: 'semi',
      title: 'Half donut',
      description:
        'A thick half ring with rounded ends and the leading share in its opening. It suits two or three parts, such as a device split.',
      kind: 'radial',
      source: 'deviceVisitors',
      props: {
        title: 'Visitors',
        category: 'device',
        value: 'visitors',
        variant: 'semi',
        delta: 0.052,
        range: 'Last 7 days',
      },
    }),
    cardExample({
      id: 'rings',
      title: 'Concentric rings',
      description:
        'Each category gets its own ring, largest outside. Every ring is measured on one shared scale that rounds up past the largest value, so ring lengths compare directly and a full circle is never implied.',
      kind: 'radial',
      source: 'browserVisitors',
      props: {
        title: 'Visitors',
        category: 'browser',
        value: 'visitors',
        variant: 'rings',
        delta: 0.052,
        range: 'Last 7 days',
      },
    }),
    cardExample({
      id: 'tiles',
      title: 'Donut with value tiles',
      description: '`legend="tiles"` swaps the ranked list for the value tiles other cards use.',
      kind: 'radial',
      source: 'deviceSessions',
      props: {
        title: 'Sessions by device',
        category: 'device',
        value: 'sessions',
        legend: 'tiles',
      },
    }),
    cardExample({
      id: 'other',
      title: 'Many categories',
      description:
        'Nine sources, five slices: past the `limit` the rest add up to one gray “Other” slice, so colors stay distinct and the total stays true.',
      kind: 'radial',
      source: 'trafficSources',
      props: { title: 'Sessions by source', category: 'source', value: 'sessions' },
    }),
    cardExample({
      id: 'missing',
      title: 'Missing values',
      description:
        'Design hasn’t reported yet. It stays in the legend as “No data” and takes no room in the circle, so the other shares are of what is known.',
      kind: 'radial',
      source: 'teamSpend',
      props: {
        title: 'Spend by team',
        category: 'team',
        value: 'spend',
        valueFormat: usd,
        range: 'Q3',
      },
    }),
    cardExample({
      id: 'input-order',
      title: 'Your order',
      description: '`sort="input"` keeps slices in the order you pass them.',
      kind: 'radial',
      source: 'channelRevenue',
      props: {
        title: 'Revenue by channel',
        category: 'channel',
        value: 'revenue',
        valueFormat: usd,
        sort: 'input',
      },
    }),
    cardExample({
      id: 'loading',
      title: 'Loading',
      description: 'The ring and legend hold their space while data is on its way.',
      kind: 'radial',
      source: 'channelRevenue',
      props: { title: 'Revenue by channel', category: 'channel', value: 'revenue', loading: true },
    }),
    cardExample({
      id: 'depth',
      title: '3D',
      description:
        'Each slice is lit as a tube with a soft shadow. Outlines keep their exact angles, so shares read the same.',
      kind: 'radial',
      source: 'channelRevenue',
      props: {
        title: 'Revenue by channel',
        category: 'channel',
        value: 'revenue',
        valueFormat: usd,
        delta: 0.124,
        range: 'This month',
        depth: true,
      },
    }),
    cardExample({
      id: 'legend-pills',
      title: 'Pill legend',
      description: 'Round marks in tinted pills, a compact key under a donut.',
      kind: 'radial',
      source: 'channelRevenue',
      props: {
        title: 'Revenue by channel',
        category: 'channel',
        value: 'revenue',
        valueFormat: usd,
        delta: 0.124,
        range: 'This month',
        legend: 'pills',
        legendSwatch: 'dot',
      },
    }),
  ],
} satisfies CardDocContent;

export const radialDoc = curate(radialContent, {
  drop: ['pie', 'semi', 'rings', 'input-order', 'donut', 'tiles', 'depth', 'legend-pills'],
  style: { other: { variant: 'semi' }, missing: { variant: 'pie' } },
});
