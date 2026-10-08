import { cardProps, type CardForm, type PropRow } from './content';
import { cardExample } from './examples';

export const observationProps: readonly PropRow[] = cardProps([
  { name: 'data', type: 'Row[]', description: 'One row per observation. Omit when using ranges.' },
  {
    name: 'height',
    type: 'number',
    description: 'Minimum plot height, default 260. Dense lanes expand to keep every mark visible.',
  },
  {
    name: 'depth',
    type: 'boolean',
    description:
      'Lit tiles, solid bars, or spheres. Data positions remain exact; loading keeps the same depth treatment.',
  },
  { name: 'color', type: 'string', description: 'Override the palette with one CSS color.' },
  {
    name: 'aggregate',
    type: "'sum' | 'mean' | 'max'",
    description: 'Resting headline summary; Strip defaults to mean, the others to sum.',
  },
  { name: 'headline', type: 'number', description: 'Override the resting headline.' },
  { name: 'delta', type: 'number', description: 'Fractional change shown alongside the headline.' },
  {
    name: 'deltaTone',
    type: "'default' | 'inverse' | 'neutral'",
    description: 'Use inverse when a decrease is good.',
  },
  { name: 'range', type: 'string', description: 'Static period label.' },
  {
    name: 'ranges',
    type: '{ id, label, data, headline?, delta? }[]',
    description: 'Period choices with their own data.',
  },
  { name: 'defaultRange', type: 'string', description: 'Initial period id.' },
  {
    name: 'locale',
    type: 'string',
    description: 'Locale for numbers and dates; defaults to en-US.',
  },
  {
    name: 'formatValue',
    type: '(value: number) => string',
    description: 'Custom value formatter.',
  },
  { name: 'badge', type: 'ReactNode', description: 'Content for the glass tab above the card.' },
  { name: 'className', type: 'string', description: 'Class on the card frame.' },
  {
    name: 'style',
    type: 'CSSProperties | ChartStyle',
    description: 'Inline styles and scoped chart variables.',
  },
  {
    name: 'onSelectionChange',
    type: '(selection | null) => void',
    description: 'Reports id, original row (or null for an absent day), value, and pinned state.',
  },
  {
    name: 'renderReadout',
    type: '(selection | null) => ReactNode',
    description: 'Consumer-owned readout, including when the header is hidden.',
  },
]);

export const calendarExample = cardExample({
  id: 'calendar',
  title: 'Calendar',
  description:
    'Daily activity across a quarter. Missing days are hatched; measured zero stays tinted. Use the site depth setting for raised tiles.',
  kind: 'calendar',
  source: 'calendarActivity',
  props: {
    title: 'Daily activity',
    date: 'date',
    value: 'visits',
    from: '2026-07-01',
    to: '2026-10-10',
    today: '2026-09-30',
    height: 200,
  },
});
export const timelineExample = cardExample({
  id: 'timeline',
  title: 'Timeline',
  description:
    'Start and end times on service lanes. Overlaps stack into separate rows. Depth turns the same intervals into solid bars.',
  kind: 'timeline',
  source: 'deployments',
  props: {
    title: 'Release window',
    id: 'id',
    label: 'task',
    start: 'start',
    end: 'end',
    lane: 'service',
    group: 'state',
  },
});
export const stripExample = cardExample({
  id: 'strip',
  title: 'Strip plot',
  description:
    'Every delivery is a point. Small, deterministic vertical offsets separate observations without moving their measured time.',
  kind: 'strip',
  source: 'deliveryTimes',
  props: {
    title: 'Delivery time',
    category: 'carrier',
    value: 'hours',
    label: 'parcel',
    valueFormat: { style: 'unit', unit: 'hour', maximumFractionDigits: 1 },
  },
});
export const beeswarmExample = cardExample({
  id: 'beeswarm',
  title: 'Beeswarm',
  description:
    'Points spread across each category to avoid collisions. Their measured positions stay exact; depth renders each point as a sphere.',
  kind: 'strip',
  source: 'deliveryTimes',
  props: {
    ...stripExample.props,
    title: 'Delivery time',
    category: 'carrier',
    value: 'hours',
    label: 'parcel',
    display: 'beeswarm',
  },
});

export const calendarForm: CardForm = {
  kind: 'calendar',
  title: 'Calendar heatmap',
  description:
    'CalendarHeatmapCard lays out one UTC day per cell. Bounds default to the observed dates. Duplicate days are rejected; aggregate them first. Zero stays tinted, absent days are hatched, and unobserved days after today are outlined. Wide calendars scroll on narrow screens. All loading styles fade out through the shared skeleton lifecycle.',
  usage:
    '<CalendarHeatmapCard data={calendarActivity} date="date" value="visits" from="2026-07-01" to="2026-10-10" today="2026-09-30" />',
  props: [
    ...observationProps,
    {
      name: 'date',
      type: 'date, string, or numeric key of Row',
      description: 'UTC date per cell; numbers are milliseconds since the Unix epoch.',
    },
    {
      name: 'value',
      type: 'numeric key of Row',
      description: 'Cell intensity and headline value.',
    },
    {
      name: 'from / to',
      type: 'string | number | Date',
      description:
        'Inclusive UTC bounds. Defaults to first and last observed dates; at most ten years.',
    },
    {
      name: 'today',
      type: 'string | number | Date',
      description: 'UTC cutoff for future cells; defaults to today.',
    },
    { name: 'weekStartsOn', type: '0 | 1', description: 'Sunday (0) or Monday (1, default).' },
    {
      name: 'domain',
      type: '[number, number]',
      description: 'Fixed intensity domain that must contain every value.',
    },
  ],
};
export const timelineForm: CardForm = {
  kind: 'timeline',
  title: 'Timeline intervals',
  description:
    'TimelineChartCard draws elapsed time horizontally. Dates, ISO strings, and epoch milliseconds are accepted. Missing endpoints stay unplotted and are counted; reversed intervals are rejected. Overlaps stack without hiding observations. Duration values and summaries are milliseconds, formatted as hours by default; simultaneous intervals add independently.',
  usage:
    '<TimelineChartCard data={deployments} id="id" label="task" start="start" end="end" lane="service" group="state" />',
  props: [
    ...observationProps,
    {
      name: 'label',
      type: 'text key of Row',
      description: 'Names each interval; must be unique unless id is supplied.',
    },
    { name: 'id', type: 'text key of Row', description: 'Stable unique interval identity.' },
    {
      name: 'start / end',
      type: 'date, string, or numeric key of Row',
      description: 'UTC endpoints. Equal endpoints render a small instant marker.',
    },
    {
      name: 'lane',
      type: 'text key of Row',
      description: 'Groups intervals into labeled lanes; overlaps get separate subrows.',
    },
    {
      name: 'group',
      type: 'text key of Row',
      description: 'Colors intervals by a category and creates its duration legend.',
    },
    {
      name: 'formatTime',
      type: '(timestamp: number) => string',
      description: 'Formats axis ticks and endpoint readouts.',
    },
    {
      name: 'legend',
      type: "false | 'tiles' | 'inline' | 'list' | 'pills' | 'bars'",
      description: 'Duration legend layout; tiles by default.',
    },
    {
      name: 'legendSwatch',
      type: "'square' | 'dot' | 'line'",
      description: 'Legend marker; square by default.',
    },
  ],
};
export const stripForm: CardForm = {
  kind: 'strip',
  title: 'Strip and beeswarm',
  description:
    'StripChartCard shows individual measurements within categories, with mean as the default headline. Strip uses stable vertical jitter; beeswarm prevents collisions and expands the plot when needed. Both preserve each numeric position. Missing values are counted and remain in the accessible table. Unique labels preserve pin identity across updates.',
  usage:
    '<StripChartCard data={deliveryTimes} category="carrier" value="hours" label="parcel" display="beeswarm" depth />',
  props: [
    ...observationProps,
    { name: 'category', type: 'text key of Row', description: 'Category lane for each point.' },
    { name: 'value', type: 'numeric key of Row', description: 'Measured horizontal position.' },
    {
      name: 'label',
      type: 'text key of Row',
      description: 'Unique accessible point name; falls back to row index.',
    },
    {
      name: 'display',
      type: "'strip' | 'beeswarm'",
      description: 'Stable jitter (default) or collision-free placement.',
    },
    { name: 'radius', type: 'number', description: 'Point radius in pixels, 2–12; default 4.' },
  ],
};
