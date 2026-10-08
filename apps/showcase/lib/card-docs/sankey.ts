import { cardProps, curate, type CardDocContent } from './content';
import { cardExample } from './examples';

const visitorKeys = { source: 'from', target: 'to', value: 'visitors' } as const;

const sankeyContent: CardDocContent = {
  kind: 'sankey',
  title: 'Sankey chart',
  lede: 'Trace how values flow from one stage to the next.',
  heroFile: 'VisitorFlowCard.tsx',
  hero: cardExample({
    id: 'hero',
    title: 'Sankey chart card',
    description: '',
    kind: 'sankey',
    source: 'visitorFlowRanges',
    props: { title: 'Visitor flow', ...visitorKeys },
  }),
  usage: `<SankeyChartCard
  title="Visitor flow"
  data={visitorFlow}
  source="from"
  target="to"
  value="visitors"
/>`,
  dataShape: `// One row per flow, from one step to the next.
const visitorFlow = [
  { from: 'Search', to: 'Pricing', visitors: 2400 },
  { from: 'Pricing', to: 'Signed up', visitors: 1300 },
  { from: 'Email', to: 'Product tour', visitors: null }, // not measured
  // …
];

<SankeyChartCard
  title="Visitor flow"
  data={visitorFlow}
  source="from"     // a text field: the step a flow leaves
  target="to"       // a text field: the step it reaches
  value="visitors"  // a numeric field
/>`,
  dataNote:
    'Each row is one flow: `source` and `target` name the steps, and `value` says how much moved; TypeScript rejects anything else. Steps come from the names themselves and fall into columns by how many steps lead to them. Flows must move forward, so a loop shows an error. A step may pass on less than it receives, as when visitors leave without a tracked exit; `conservation="strict"` requires every middle step to balance. A flow that is `null` isn’t drawn, the footer says so, and totals count measured flows only.',
  rangesUsage: `<SankeyChartCard
  title="Visitor flow"
  source="from"
  target="to"
  value="visitors"
  ranges={[
    { id: 'week', label: 'This week', data: thisWeek, delta: 0.163 },
    { id: 'last-week', label: 'Last week', data: lastWeek, delta: 0.042 },
  ]}
/>`,
  hover:
    'Hovering a ribbon reads that flow in the headline with its share of the step it left: “Pricing → Signed up · 34% of Pricing”. Hovering a step reads its total, its share of all traffic, and how many left there without a tracked flow. Everything unconnected dims. Click to pin. The diagram is one tab stop: arrow keys step through flows from left to right, Enter pins, and Escape lets go. Flows sweep in from the left on first view and when the period changes.',
  props: cardProps([
    { name: 'data', type: 'Row[]', description: 'One row per flow. Omit when using ranges.' },
    { name: 'source', type: 'text key of Row', description: 'Names the step a flow leaves.' },
    { name: 'target', type: 'text key of Row', description: 'Names the step a flow reaches.' },
    {
      name: 'value',
      type: 'numeric key of Row',
      description: 'How much moved. `null` means not measured: not drawn, and not counted.',
    },
    {
      name: 'conservation',
      type: "'loss' | 'strict'",
      description:
        'Loss (default) lets a step pass on less than it receives; strict requires every middle step to balance.',
    },
    { name: 'height', type: 'number', description: 'Plot height in pixels. Defaults to 280.' },
    {
      name: 'headline',
      type: 'number',
      description: 'Resting headline. Defaults to everything entering the first steps.',
    },
    { name: 'delta', type: 'number', description: 'Fractional change for the chip.' },
    {
      name: 'deltaTone',
      type: "'default' | 'inverse' | 'neutral'",
      description: 'Use inverse when a decrease is good.',
    },
    { name: 'range', type: 'string', description: 'Static period label in the header.' },
    {
      name: 'ranges',
      type: '{ id, label, data, delta?, headline? }[]',
      description: 'Turns the period label into a select. Each range swaps the flows.',
    },
    {
      name: 'depth',
      type: 'boolean',
      description: 'Draws flows as lit pipes of their exact width and nodes as small blocks.',
    },
  ]),
  examples: [
    cardExample({
      id: 'visitors',
      title: 'Visitor flow',
      description:
        'The default: sources on the left, the pages visitors reached in the middle, and where they ended up on the right. Each step shows its total.',
      kind: 'sankey',
      source: 'visitorFlow',
      props: { title: 'Visitor flow', ...visitorKeys, delta: 0.163, range: 'This week' },
    }),
    cardExample({
      id: 'dropoff',
      title: 'Drop-off between steps',
      description:
        'Each checkout step passes on fewer people than it receives. Hover Shipping to read how many left there, even though no flow records where they went.',
      kind: 'sankey',
      source: 'checkoutFlow',
      props: { title: 'Checkout', ...visitorKeys, height: 200 },
    }),
    cardExample({
      id: 'money',
      title: 'Balanced flows',
      description:
        'A budget has to add up, so `conservation="strict"` shows an error if Salaries passes on more or less than it receives. `valueFormat` makes every amount read as currency.',
      kind: 'sankey',
      source: 'budgetFlow',
      props: {
        title: 'Where revenue goes',
        source: 'from',
        target: 'to',
        value: 'amount',
        conservation: 'strict',
        valueFormat: { style: 'currency', currency: 'USD', notation: 'compact' },
      },
    }),
    cardExample({
      id: 'missing',
      title: 'A flow that isn’t measured',
      description:
        'Email → Product tour wasn’t instrumented yet. It isn’t drawn, the footer says so, and Email’s total counts only what was measured.',
      kind: 'sankey',
      source: 'visitorFlowWithGap',
      props: { title: 'Visitor flow', ...visitorKeys },
    }),
    cardExample({
      id: 'loading',
      title: 'Loading',
      description: 'Placeholder ribbons hold the space while data is on its way.',
      kind: 'sankey',
      source: 'visitorFlow',
      props: { title: 'Visitor flow', ...visitorKeys, loading: true },
    }),
    cardExample({
      id: 'depth',
      title: '3D',
      description: 'Flows become lit pipes of their exact width, and nodes small blocks.',
      kind: 'sankey',
      source: 'visitorFlow',
      props: {
        title: 'Visitor flow',
        ...visitorKeys,
        delta: 0.163,
        range: 'This week',
        depth: true,
      },
    }),
  ],
};

export const sankeyDoc = curate(sankeyContent, { drop: ['visitors', 'depth'] });
