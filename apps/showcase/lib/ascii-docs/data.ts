import type { AsciiSceneDoc } from '../ascii-scenes';

/** Live data beyond charts: a globe, a clock, a rolling counter and an inline sparkline. */
export const dataDocs: readonly AsciiSceneDoc[] = [
  {
    id: 'globe',
    shelf: 'Data',
    title: 'Globe',
    component: 'AsciiGlobe',
    lede: 'A turning Earth drawn in type, with places that pulse and arcs that travel between them.',
    touch: 'Hover a point to read its label. Move across to lean the globe. Click to spin it.',
    controls: [
      {
        kind: 'color',
        name: 'color',
        label: 'Land',
        defaultValue: '#8b6cff',
        description: 'Colour of the land and the atmosphere.',
      },
      {
        kind: 'color',
        name: 'accent',
        label: 'Accent',
        defaultValue: '#e5489c',
        description: 'Colour of the points and arcs.',
      },
      {
        kind: 'range',
        name: 'spin',
        label: 'Spin',
        min: 0,
        max: 6,
        step: 0.1,
        defaultValue: 1.5,
        description: 'Turns per minute. 0 holds it still.',
      },
      {
        kind: 'range',
        name: 'tilt',
        label: 'Tilt',
        min: -40,
        max: 40,
        step: 1,
        defaultValue: 20,
        description: 'How far the north pole leans toward you, in degrees.',
      },
      {
        kind: 'range',
        name: 'size',
        label: 'Size',
        min: 0.3,
        max: 1,
        step: 0.01,
        defaultValue: 0.82,
        description: 'Share of the shorter side the globe fills.',
      },
    ],
    props: [
      {
        name: 'label',
        type: 'string',
        defaultValue: 'a summary of the points',
        description:
          'Describes the globe for screen readers. Without one it reads how many places are marked, their names and the number of routes.',
      },
      {
        name: 'points',
        type: '{ lat: number; lon: number; value?: number; label?: string }[]',
        defaultValue: 'ten world cities',
        description:
          'Places that pulse while they face you. Larger values pulse wider; hovering reads out the label and value.',
      },
      {
        name: 'arcs',
        type: '{ from: [lat, lon]; to: [lat, lon] }[]',
        defaultValue: 'seven routes between the cities',
        description:
          'Great-circle arcs lifted above the surface, each with a bright head travelling from one end to the other.',
      },
    ],
  },
  {
    id: 'clock',
    shelf: 'Data',
    title: 'Clock',
    component: 'AsciiClock',
    lede: 'A clock or countdown in large digits of solid type, each digit scrambling as it changes.',
    touch: 'Watch the seconds turn over. Switch to a countdown and set a date below.',
    controls: [
      {
        kind: 'choice',
        name: 'mode',
        label: 'Mode',
        options: [
          { value: 'clock', label: 'Clock' },
          { value: 'countdown', label: 'Countdown' },
        ],
        defaultValue: 'clock',
        description: 'Show the local time, or count down to a date.',
      },
      {
        kind: 'text',
        name: 'to',
        label: 'Count down to',
        defaultValue: '',
        description:
          'When the countdown ends, as 2027-01-01 or 2027-01-01T09:00. Empty counts down to the coming new year.',
      },
      {
        kind: 'toggle',
        name: 'seconds',
        label: 'Seconds',
        defaultValue: true,
        description: 'Show seconds.',
      },
      {
        kind: 'color',
        name: 'color',
        label: 'Colour',
        defaultValue: '#8b6cff',
        description: 'Colour of the digits.',
      },
    ],
    props: [
      {
        name: 'label',
        type: 'string',
        defaultValue: "'Clock' or 'Countdown'",
        description: 'Describes the canvas for screen readers.',
      },
    ],
  },
  {
    id: 'counter',
    shelf: 'Text',
    title: 'Counter',
    component: 'AsciiCounter',
    demo: 'AsciiCounterDemo',
    lede: 'A number in real text that rolls up to its value, and rolls only the digits that change.',
    touch: 'More arrive every few seconds. Click the number to add a lot at once.',
    kind: 'dom',
    layout: 'center',
    controls: [
      {
        kind: 'choice',
        name: 'format',
        label: 'Format',
        options: [
          { value: 'full', label: 'Full' },
          { value: 'compact', label: 'Compact' },
        ],
        defaultValue: 'full',
        description: 'Every digit with separators, 1,204,881, or shortened, 1.2M.',
      },
      {
        kind: 'text',
        name: 'prefix',
        label: 'Prefix',
        defaultValue: '',
        description: 'Text before the number, such as $.',
      },
      {
        kind: 'text',
        name: 'suffix',
        label: 'Suffix',
        defaultValue: '',
        description: 'Text after the number, such as a unit.',
      },
      {
        kind: 'range',
        name: 'duration',
        label: 'Duration',
        min: 0.2,
        max: 4,
        step: 0.1,
        defaultValue: 1.2,
        description: 'Seconds the digits take to land on a new value.',
      },
    ],
    code: `import { AsciiCounter } from '{from}';

export function Readers({ count }: { count: number }) {
  return (
    <p style={{ fontSize: 64, fontWeight: 600 }}>
      <AsciiCounter value={count}{props} />
    </p>
  );
}`,
    usage:
      'Give AsciiCounter a value; the demo on the stage ticks one up so you can watch it roll. It is real text in a monospace face with tabular numbers, so its width holds still as the digits spin, and it takes its size and colour from the text around it. On first show every digit spins up from zero; after that only the digits that change spin, landing from the most significant down. Screen readers hear the value itself, never the spinning digits. With reduced motion the new value shows at once.',
    props: [
      {
        name: 'value',
        type: 'number',
        defaultValue: '1204881',
        description: 'The number to show. Change it and the digits roll to the new one.',
      },
      {
        name: 'className',
        type: 'string',
        defaultValue: '—',
        description: 'A class for the outer span.',
      },
      {
        name: 'style',
        type: 'CSSProperties',
        defaultValue: '—',
        description: 'Styles for the outer span, such as its font size or weight.',
      },
    ],
  },
  {
    id: 'sparkline',
    shelf: 'Data',
    title: 'Sparkline',
    component: 'AsciiSparkline',
    demo: 'AsciiSparklineDemo',
    lede: 'A chart the size of a word, for a sentence or a table cell, drawn in small solid blocks.',
    touch: 'Reload the page to watch them draw in. Change the width below.',
    kind: 'dom',
    layout: 'center',
    controls: [
      {
        kind: 'range',
        name: 'width',
        label: 'Width',
        min: 6,
        max: 32,
        step: 1,
        defaultValue: 16,
        description: 'Width in characters of the text around it.',
      },
      {
        kind: 'toggle',
        name: 'fill',
        label: 'Fill',
        defaultValue: true,
        description: 'Shade the area under the line; off draws the line alone.',
      },
    ],
    code: `import { AsciiSparkline } from '{from}';

export function Visitors({ data }: { data: number[] }) {
  return (
    <p>
      Visitors climbed all month <AsciiSparkline data={data}{props} />
    </p>
  );
}`,
    usage:
      'Give AsciiSparkline data and set it in a sentence or a table cell, as the stage does. It is the area chart in miniature: a ridge of small blocks along the line, a faint fill beneath, and the latest value lit at the end. It stands on the baseline about as tall as a capital, takes the colour of the text around it, and keeps its blocks on whole pixels so they stay crisp. Screen readers hear its count, lowest, highest and latest values.',
    props: [
      {
        name: 'data',
        type: 'number[]',
        defaultValue: '32 days of demo data',
        description: 'The values, oldest first.',
      },
      {
        name: 'color',
        type: 'string',
        defaultValue: 'the text colour',
        description: 'Colour of the line and its fill.',
      },
      {
        name: 'label',
        type: 'string',
        defaultValue: 'a summary of the data',
        description:
          'Describes the sparkline for screen readers. Without one it reads its count, lowest, highest and latest values.',
      },
    ],
  },
];
