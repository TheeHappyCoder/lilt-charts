import { cardProps, curate, type CardDocContent } from './content';
import { cardExample } from './examples';

const usd = {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 1,
} as const;
const share = { style: 'percent', maximumFractionDigits: 0 } as const;

const slopeContent: CardDocContent = {
  kind: 'slope',
  title: 'Slope chart',
  lede: 'Compare two periods and see who rose and who fell.',
  heroFile: 'RegionsCard.tsx',
  hero: cardExample({
    id: 'hero',
    title: 'Slope chart card',
    description: '',
    kind: 'slope',
    source: 'regionRanges',
    props: {
      title: 'Revenue by region',
      category: 'region',
      from: 'lastYear',
      to: 'thisYear',
      fromLabel: 'Before',
      toLabel: 'After',
      valueFormat: usd,
    },
  }),
  usage: `<SlopeChartCard
  title="Revenue by region"
  data={regionRevenue}
  category="region"
  from="lastYear"
  to="thisYear"
/>`,
  dataShape: `// One row per category, with a numeric field for each period.
const regionRevenue = [
  { region: 'North America', lastYear: 412000, thisYear: 486000 },
  { region: 'Nordics', lastYear: null, thisYear: 64000 }, // new this year
];

<SlopeChartCard
  title="Revenue by region"
  data={regionRevenue}
  category="region" // a text field
  from="lastYear"   // a numeric field
  to="thisYear"     // another numeric field
  fromLabel="2025"
  toLabel="2026"
/>`,
  dataNote:
    '`category` names a text field; `from` and `to` name numeric fields, and TypeScript rejects anything else. The headline totals the later values (or averages them with `aggregate="mean"`). The change beside it compares only categories measured in both periods, so a new or late-reporting category never reads as growth or loss. Percentages appear only against a positive starting value.',
  rangesUsage: `<SlopeChartCard
  title="Revenue by region"
  category="region"
  from="lastYear"
  to="thisYear"
  ranges={[
    { id: 'year', label: '2025 → 2026', data: byYear },
    { id: 'half', label: 'H1 → H2', data: byHalf },
  ]}
/>`,
  hover:
    'Hovering a line or row brightens it and dims the rest, and the headline counts to that category’s later value with its change beside it. Click to pin a category. Each one is a button: Tab reaches the chart, arrow keys move between categories, Escape unpins. Lines grow from their earlier value on first draw and re-tilt when the period changes.',
  props: cardProps([
    {
      name: 'data',
      type: 'Row[]',
      description: 'One row per category with both values. Omit when using ranges.',
    },
    { name: 'category', type: 'text key of Row', description: 'Names each row. Must be unique.' },
    { name: 'from', type: 'numeric key of Row', description: 'The earlier value.' },
    { name: 'to', type: 'numeric key of Row', description: 'The later value.' },
    {
      name: 'fromLabel',
      type: 'string',
      description: 'Names the earlier period. Defaults to the key.',
    },
    {
      name: 'toLabel',
      type: 'string',
      description: 'Names the later period. Defaults to the key.',
    },
    {
      name: 'variant',
      type: "'slope' | 'dumbbell'",
      description: 'Lines across two columns (default), or rows on one shared scale.',
    },
    {
      name: 'sort',
      type: "'change' | 'to' | 'input'",
      description: 'Largest gain first by default; `to` ranks by the later value.',
    },
    {
      name: 'aggregate',
      type: "'sum' | 'mean'",
      description: 'How the headline summarizes categories. Use mean for rates and shares.',
    },
    {
      name: 'headline',
      type: 'number',
      description: 'Resting headline. Defaults to the later values, summarized.',
    },
    {
      name: 'delta',
      type: 'number',
      description: 'Fractional change for the chip. Defaults to the change in total.',
    },
    {
      name: 'deltaTone',
      type: "'default' | 'inverse' | 'neutral'",
      description: 'Use inverse when a decrease is good; it also swaps the line colors.',
    },
    { name: 'range', type: 'string', description: 'Static period label in the header.' },
    {
      name: 'ranges',
      type: '{ id, label, data, delta?, headline? }[]',
      description: 'Turns the period label into a select. Each range swaps the rows.',
    },
    {
      name: 'color',
      type: 'string',
      description: 'One color for every category instead of rise and fall colors.',
    },
    {
      name: 'height',
      type: 'number',
      description: 'Plot height of the slope variant in pixels. Defaults to 260.',
    },
    {
      name: 'depth',
      type: 'boolean',
      description:
        'Draws each change as a lit tube between two spheres. Dumbbells get the same look.',
    },
  ]),
  examples: [
    cardExample({
      id: 'default',
      title: 'Slope',
      description:
        'Rises take the positive color and falls the negative one, so the story reads before the numbers do.',
      kind: 'slope',
      source: 'regionRevenue',
      props: {
        title: 'Revenue by region',
        category: 'region',
        from: 'lastYear',
        to: 'thisYear',
        fromLabel: '2025',
        toLabel: '2026',
        valueFormat: usd,
      },
    }),
    cardExample({
      id: 'dumbbell',
      title: 'Dumbbell',
      description:
        'The same comparison as rows on one shared scale: the hollow dot is before, the solid dot after, and the bar between them is the change.',
      kind: 'slope',
      source: 'featureAdoption',
      props: {
        title: 'Feature adoption',
        category: 'feature',
        from: 'before',
        to: 'after',
        fromLabel: 'Before redesign',
        toLabel: 'After',
        variant: 'dumbbell',
        valueFormat: share,
        aggregate: 'mean',
      },
    }),
    cardExample({
      id: 'missing',
      title: 'New and missing categories',
      description:
        'A region that is new or still reporting keeps its known dot, says “No data” for the other, and stays out of the change.',
      kind: 'slope',
      source: 'regionsWithGap',
      props: {
        title: 'Revenue by region',
        category: 'region',
        from: 'lastYear',
        to: 'thisYear',
        fromLabel: '2025',
        toLabel: '2026',
        variant: 'dumbbell',
        valueFormat: usd,
      },
    }),
    cardExample({
      id: 'inverse',
      title: 'When down is good',
      description:
        '`deltaTone="inverse"` swaps the meaning of the colors for costs, churn, or response times.',
      kind: 'slope',
      source: 'regionRevenue',
      props: {
        title: 'Support costs by region',
        category: 'region',
        from: 'lastYear',
        to: 'thisYear',
        fromLabel: '2025',
        toLabel: '2026',
        valueFormat: usd,
        deltaTone: 'inverse',
      },
    }),
    cardExample({
      id: 'loading',
      title: 'Loading',
      description: 'A placeholder holds the plot’s space while data is on its way.',
      kind: 'slope',
      source: 'regionRevenue',
      props: {
        title: 'Revenue by region',
        category: 'region',
        from: 'lastYear',
        to: 'thisYear',
        loading: true,
      },
    }),
    cardExample({
      id: 'depth',
      title: '3D',
      description:
        'Each change becomes a lit tube between two spheres, ending exactly on its values.',
      kind: 'slope',
      source: 'regionRevenue',
      props: {
        title: 'Revenue by region',
        category: 'region',
        from: 'lastYear',
        to: 'thisYear',
        fromLabel: '2025',
        toLabel: '2026',
        valueFormat: usd,
        depth: true,
      },
    }),
  ],
};

export const slopeDoc = curate(slopeContent, { drop: ['dumbbell', 'default', 'depth'] });
