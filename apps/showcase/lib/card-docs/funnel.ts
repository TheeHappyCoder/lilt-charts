import { comparativefunnelExample, comparativefunnelForm } from './expansion-variants';
import { cardProps, curate, type CardDocContent } from './content';
import { cardExample } from './examples';

const funnelContent: CardDocContent = {
  forms: [comparativefunnelForm],
  kind: 'funnel',
  title: 'Funnel chart',
  lede: 'Follow conversion from the first step to the last.',
  heroFile: 'SignupFunnelCard.tsx',
  hero: cardExample({
    id: 'hero',
    title: 'Funnel chart card',
    description: '',
    kind: 'funnel',
    source: 'signupRanges',
    props: { title: 'Sign-up funnel', category: 'stage', value: 'people' },
  }),
  usage: `<FunnelChartCard
  title="Sign-up funnel"
  data={signupFunnel}
  category="stage"
  value="people"
/>`,
  dataShape: `// One row per stage, in funnel order. Counts only stay level or fall.
const signupFunnel = [
  { stage: 'Link opened', people: 197 },
  { stage: 'Started', people: 110 },
  { stage: 'Completed', people: 77 },
  { stage: 'Converted', people: 38 },
];

<FunnelChartCard
  title="Sign-up funnel"
  data={signupFunnel}
  category="stage" // a text field
  value="people"   // a numeric field
/>`,
  dataNote:
    'Rows are stages in order: `category` names each one and `value` counts who reached it; TypeScript rejects anything else. Every percentage is a share of the first stage, and the headline is the first stage’s count. A stage that is `null` says “No data” and draws no band. A later stage with more people than an earlier one shows an error, because a funnel can only narrow.',
  rangesUsage: `<FunnelChartCard
  title="Sign-up funnel"
  category="stage"
  value="people"
  ranges={[
    { id: 'week', label: 'Last 7 days', data: lastWeek, delta: 0.052 },
    { id: 'month', label: 'Last 30 days', data: lastMonth, delta: 0.031 },
  ]}
/>`,
  hover:
    'Hovering a stage, or its tile, dims the others and counts the headline to that stage, with the conversion from the step before beside it: “Started · 56% of Link opened”. Click to pin a stage. Bands sweep in from the left on first view and ease to their new size when the period changes.',
  props: cardProps([
    {
      name: 'data',
      type: 'Row[]',
      description: 'One row per stage, in order. Omit when using ranges.',
    },
    { name: 'category', type: 'text key of Row', description: 'Names each stage. Must be unique.' },
    {
      name: 'value',
      type: 'numeric key of Row',
      description: 'How many reached the stage. Never rises from one stage to the next.',
    },
    {
      name: 'curve',
      type: "'smooth' | 'linear'",
      description: 'Smooth (default) eases each stage into the next; linear tapers straight.',
    },
    {
      name: 'colors',
      type: "'stages' | 'single'",
      description: 'A palette color per stage (default), or one color for every stage.',
    },
    {
      name: 'tracks',
      type: 'boolean',
      description: 'A quiet full-height lane behind each stage, marking where 100% sits.',
    },
    { name: 'height', type: 'number', description: 'Plot height in pixels. Defaults to 180.' },
    {
      name: 'headline',
      type: 'number',
      description: 'Resting headline. Defaults to the first stage.',
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
        'The pinned stage, by name, when you own the selection, so outside filters and a click on the chart share it. `null` pins nothing; omit it and the card keeps its own pin.',
    },
    {
      name: 'onSelectedChange',
      type: '(stage: string | null) => void',
      description: 'Asked when a click, tap, or Escape pins or releases a stage.',
    },
    {
      name: 'ranges',
      type: '{ id, label, data, delta?, headline? }[]',
      description: 'Turns the period label into a select. Each range swaps the stages.',
    },
    { name: 'color', type: 'string', description: 'Any CSS color for `colors="single"`.' },
    {
      name: 'depth',
      type: 'boolean',
      description:
        'Draws the funnel as a pipe: each stage shaded as a cylinder of its own thickness, with curved seams and rounded ends.',
    },
    {
      name: 'legend',
      type: "false | 'tiles' | 'inline' | 'list' | 'pills' | 'bars'",
      description:
        'False removes the legend without changing the data. How the stage legend lays out: value tiles (default), a compact inline key, list rows, tinted pills, or bars against the largest.',
    },
    {
      name: 'legendSwatch',
      type: "'square' | 'dot' | 'line'",
      description: 'The mark beside each legend label. Defaults to a rounded square.',
    },
  ]),
  examples: [
    comparativefunnelExample,
    cardExample({
      id: 'smooth',
      title: 'Smooth',
      description: 'The default: each stage holds its height, then eases into the next.',
      kind: 'funnel',
      source: 'signupFunnel',
      props: {
        title: 'Sign-up funnel',
        category: 'stage',
        value: 'people',
        delta: 0.052,
        range: 'Last 7 days',
      },
    }),
    cardExample({
      id: 'linear',
      title: 'Linear',
      description:
        'Straight tapers show the drop across each step. Stages under 1% still draw as a hairline and say “<1%” rather than rounding to zero.',
      kind: 'funnel',
      source: 'hiringFunnel',
      props: {
        title: 'Hiring',
        category: 'stage',
        value: 'people',
        curve: 'linear',
        range: 'This quarter',
      },
    }),
    cardExample({
      id: 'single',
      title: 'One color',
      description:
        '`colors="single"` keeps attention on the shape of the drop rather than on the stages.',
      kind: 'funnel',
      source: 'checkoutFunnel',
      props: {
        title: 'Checkout',
        category: 'stage',
        value: 'people',
        colors: 'single',
        delta: -0.018,
        range: 'Last 7 days',
      },
    }),
    cardExample({
      id: 'tracks',
      title: 'With tracks',
      description:
        'Full-height lanes mark where 100% sits, so even the smallest stages have a frame.',
      kind: 'funnel',
      source: 'hiringFunnel',
      props: {
        title: 'Hiring',
        category: 'stage',
        value: 'people',
        curve: 'linear',
        colors: 'single',
        tracks: true,
      },
    }),
    cardExample({
      id: 'missing',
      title: 'A stage with no data',
      description:
        'Team invites aren’t tracked yet. That stage says “No data” and draws no band, and the stages around it keep their true shares of the first.',
      kind: 'funnel',
      source: 'onboardingFunnel',
      props: { title: 'Onboarding', category: 'stage', value: 'people' },
    }),
    cardExample({
      id: 'loading',
      title: 'Loading',
      description: 'A placeholder funnel holds the space while data is on its way.',
      kind: 'funnel',
      source: 'signupFunnel',
      props: { title: 'Sign-up funnel', category: 'stage', value: 'people', loading: true },
    }),
    cardExample({
      id: 'depth',
      title: '3D',
      description:
        'The funnel becomes a pipe: each stage shaded as a cylinder of its own thickness, with curved seams between stages.',
      kind: 'funnel',
      source: 'signupFunnel',
      props: {
        title: 'Sign-up funnel',
        category: 'stage',
        value: 'people',
        delta: 0.052,
        range: 'Last 7 days',
        depth: true,
      },
    }),
  ],
};

export const funnelDoc = curate(funnelContent, {
  drop: ['smooth', 'linear', 'depth'],
  style: { missing: { tracks: true, colors: 'single' } },
  titles: { tracks: 'A hiring pipeline', single: 'Checkout drop-off' },
});
