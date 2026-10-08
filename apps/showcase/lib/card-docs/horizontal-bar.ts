import { mirroredExample, mirroredForm } from './expansion-variants';
import { cardProps, curate, type CardDocContent } from './content';
import { cardExample } from './examples';

const usd = { style: 'currency', currency: 'USD', maximumFractionDigits: 0 } as const;

const horizontalBarContent: CardDocContent = {
  forms: [mirroredForm],
  kind: 'ranking',
  title: 'Horizontal bar',
  lede: 'Rank categories and see what leads.',
  heroFile: 'ChannelsCard.tsx',
  hero: cardExample({
    id: 'hero',
    title: 'Horizontal bar card',
    description: '',
    kind: 'ranking',
    source: 'channelRanges',
    props: {
      title: 'Revenue by channel',
      category: 'channel',
      value: 'revenue',
      valueFormat: usd,
    },
  }),
  usage: `<HorizontalBarChartCard
  title="Revenue by channel"
  data={channelRevenue}
  category="channel"
  value="revenue"
/>`,
  dataShape: `// One row per category, in any order. Names must be unique.
const channelRevenue = [
  { channel: 'Organic search', revenue: 42800 },
  { channel: 'Direct', revenue: 24100 },
  { channel: 'Referral', revenue: null }, // still reporting
];

<HorizontalBarChartCard
  title="Revenue by channel"
  data={channelRevenue}
  category="channel" // a text field
  value="revenue"    // a numeric field
  limit={5}          // top five, the rest as "Other"
/>`,
  dataNote:
    '`category` names a text field and `value` a numeric one; TypeScript rejects anything else. The headline is the total, and each share is a row’s part of it. `null` rows say “No data”, sort last, and stay out of the total. When values go negative, shares are hidden, because a share of a total that mixes gains and losses means nothing.',
  rangesUsage: `<HorizontalBarChartCard
  title="Revenue by channel"
  category="channel"
  value="revenue"
  ranges={[
    { id: 'month', label: 'This month', data: thisMonth, delta: 0.124 },
    { id: 'last-month', label: 'Last month', data: lastMonth, delta: 0.038 },
  ]}
/>`,
  hover:
    'Hovering a row brightens its bar and dims the rest, and the headline counts to that row with its name and share beside it. Click to pin a row. Rows are buttons: Tab reaches the list, arrow keys move through it, Escape unpins. Switching the period re-ranks rows with a smooth slide.',
  props: cardProps([
    { name: 'data', type: 'Row[]', description: 'One row per category. Omit when using ranges.' },
    { name: 'category', type: 'text key of Row', description: 'Names each row. Must be unique.' },
    { name: 'value', type: 'numeric key of Row', description: 'The amount to rank by.' },
    {
      name: 'sort',
      type: "'descending' | 'ascending' | 'input'",
      description: 'Largest first by default; input keeps your order.',
    },
    {
      name: 'limit',
      type: 'number',
      description: 'Show the first rows and add the rest together as one “Other” row.',
    },
    { name: 'otherLabel', type: 'string', description: 'Label of the combined row.' },
    {
      name: 'share',
      type: 'boolean',
      description: 'Each row’s share of the total. Defaults to true.',
    },
    { name: 'rank', type: 'boolean', description: 'Number each row by rank.' },
    {
      name: 'barStyle',
      type: "'inline' | 'track' | 'lollipop' | 'isometric'",
      description:
        'Inline puts the label on a soft bar (default); track draws a slim bar below it; lollipop uses a stem and dot; isometric adds depth.',
    },
    {
      name: 'headline',
      type: 'number',
      description: 'Resting headline. Defaults to the total of all rows.',
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
      name: 'ranges',
      type: '{ id, label, data, delta?, headline? }[]',
      description: 'Turns the period label into a select. Each range swaps the rows.',
    },
    { name: 'color', type: 'string', description: 'Any CSS color for the bars.' },
    {
      name: 'depth',
      type: 'boolean',
      description:
        'Shorthand for `barStyle="isometric"`: a solid block under each label with a lit roof and a shaded end. The front ends at the value.',
    },
  ]),
  examples: [
    mirroredExample,
    cardExample({
      id: 'default',
      title: 'Ranked with shares',
      description: 'The default: largest first, each label on a soft bar, value and share aligned.',
      kind: 'ranking',
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
      id: 'limit',
      title: 'Top five and the rest',
      description:
        '`limit` keeps the list short. Everything past it is added up into one “Other” row, so the total stays true.',
      kind: 'ranking',
      source: 'pageViews',
      props: { title: 'Top pages', category: 'page', value: 'views', limit: 5, rank: true },
    }),
    cardExample({
      id: 'track',
      title: 'Track bars',
      description: 'Labels read first, with a slim bar underneath. Good for long names.',
      kind: 'ranking',
      source: 'pageViews',
      props: {
        title: 'Top pages',
        category: 'page',
        value: 'views',
        limit: 5,
        barStyle: 'track',
      },
    }),
    cardExample({
      id: 'missing',
      title: 'Missing values',
      description:
        'Brazil hasn’t reported yet. It says so, sorts last, and stays out of the total and every share.',
      kind: 'ranking',
      source: 'countrySales',
      props: {
        title: 'Sales by country',
        category: 'country',
        value: 'sales',
        valueFormat: usd,
      },
    }),
    cardExample({
      id: 'negative',
      title: 'Gains and losses',
      description:
        'Bars grow both ways from zero. Shares are hidden because a share of a mixed total means nothing.',
      kind: 'ranking',
      source: 'productChange',
      props: {
        title: 'Revenue change by product',
        category: 'product',
        value: 'change',
        valueFormat: { ...usd, signDisplay: 'exceptZero' },
      },
    }),
    cardExample({
      id: 'input',
      title: 'Your order',
      description: '`sort="input"` keeps rows as supplied, e.g. a fixed product list.',
      kind: 'ranking',
      source: 'channelRevenue',
      props: {
        title: 'Revenue by channel',
        category: 'channel',
        value: 'revenue',
        valueFormat: usd,
        sort: 'input',
        share: false,
      },
    }),
    cardExample({
      id: 'loading',
      title: 'Loading',
      description: 'Placeholder rows hold the list’s space while data is on its way.',
      kind: 'ranking',
      source: 'channelRevenue',
      props: { title: 'Revenue by channel', category: 'channel', value: 'revenue', loading: true },
    }),
    cardExample({
      id: 'depth',
      title: '3D',
      description:
        'Each bar becomes a solid block under its label, with a lit roof and a shaded end. The front still ends at the value.',
      kind: 'ranking',
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
  ],
};

export const horizontalBarDoc = curate(horizontalBarContent, {
  drop: ['default', 'track', 'input', 'depth'],
  style: { limit: { barStyle: 'track' } },
});
