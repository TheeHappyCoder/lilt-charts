import {
  goalpacingExample,
  goalpacingForm,
  milestoneprogressExample,
  milestoneprogressForm,
} from './expansion-variants';
import { cardProps, curate, type CardDocContent } from './content';
import { valueExample } from './examples';

const progressContent: CardDocContent = {
  forms: [goalpacingForm, milestoneprogressForm],
  kind: 'progress',
  title: 'Progress',
  lede: 'See how far you have come toward a goal.',
  heroFile: 'VisitorsGoalCard.tsx',
  hero: valueExample({
    id: 'hero',
    title: 'Progress card',
    description: '',
    kind: 'progress',
    props: { title: 'Visitors', value: 1260, target: 2000, range: 'Last 7 days' },
  }),
  usage: `<ProgressCard title="Visitors" value={1260} target={2000} />`,
  dataShape: `// Plain numbers: the measured value and the goal, in the same unit.
<ProgressCard title="Visitors" value={1260} target={2000} />

// Not measured yet? null shows a dash and an empty track, never 0%.
<ProgressCard title="Visitors" value={null} target={2000} />

// Summarizing rows yourself is one line.
const visitors = days.reduce((sum, day) => sum + day.visitors, 0);`,
  dataNote:
    'Pass the value and the goal as numbers. The header shows the value in your `valueFormat`, and the ring shows the share of the goal reached. Past the goal the ring stays full and the percentage keeps counting, so 127% reads as 127%.',
  rangesUsage: `<ProgressCard
  title="Visitors"
  target={2000}
  ranges={[
    { id: 'week', label: 'Last 7 days', value: 1260, delta: 0.052 },
    { id: 'month', label: 'Last 30 days', value: 5480, target: 8000, delta: 0.031 },
  ]}
/>`,
  hover:
    'The ring fills from the top when the card appears, and eases to the new amount when the period changes, while the percentage counts along. Screen readers hear the value, the percentage, and the target.',
  // A null value is Progress's empty state: a dash and an empty track.
  props: cardProps([
    {
      name: 'value',
      type: 'number | null',
      description: 'The measured amount. null shows a dash, never zero.',
    },
    { name: 'target', type: 'number', description: 'The goal, in the value’s unit.' },
    {
      name: 'label',
      type: 'string',
      description: 'Words under the percentage. “of goal” by default.',
    },
    {
      name: 'variant',
      type: "'ring' | 'thick' | 'gauge'",
      description: 'A thin ring (default), a heavy ring on a soft disc, or a half-ring gauge.',
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
      type: '{ id, label, value, target?, delta? }[]',
      description: 'A period select. Each range brings its own value and, optionally, goal.',
    },
    { name: 'footer', type: 'ReactNode', description: 'Content under the ring.' },
    { name: 'color', type: 'string', description: 'Any CSS color for the progress.' },
    {
      name: 'depth',
      type: 'boolean',
      description:
        'Lights the fill as a tube in a groove cut into the card. The arc keeps its exact angle.',
    },
  ]).filter((row) => row.name !== 'empty'),
  examples: [
    goalpacingExample,
    milestoneprogressExample,
    valueExample({
      id: 'ring',
      title: 'Ring',
      description: 'The default: a thin ring with the percentage in the middle.',
      kind: 'progress',
      props: { title: 'Visitors', value: 1260, target: 2000, range: 'Last 7 days' },
    }),
    valueExample({
      id: 'thick',
      title: 'Thick ring',
      description: 'A heavier ring around a soft disc, for a bolder tile.',
      kind: 'progress',
      props: {
        title: 'Visitors',
        value: 1260,
        target: 2000,
        variant: 'thick',
        range: 'Last 7 days',
      },
    }),
    valueExample({
      id: 'gauge',
      title: 'Gauge',
      description: 'A half ring, for goals that feel like a meter filling up.',
      kind: 'progress',
      props: {
        title: 'Quarterly revenue',
        value: 412000,
        target: 600000,
        valueFormat: { style: 'currency', currency: 'USD', maximumFractionDigits: 0 },
        variant: 'gauge',
        label: 'of target',
        delta: 0.084,
      },
    }),
    valueExample({
      id: 'over',
      title: 'Past the goal',
      description: 'The ring stays full and the percentage keeps counting past 100%.',
      kind: 'progress',
      props: { title: 'Signups', value: 2540, target: 2000, delta: 0.27 },
    }),
    valueExample({
      id: 'periods',
      title: 'Periods with their own goals',
      description: 'Each range can bring its own value, goal, and change.',
      kind: 'progress',
      props: {
        title: 'Visitors',
        target: 2000,
        ranges: [
          { id: 'week', label: 'Last 7 days', value: 1260, delta: 0.052 },
          { id: 'month', label: 'Last 30 days', value: 5480, target: 8000, delta: 0.031 },
        ],
      },
    }),
    valueExample({
      id: 'missing',
      title: 'Not measured yet',
      description: 'A null value shows a dash and an empty track, never 0%.',
      kind: 'progress',
      props: { title: 'Visitors', value: null, target: 2000, range: 'Today' },
    }),
    valueExample({
      id: 'loading',
      title: 'Loading',
      description: 'The track holds its place while the number is on its way.',
      kind: 'progress',
      props: { title: 'Visitors', value: 1260, target: 2000, loading: true },
    }),
    valueExample({
      id: 'depth',
      title: '3D',
      description:
        'The fill becomes a lit tube in a groove cut into the card. The arc keeps its exact angle.',
      kind: 'progress',
      props: {
        title: 'Visitors',
        value: 1260,
        target: 2000,
        variant: 'thick',
        range: 'Last 7 days',
        depth: true,
      },
    }),
  ],
};

export const progressDoc = curate(progressContent, {
  drop: ['gauge', 'ring', 'thick', 'depth'],
  style: { over: { variant: 'gauge' }, periods: { variant: 'thick' } },
});
