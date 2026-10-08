import { cardProps, curate, type CardDocContent } from './content';
import { cardExample } from './examples';

const readinessSeries = [
  { key: 'current', label: 'Current' },
  { key: 'target', label: 'Target', dashed: true },
] as const;

const radarContent: CardDocContent = {
  kind: 'radar',
  title: 'Radar chart',
  lede: 'Compare strengths across several dimensions.',
  heroFile: 'ReleaseReadinessCard.tsx',
  hero: cardExample({
    id: 'hero',
    title: 'Radar chart card',
    description: '',
    kind: 'radar',
    source: 'readinessRanges',
    props: { title: 'Release readiness', category: 'area', series: readinessSeries },
  }),
  usage: `<RadarChartCard
  title="Release readiness"
  data={releaseReadiness}
  category="area"
  series={[{ key: 'current', label: 'Current' }]}
/>`,
  dataShape: `// One row per dimension, drawn clockwise from the top.
const releaseReadiness = [
  { area: 'Quality', current: 82, target: 92 },
  { area: 'Accessibility', current: null, target: 90 }, // not audited
  // …
];

<RadarChartCard
  title="Release readiness"
  data={releaseReadiness}
  category="area"  // a text field: the dimension
  series={[
    { key: 'current', label: 'Current' },               // a numeric field
    { key: 'target', label: 'Target', dashed: true },   // a reference
  ]}
/>`,
  dataNote:
    'Each row is one dimension, drawn clockwise from the top in the order given; `category` names it, and each series is a numeric field of the row, checked by TypeScript. A radar needs three to twelve dimensions on one shared scale: `domain` sets it, and by default it runs from zero to a round number above the highest value. The headline is the average of the first solid series; dashed series, such as a target, draw as an outline and stay out of it. A missing value breaks the outline at that spoke and drops the fill, so a gap never looks like a low score.',
  rangesUsage: `<RadarChartCard
  title="Release readiness"
  category="area"
  series={[{ key: 'current' }, { key: 'target', dashed: true }]}
  ranges={[
    { id: 'quarter', label: 'This quarter', data: thisQuarter, delta: 0.086 },
    { id: 'last-quarter', label: 'Last quarter', data: lastQuarter, delta: 0.031 },
  ]}
/>`,
  hover:
    'Hovering near a spoke reads that dimension in the headline, with every other series beside it: “Performance · Target 85”. The spoke and label darken, the vertices on it fill, and the legend switches from averages to that dimension’s values. Hovering a legend item picks out its profile. The plot is one tab stop: arrow keys step around the spokes, Enter pins, and Escape lets go. Profiles grow from the center on first view and when the period changes.',
  props: cardProps([
    {
      name: 'data',
      type: 'Row[]',
      description: 'One row per dimension, clockwise from the top. Omit when using ranges.',
    },
    {
      name: 'category',
      type: 'text key of Row',
      description: 'Names each dimension. Must be unique.',
    },
    {
      name: 'series',
      type: '{ key, label?, color?, dashed? }[]',
      description:
        'Profiles to compare, one numeric field each. Dashed series draw as an outline and stay out of the headline.',
    },
    {
      name: 'domain',
      type: '[number, number]',
      description:
        'Values at the center and the outer ring. Defaults to zero through a round maximum.',
    },
    {
      name: 'aggregate',
      type: "'mean' | 'sum' | 'max'",
      description: 'How the resting headline sums up the first series. Mean by default.',
    },
    {
      name: 'grid',
      type: "'polygon' | 'circle'",
      description: 'Rings that follow the spokes (default), or round rings.',
    },
    { name: 'height', type: 'number', description: 'Plot height in pixels. Defaults to 300.' },
    {
      name: 'headline',
      type: 'number',
      description: 'Resting headline. Defaults to the aggregate of the first series.',
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
      description: 'Turns the period label into a select. Each range swaps the dimensions.',
    },
    {
      name: 'legend',
      type: "false | 'tiles' | 'inline' | 'list' | 'pills' | 'bars'",
      description:
        'False removes the legend without changing the data. How the series legend lays out: value tiles (default), a compact inline key, list rows, tinted pills, or bars against the largest.',
    },
    {
      name: 'legendSwatch',
      type: "'square' | 'dot' | 'line'",
      description: 'The mark beside each legend label. Defaults to a rounded square.',
    },
  ]),
  examples: [
    cardExample({
      id: 'profile',
      title: 'One profile',
      description:
        'A single series: the filled shape shows where the release is strong and where it lags.',
      kind: 'radar',
      source: 'releaseReadiness',
      props: {
        title: 'Release readiness',
        category: 'area',
        series: [{ key: 'current', label: 'Current' }],
        range: 'This quarter',
      },
    }),
    cardExample({
      id: 'target',
      title: 'Against a target',
      description:
        'A dashed series draws as an outline, so the distance from the filled shape to the target reads as the gap to close.',
      kind: 'radar',
      source: 'releaseReadiness',
      props: {
        title: 'Release readiness',
        category: 'area',
        series: readinessSeries,
        delta: 0.086,
      },
    }),
    cardExample({
      id: 'compare',
      title: 'Comparing profiles',
      description:
        'Three products on one ten-point scale. `domain` fixes the scale at 0 to 10, and hovering a legend item picks out one product.',
      kind: 'radar',
      source: 'productScores',
      props: {
        title: 'Product comparison',
        category: 'criterion',
        series: [
          { key: 'lilt', label: 'Lilt' },
          { key: 'northwind', label: 'Northwind' },
          { key: 'contoso', label: 'Contoso' },
        ],
        domain: [0, 10],
      },
    }),
    cardExample({
      id: 'circle',
      title: 'Round rings',
      description: '`grid="circle"` draws round rings, which some find calmer behind many spokes.',
      kind: 'radar',
      source: 'releaseReadiness',
      props: {
        title: 'Release readiness',
        category: 'area',
        series: readinessSeries,
        grid: 'circle',
      },
    }),
    cardExample({
      id: 'missing',
      title: 'A dimension with no data',
      description:
        'Accessibility wasn’t audited this quarter. The outline breaks at that spoke, the fill drops, the label says so, and the average counts only what was measured.',
      kind: 'radar',
      source: 'readinessWithGap',
      props: { title: 'Release readiness', category: 'area', series: readinessSeries },
    }),
    cardExample({
      id: 'loading',
      title: 'Loading',
      description: 'A placeholder shape holds the space while data is on its way.',
      kind: 'radar',
      source: 'releaseReadiness',
      props: {
        title: 'Release readiness',
        category: 'area',
        series: readinessSeries,
        loading: true,
      },
    }),
  ],
};

export const radarDoc = curate(radarContent, {
  drop: ['target', 'circle'],
  style: { compare: { grid: 'circle' } },
});
