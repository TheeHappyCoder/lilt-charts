import { cardProps, curate, type CardDocContent } from './content';
import { cardExample } from './examples';

const rhythm = { hour: 'hour', value: 'requests', bucketMinutes: 40 } as const;

const activityRingContent: CardDocContent = {
  kind: 'activity',
  title: 'Activity ring',
  lede: 'A full day of activity, wrapped into a ring.',
  heroFile: 'RequestRhythmCard.tsx',
  hero: cardExample({
    id: 'hero',
    title: 'Activity ring card',
    description: '',
    kind: 'activity',
    source: 'requestRhythmRanges',
    props: { title: 'Request rhythm', ...rhythm },
  }),
  usage: `<ActivityRingCard
  title="Request rhythm"
  data={requestRhythm}
  hour="hour"
  value="requests"
  bucketMinutes={40}
/>`,
  dataShape: `// One row per time slot; hour is the time of day, so 14.5 is 14:30.
const requestRhythm = [
  { hour: 0, requests: 14 },
  { hour: 0.6667, requests: 20 },   // 00:40
  { hour: 2.6667, requests: null }, // not recorded
  // …
];

<ActivityRingCard
  title="Request rhythm"
  data={requestRhythm}
  hour="hour"        // a numeric field: hours from 0 up to 24
  value="requests"   // a numeric field
  bucketMinutes={40} // minutes per slot; must divide a day
/>`,
  dataNote:
    'Each row is one time slot: `hour` places it around the day, clockwise from midnight at the top, and `value` fills its dots; TypeScript rejects anything but numeric fields. Every time must fall on a `bucketMinutes` slot, once. Dots fill against `maximum`, which defaults to a round number above the peak. A slot that is `null`, or has no row, stays empty and is counted in the footer, while a measured zero shows as a real reading, so an outage never looks like a quiet hour. The headline totals the day; `aggregate` switches it to the average or the peak.',
  rangesUsage: `<ActivityRingCard
  title="Request rhythm"
  hour="hour"
  value="requests"
  bucketMinutes={40}
  ranges={[
    { id: 'today', label: 'Today', data: today, delta: 0.186 },
    { id: 'yesterday', label: 'Yesterday', data: yesterday, delta: -0.034 },
  ]}
/>`,
  hover:
    'Hovering a slot reads it in the headline with its time, “14:40 · requests”, and the ring highlights it. Click to pin a slot. The ring is one tab stop: arrow keys step around the day, Enter pins, and Escape lets go. The center always shows the peak and when it happened, and the tiles name the busiest and quietest times.',
  props: cardProps([
    { name: 'data', type: 'Row[]', description: 'One row per time slot. Omit when using ranges.' },
    {
      name: 'hour',
      type: 'numeric key of Row',
      description: 'Time of day in hours, from 0 up to 24; 14.5 is 14:30.',
    },
    {
      name: 'value',
      type: 'numeric key of Row',
      description: 'How much happened in the slot. `null` means not recorded.',
    },
    {
      name: 'bucketMinutes',
      type: 'number',
      description: 'Minutes per slot. Must divide a day, like 15, 30, 40, or 60. Defaults to 60.',
    },
    {
      name: 'unit',
      type: 'string',
      description: 'What `value` counts, e.g. “requests”. Defaults to the field name.',
    },
    {
      name: 'maximum',
      type: 'number',
      description: 'Value that fills a slot’s dots. Defaults to a round number above the peak.',
    },
    {
      name: 'aggregate',
      type: "'sum' | 'mean' | 'max'",
      description: 'How the resting headline sums up the day. Sum by default.',
    },
    {
      name: 'height',
      type: 'number',
      description: 'Ring height in pixels, at least 180. Defaults to 280.',
    },
    {
      name: 'headline',
      type: 'number',
      description: 'Resting headline. Defaults to the aggregate of every recorded slot.',
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
      description: 'Turns the period label into a select. Each range swaps the day.',
    },
    { name: 'color', type: 'string', description: 'Any CSS color for the dots.' },
    {
      name: 'depth',
      type: 'boolean',
      description: 'Turns each dot into a small lit puck.',
    },
  ]),
  examples: [
    cardExample({
      id: 'rhythm',
      title: 'Daily rhythm',
      description:
        'Forty-minute slots around the day: quiet overnight, busiest mid-afternoon. The headline totals the day.',
      kind: 'activity',
      source: 'requestRhythm',
      props: { title: 'Request rhythm', ...rhythm, delta: 0.186, range: 'Today' },
    }),
    cardExample({
      id: 'hourly',
      title: 'Hourly slots',
      description:
        'The default `bucketMinutes` is 60, one slot per hour. `unit` names what the values count.',
      kind: 'activity',
      source: 'ticketsByHour',
      props: { title: 'Support tickets', hour: 'hour', value: 'tickets', unit: 'tickets' },
    }),
    cardExample({
      id: 'peak',
      title: 'Peak headline',
      description:
        '`aggregate="max"` headlines the busiest slot instead of the total, for rates where a sum means little.',
      kind: 'activity',
      source: 'requestRhythm',
      props: { title: 'Peak load', ...rhythm, aggregate: 'max' },
    }),
    cardExample({
      id: 'missing',
      title: 'Slots with no data',
      description:
        'Logging was down from 02:40 to 04:00. Those slots stay empty and the footer counts them, while a measured quiet slot still shows its reading.',
      kind: 'activity',
      source: 'requestRhythmWithGap',
      props: { title: 'Request rhythm', ...rhythm },
    }),
    cardExample({
      id: 'loading',
      title: 'Loading',
      description: 'A placeholder ring holds the space while data is on its way.',
      kind: 'activity',
      source: 'requestRhythm',
      props: { title: 'Request rhythm', ...rhythm, loading: true },
    }),
    cardExample({
      id: 'depth',
      title: '3D',
      description: 'Each dot becomes a small lit puck with a shaded rim.',
      kind: 'activity',
      source: 'requestRhythm',
      props: { title: 'Request rhythm', ...rhythm, delta: 0.186, range: 'Today', depth: true },
    }),
  ],
};

export const activityRingDoc = curate(activityRingContent, { drop: ['rhythm', 'depth'] });
