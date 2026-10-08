import { scattertrailsExample } from './expansion-variants';
import { cardProps, curate, type CardDocContent } from './content';
import { cardExample } from './examples';
import { stripExample, beeswarmExample, stripForm } from './observation-variants';

const campaignAxes = {
  x: 'spend',
  y: 'signups',
  label: 'campaign',
  xLabel: 'Spend',
  yLabel: 'Sign-ups',
  xFormat: { style: 'currency', currency: 'USD', maximumFractionDigits: 0 },
} as const;

const scatterContent: CardDocContent = {
  kind: 'scatter',
  forms: [stripForm],
  title: 'Scatter chart',
  lede: 'Explore relationships between two measurements.',
  heroFile: 'CampaignScatterCard.tsx',
  hero: cardExample({
    id: 'hero',
    title: 'Scatter chart card',
    description: '',
    kind: 'scatter',
    source: 'campaignRanges',
    props: {
      title: 'Campaign results',
      ...campaignAxes,
      size: 'reach',
      sizeLabel: 'Reach',
      group: 'channel',
    },
  }),
  usage: `<ScatterChartCard
  title="Campaign results"
  data={campaignResults}
  x="spend"
  y="signups"
  label="campaign"
/>`,
  dataShape: `// One row per point.
const campaignResults = [
  { campaign: 'Brand search', channel: 'Search', spend: 4200, signups: 610, reach: 18000 },
  { campaign: 'Story ads', channel: 'Social', spend: 24600, signups: null, reach: 83000 },
  // …
];

<ScatterChartCard
  title="Campaign results"
  data={campaignResults}
  x="spend"        // a numeric field: across
  y="signups"      // a numeric field: up, and the headline
  label="campaign" // a text field that names each point
  size="reach"     // optional: a numeric field for bubble area
  group="channel"  // optional: a text field for color and legend
/>`,
  dataNote:
    'Each row is one point: `x` places it across, `y` places it up and feeds the headline, and TypeScript rejects anything but numeric fields for both. `label` names a point when it is read; `size` scales bubbles by area, so a point twice the value covers twice the ink; `group` colors points and adds a legend. A row missing `x` or `y` can’t be placed, so it is left off the plot, counted in the footer, and still listed for screen readers. Axes start at zero when the data starts near it, and at a round number otherwise.',
  rangesUsage: `<ScatterChartCard
  title="Campaign results"
  x="spend"
  y="signups"
  label="campaign"
  ranges={[
    { id: 'quarter', label: 'This quarter', data: thisQuarter, delta: 0.198 },
    { id: 'last-quarter', label: 'Last quarter', data: lastQuarter, delta: 0.074 },
  ]}
/>`,
  hover:
    'Hovering near a point reads it in the headline and names it beside the number, “Product search · Spend $14,500”, with dashed guides and pills marking its value on both axes. Click to pin a point. The plot is one tab stop: arrow keys step through points from left to right, Home and End jump to either end, Enter pins, and Escape lets go. Hovering a legend item reads that group. Points pop in from left to right on first view and glide to their new place when the period changes.',
  props: cardProps([
    {
      name: 'trails',
      type: 'boolean',
      description:
        'Join successive observations within each group. Gaps break trails; duplicate or missing time keys suppress that group’s trail.',
    },
    {
      name: 'trailOrder',
      type: 'numeric key of Row',
      description: 'Explicit numeric time order. Otherwise follows input row order.',
    },
    { name: 'data', type: 'Row[]', description: 'One row per point. Omit when using ranges.' },
    { name: 'x', type: 'numeric key of Row', description: 'Places each point across.' },
    {
      name: 'y',
      type: 'numeric key of Row',
      description: 'Places each point up, and drives the headline.',
    },
    {
      name: 'label',
      type: 'text key of Row',
      description:
        'Names a point when it is read. Unique labels also keep points steady across periods.',
    },
    {
      name: 'size',
      type: 'numeric key of Row',
      description: 'Sizes points by area, turning dots into bubbles.',
    },
    { name: 'sizeLabel', type: 'string', description: 'Names the size measure, e.g. “Reach”.' },
    {
      name: 'group',
      type: 'text key of Row',
      description: 'Colors points by group and adds a legend with each group’s value.',
    },
    { name: 'xLabel', type: 'string', description: 'Title for the horizontal axis.' },
    { name: 'yLabel', type: 'string', description: 'Title for the vertical axis.' },
    {
      name: 'xFormat',
      type: 'Intl.NumberFormatOptions',
      description: 'Formats x values and ticks, e.g. currency or seconds.',
    },
    {
      name: 'trend',
      type: 'boolean',
      description: 'A least-squares line through the points, with its r² in the footer.',
    },
    {
      name: 'aggregate',
      type: "'sum' | 'mean' | 'max'",
      description: 'How the resting headline sums up every plotted y. Sum by default.',
    },
    {
      name: 'height',
      type: 'number',
      description: 'Plot height in pixels, including the axes. Defaults to 260.',
    },
    {
      name: 'headline',
      type: 'number',
      description: 'Resting headline. Defaults to the aggregate of every plotted y.',
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
      description: 'Turns the period label into a select. Each range swaps the points.',
    },
    { name: 'color', type: 'string', description: 'Any CSS color for points without a group.' },
    {
      name: 'depth',
      type: 'boolean',
      description:
        'Draws each point as a lit sphere with a soft contact shadow. Centers and sizes stay exact.',
    },
    {
      name: 'legend',
      type: "false | 'tiles' | 'inline' | 'list' | 'pills' | 'bars'",
      description:
        'False removes the legend without changing the data. How the group legend lays out: value tiles (default), a compact inline key, list rows, tinted pills, or bars against the largest.',
    },
    {
      name: 'legendSwatch',
      type: "'square' | 'dot' | 'line'",
      description: 'The mark beside each legend label. Defaults to a rounded square.',
    },
  ]),
  examples: [
    scattertrailsExample,
    stripExample,
    beeswarmExample,
    cardExample({
      id: 'points',
      title: 'Points',
      description:
        'The simplest form: `x`, `y`, and a `label` to name each point. Axis titles and an `xFormat` make both scales read in their own units.',
      kind: 'scatter',
      source: 'campaignResults',
      props: { title: 'Campaign results', ...campaignAxes, range: 'This quarter' },
    }),
    cardExample({
      id: 'bubbles',
      title: 'Bubbles',
      description:
        '`size` scales each point by area. Reach is read alongside spend and sign-ups when a point is focused, and in the table for screen readers.',
      kind: 'scatter',
      source: 'campaignResults',
      props: { title: 'Campaign results', ...campaignAxes, size: 'reach', sizeLabel: 'Reach' },
    }),
    cardExample({
      id: 'groups',
      title: 'Groups',
      description:
        '`group` colors each channel and adds a legend with its sign-ups. Hover a channel to pick its points out; click to hold it.',
      kind: 'scatter',
      source: 'campaignResults',
      props: { title: 'Campaign results', ...campaignAxes, group: 'channel', delta: 0.198 },
    }),
    cardExample({
      id: 'trend',
      title: 'Trend line',
      description:
        '`trend` fits a least-squares line and reports its r². Here slower pages convert less; the headline is the average conversion with `aggregate="mean"`.',
      kind: 'scatter',
      source: 'pageSpeed',
      props: {
        title: 'Page speed and conversion',
        x: 'loadTime',
        y: 'conversion',
        label: 'page',
        xLabel: 'Load time',
        yLabel: 'Conversion',
        xFormat: { style: 'unit', unit: 'second', maximumFractionDigits: 1 },
        valueFormat: { style: 'percent', maximumFractionDigits: 1 },
        aggregate: 'mean',
        trend: true,
      },
    }),
    cardExample({
      id: 'missing',
      title: 'Points without a value',
      description:
        'Two campaigns are still attributing sign-ups. They are left off the plot rather than drawn at zero, and the footer says how many are missing.',
      kind: 'scatter',
      source: 'campaignsInFlight',
      props: { title: 'Campaign results', ...campaignAxes, group: 'channel' },
    }),
    cardExample({
      id: 'loading',
      title: 'Loading',
      description: 'Placeholder points hold the space while data is on its way.',
      kind: 'scatter',
      source: 'campaignResults',
      props: { title: 'Campaign results', ...campaignAxes, size: 'reach', loading: true },
    }),
    cardExample({
      id: 'depth',
      title: '3D',
      description:
        'Each point becomes a lit sphere with a soft contact shadow; centers and sizes stay exact.',
      kind: 'scatter',
      source: 'campaignResults',
      props: {
        title: 'Campaign results',
        ...campaignAxes,
        size: 'reach',
        sizeLabel: 'Reach',
        depth: true,
      },
    }),
  ],
};

export const scatterDoc = curate(scatterContent, { drop: ['strip', 'points', 'trend', 'depth'] });
