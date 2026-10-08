import { correlationExample, correlationForm } from './expansion-variants';
import { cardProps, curate, type CardDocContent } from './content';
import { cardExample } from './examples';
import { calendarExample, calendarForm } from './observation-variants';

const heatmapContent: CardDocContent = {
  kind: 'heatmap',
  forms: [correlationForm, calendarForm],
  title: 'Heatmap',
  lede: 'Spot patterns and busy periods through color.',
  heroFile: 'ActivityHeatmapCard.tsx',
  hero: cardExample({
    id: 'hero',
    title: 'Heatmap card',
    description: '',
    kind: 'heatmap',
    source: 'activityRanges',
    props: { title: 'Audience activity', x: 'hour', y: 'day', value: 'sessions' },
  }),
  usage: `<HeatmapChartCard
  title="Audience activity"
  data={weeklyActivity}
  x="hour"
  y="day"
  value="sessions"
/>`,
  dataShape: `// One row per cell: which column, which row, and its value.
const weeklyActivity = [
  { day: 'Mon', hour: '00:00', sessions: 12 },
  { day: 'Mon', hour: '02:00', sessions: 0 },
  { day: 'Mon', hour: '10:00', sessions: null }, // not recorded
  // …
];

<HeatmapChartCard
  title="Audience activity"
  data={weeklyActivity}
  x="hour"          // a text field: the column
  y="day"           // a text field: the row
  value="sessions"  // a numeric field
/>`,
  dataNote:
    'Each row is one cell: `x` names its column, `y` its row, and `value` sets its color; TypeScript rejects anything else. Rows and columns keep the order they first appear, or pass `rows` and `columns` to set it. A cell that is `null`, or has no row at all, is hatched and reads “No data”, while a measured zero gets the lightest tint, so a gap never passes for a quiet hour. The headline is the sum of every known cell; `aggregate` switches it to a mean or max for rates.',
  rangesUsage: `<HeatmapChartCard
  title="Audience activity"
  x="hour"
  y="day"
  value="sessions"
  domain={[0, 500]} // one scale for both weeks
  ranges={[
    { id: 'week', label: 'This week', data: thisWeek, delta: 0.149 },
    { id: 'last-week', label: 'Last week', data: lastWeek, delta: -0.021 },
  ]}
/>`,
  hover:
    'Hovering or focusing a cell counts the headline to its value and names it beside the number: “Tue · 14:00”. Its row and column stay lit, their labels darken, and the rest of the grid dims. Click to pin a cell. The grid is one tab stop: arrow keys move between cells, Home and End jump along the row, and Escape unpins. Cells fade in on first view and ease to their new color when the period changes.',
  props: cardProps([
    {
      name: 'data',
      type: 'Row[]',
      description: 'One row per cell. Omit when using ranges.',
    },
    { name: 'x', type: 'text key of Row', description: 'Places each cell in a column.' },
    { name: 'y', type: 'text key of Row', description: 'Places each cell in a row.' },
    {
      name: 'value',
      type: 'numeric key of Row',
      description: 'Sets the color. `null`, or a cell with no row, reads “No data”.',
    },
    {
      name: 'columns',
      type: 'string[]',
      description: 'Column order. Defaults to the order columns first appear.',
    },
    {
      name: 'rows',
      type: 'string[]',
      description: 'Row order. Defaults to the order rows first appear.',
    },
    {
      name: 'domain',
      type: '[number, number]',
      description:
        'Values at the light and dark ends of the scale. Fix it to compare periods; defaults to zero through the highest value.',
    },
    {
      name: 'aggregate',
      type: "'sum' | 'mean' | 'max'",
      description: 'How the resting headline sums up the cells. Sum by default.',
    },
    {
      name: 'height',
      type: 'number',
      description: 'Grid height in pixels, shared by the rows. Defaults to 30 per row.',
    },
    {
      name: 'radius',
      type: 'number',
      description: 'Cell corner radius in pixels. Defaults to 5; 0 gives square cells.',
    },
    { name: 'gap', type: 'number', description: 'Space between cells in pixels. Defaults to 4.' },
    {
      name: 'headline',
      type: 'number',
      description: 'Resting headline. Defaults to the aggregate of every known cell.',
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
      description: 'Turns the period label into a select. Each range swaps the cells.',
    },
    { name: 'color', type: 'string', description: 'Any CSS color for the dark end of the scale.' },
    {
      name: 'depth',
      type: 'boolean',
      description:
        'Raises every cell as a low tile of one height with a lit top. Color alone still carries the value.',
    },
  ]),
  examples: [
    correlationExample,
    calendarExample,
    cardExample({
      id: 'week',
      title: 'Weekly rhythm',
      description:
        'The default: rounded cells, every column labeled, and the scale from zero to the busiest cell in the footer.',
      kind: 'heatmap',
      source: 'weeklyActivity',
      props: {
        title: 'Audience activity',
        x: 'hour',
        y: 'day',
        value: 'sessions',
        delta: 0.149,
        range: 'Sep 21–27',
      },
    }),
    cardExample({
      id: 'square',
      title: 'Square and compact',
      description:
        '`radius={0}` and a tighter `gap` give an exact grid; `height` shrinks the rows to fit a dashboard tile.',
      kind: 'heatmap',
      source: 'weeklyActivity',
      props: {
        title: 'Audience activity',
        x: 'hour',
        y: 'day',
        value: 'sessions',
        radius: 0,
        gap: 2,
        height: 150,
      },
    }),
    cardExample({
      id: 'retention',
      title: 'Retention cohorts',
      description:
        'Each row is a month of sign-ups, each column a week after. Newer cohorts haven’t reached their later weeks, so those cells read “No data” rather than zero. A fixed `domain` from 0 to 1 keeps the colors honest, and `aggregate="mean"` headlines the average.',
      kind: 'heatmap',
      source: 'weeklyRetention',
      props: {
        title: 'Weekly retention',
        x: 'week',
        y: 'cohort',
        value: 'retained',
        domain: [0, 1],
        aggregate: 'mean',
        valueFormat: { style: 'percent', maximumFractionDigits: 1 },
      },
    }),
    cardExample({
      id: 'missing',
      title: 'Cells with no data',
      description:
        'Tracking was down on three mornings and on Sunday evening. Those cells are hatched and say “No data”, the footer keys the hatch, and the headline counts only what was recorded.',
      kind: 'heatmap',
      source: 'activityWithGaps',
      props: { title: 'Audience activity', x: 'hour', y: 'day', value: 'sessions' },
    }),
    cardExample({
      id: 'scale',
      title: 'Fixed scale',
      description:
        'By default the darkest cell is this period’s busiest. Pass `domain` to hold the scale steady, so two weeks, or two cards side by side, color the same value the same way.',
      kind: 'heatmap',
      source: 'weeklyActivity',
      props: {
        title: 'Audience activity',
        x: 'hour',
        y: 'day',
        value: 'sessions',
        domain: [0, 500],
      },
    }),
    cardExample({
      id: 'loading',
      title: 'Loading',
      description: 'A placeholder grid holds the space while data is on its way.',
      kind: 'heatmap',
      source: 'weeklyActivity',
      props: {
        title: 'Audience activity',
        x: 'hour',
        y: 'day',
        value: 'sessions',
        loading: true,
      },
    }),
    cardExample({
      id: 'depth',
      title: '3D',
      description:
        'Every cell becomes a low tile of one height with a lit top. Color alone still carries the value.',
      kind: 'heatmap',
      source: 'weeklyActivity',
      props: {
        title: 'Audience activity',
        x: 'hour',
        y: 'day',
        value: 'sessions',
        delta: 0.149,
        range: 'Sep 21–27',
        depth: true,
      },
    }),
  ],
};

export const heatmapDoc = curate(heatmapContent, {
  drop: ['week', 'square', 'depth'],
  style: { retention: { radius: 0, gap: 2 }, missing: { gap: 6 } },
});
