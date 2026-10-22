import type { AsciiSceneDoc } from '../ascii-scenes';

const asProp = (tag: string) => ({
  name: 'as',
  type: 'ElementType',
  defaultValue: `'${tag}'`,
  description: "The element to render, such as 'h1' or 'p'.",
});

const triggerControl = (defaultValue: string, hover: string) =>
  ({
    kind: 'choice',
    name: 'trigger',
    label: 'Starts',
    options: [
      { value: 'view', label: 'In view' },
      { value: 'mount', label: 'At once' },
      { value: 'hover', label: 'On hover' },
    ],
    defaultValue,
    description: `When it runs: the first time it scrolls into view, as soon as it renders, or ${hover}.`,
  }) as const;

/** Complete pieces for real interfaces, with type as their signature. */
export const pieceDocs: readonly AsciiSceneDoc[] = [
  {
    id: 'split-flap',
    shelf: 'Text',
    title: 'Split-flap board',
    component: 'AsciiSplitFlap',
    demo: 'AsciiSplitFlapDemo',
    demoOnly: ['interval'],
    kind: 'dom',
    layout: 'center',
    stage: { fontSize: 40 },
    lede: 'A station departures board. Change the text and every tile turns through the alphabet to its new character, a flap at a time.',
    touch: 'The stage changes the board every few seconds. Type your own text to send it there.',
    controls: [
      {
        kind: 'text',
        name: 'text',
        label: 'Text',
        defaultValue: 'DEPARTURES',
        description: 'What the board shows. A line break starts a new row.',
      },
      {
        kind: 'range',
        name: 'speed',
        label: 'Flap speed',
        min: 0.02,
        max: 0.2,
        step: 0.01,
        defaultValue: 0.06,
        description: 'Seconds each flap takes to fall.',
      },
      {
        kind: 'color',
        name: 'tile',
        label: 'Tiles',
        defaultValue: '#1b1b1f',
        description: 'Colour of the tiles.',
      },
      {
        kind: 'color',
        name: 'ink',
        label: 'Characters',
        defaultValue: '#f5f1e6',
        description: 'Colour of the characters.',
      },
      {
        kind: 'range',
        name: 'interval',
        label: 'Change every',
        min: 2,
        max: 10,
        step: 0.5,
        defaultValue: 4,
        description: 'Stage only: seconds between the demo’s messages.',
      },
    ],
    code: `import { useEffect, useState } from 'react';
import { AsciiSplitFlap } from '{from}';

const BOARD = ['LILT UI\\nON TIME', 'CHARTS\\nBOARDING'];

export function Departures() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setI((n) => n + 1), 4000);
    return () => clearInterval(timer);
  }, []);
  return <AsciiSplitFlap text={BOARD[i % BOARD.length]} length={8}{props} />;
}`,
    usage:
      'The board is real text in the reader’s monospace face, sized by `font-size`, so it scales with whatever it sits in. Every tile turns forward through `characters` to its letter, the way a real board does, so a change can take a moment; pass a shorter set to make it quicker. Characters it does not have show as blanks. Screen readers get the text once, not the flaps.',
    props: [
      {
        name: 'length',
        type: 'number',
        defaultValue: 'the longest line',
        description:
          'Tiles a row; shorter lines are padded with blanks. Fix it so the board keeps its width as the text changes.',
      },
      {
        name: 'characters',
        type: 'string',
        defaultValue: "' A–Z 0–9 .,:!?-/&+'",
        description: 'The order the flaps turn through.',
      },
      asProp('div'),
    ],
  },
  {
    id: 'redact',
    shelf: 'Text',
    title: 'Redact',
    component: 'AsciiRedact',
    kind: 'dom',
    layout: 'center',
    stage: { fontSize: 44, fontWeight: 600 },
    lede: 'Text behind black bars, declassified letter by letter: each bar lifts, the letter flickers through a few glyphs, and lands.',
    touch:
      'Change the text or duration to watch it again. On hover, it redacts itself again when you leave.',
    controls: [
      {
        kind: 'text',
        name: 'text',
        label: 'Text',
        defaultValue: 'The numbers are in',
        description: 'The text under the bars.',
      },
      triggerControl('view', 'only while the pointer is over it'),
      {
        kind: 'range',
        name: 'duration',
        label: 'Duration',
        min: 0.3,
        max: 4,
        step: 0.1,
        defaultValue: 1.4,
        description: 'Seconds the reveal takes, first letter to last.',
      },
    ],
    props: [
      {
        name: 'bar',
        type: 'string',
        defaultValue: 'the text colour',
        description: 'Colour of the bars.',
      },
      {
        name: 'characters',
        type: 'string',
        defaultValue: 'a code-like set',
        description: 'Characters each letter flickers through as its bar lifts.',
      },
      asProp('span'),
    ],
  },
  {
    id: 'wave',
    shelf: 'Text',
    title: 'Wave text',
    component: 'AsciiWave',
    kind: 'dom',
    layout: 'center',
    stage: { fontSize: 52, fontWeight: 600 },
    lede: 'Text a wave runs through: each letter rises and settles a beat after the one before, and can flash a colour or turn into a glyph at the crest.',
    touch: 'Hover from either side: the wave starts from the side you came in.',
    controls: [
      {
        kind: 'text',
        name: 'text',
        label: 'Text',
        defaultValue: 'Ride the wave',
        description: 'The text.',
      },
      {
        kind: 'choice',
        name: 'trigger',
        label: 'Runs',
        options: [
          { value: 'hover', label: 'On hover' },
          { value: 'view', label: 'In view' },
          { value: 'loop', label: 'On a loop' },
        ],
        defaultValue: 'hover',
        description: 'When the wave runs.',
      },
      {
        kind: 'range',
        name: 'height',
        label: 'Height',
        min: 0.05,
        max: 0.8,
        step: 0.01,
        defaultValue: 0.28,
        description: 'How high a letter rises at the crest, in em.',
      },
      {
        kind: 'range',
        name: 'duration',
        label: 'Duration',
        min: 0.2,
        max: 2,
        step: 0.05,
        defaultValue: 0.6,
        description: 'Seconds the wave takes to cross the text.',
      },
      {
        kind: 'color',
        name: 'accent',
        label: 'Crest colour',
        defaultValue: '#e5489c',
        description: 'Colour a letter flashes as the crest passes it.',
      },
      {
        kind: 'choice',
        name: 'crest',
        label: 'Crest glyph',
        options: [
          { value: '', label: 'None' },
          { value: '~', label: '~' },
          { value: '^', label: '^' },
          { value: '*', label: '*' },
        ],
        defaultValue: '',
        description: 'A glyph each letter briefly turns into at the crest.',
      },
    ],
    props: [asProp('span')],
  },
  {
    id: 'spotlight',
    shelf: 'Text',
    title: 'Spotlight heading',
    component: 'AsciiSpotlight',
    kind: 'dom',
    layout: 'center',
    stage: { fontSize: 64, fontWeight: 700 },
    lede: 'A heading with type hidden in the dark around it. The pointer is a torch: where it shines, glyphs appear and the letters light up in colour.',
    touch: 'Move over the heading. It sweeps once by itself when it first comes into view.',
    controls: [
      {
        kind: 'text',
        name: 'text',
        label: 'Text',
        defaultValue: 'Look closer',
        description: 'The heading.',
      },
      {
        kind: 'colors',
        name: 'colors',
        label: 'Light',
        min: 1,
        max: 4,
        defaultValue: ['#7c5cff', '#e5489c', '#ffb36b'],
        description: 'Gradient stops the lit letters and glyphs take, left to right.',
      },
      {
        kind: 'range',
        name: 'radius',
        label: 'Radius',
        min: 60,
        max: 320,
        step: 5,
        defaultValue: 150,
        description: 'Radius of the light, in pixels.',
      },
      {
        kind: 'range',
        name: 'glyphSize',
        label: 'Glyph size',
        min: 8,
        max: 20,
        step: 1,
        defaultValue: 12,
        description: 'Font size of the hidden glyphs, in pixels.',
      },
      {
        kind: 'toggle',
        name: 'sweep',
        label: 'First sweep',
        defaultValue: true,
        description: 'Sweep the light across once when it first scrolls into view.',
      },
    ],
    props: [
      {
        name: 'characters',
        type: 'string',
        defaultValue: 'a code-like set',
        description: 'Characters hidden in the dark.',
      },
      asProp('span'),
    ],
  },
  {
    id: 'particle-word',
    shelf: 'Text',
    title: 'Particle word',
    component: 'AsciiParticleWord',
    lede: 'A word made of glyphs that each know where they belong. The pointer pushes them aside like a hand through sand, and they spring home behind it.',
    touch: 'Drag through the word. Click to burst it apart and watch it pull itself back together.',
    controls: [
      {
        kind: 'text',
        name: 'text',
        label: 'Text',
        defaultValue: 'lilt',
        description: 'The word. Keep it short.',
      },
      {
        kind: 'colors',
        name: 'colors',
        label: 'Colours',
        min: 1,
        max: 5,
        defaultValue: ['#7c5cff', '#e5489c', '#ffb36b'],
        description: 'Gradient stops across the word.',
      },
      {
        kind: 'range',
        name: 'reach',
        label: 'Reach',
        min: 2,
        max: 20,
        step: 0.5,
        defaultValue: 7,
        description: 'How far the pointer pushes, in cells.',
      },
      {
        kind: 'range',
        name: 'spring',
        label: 'Spring',
        min: 0.2,
        max: 3,
        step: 0.05,
        defaultValue: 1,
        description: 'How quickly scattered glyphs pull back home.',
      },
    ],
    props: [
      {
        name: 'weight',
        type: 'number',
        defaultValue: '800',
        description: 'Font weight of the word.',
      },
    ],
  },
  {
    id: 'empty-state',
    shelf: 'Interface',
    title: 'Empty state',
    component: 'AsciiEmptyState',
    kind: 'dom',
    layout: 'center',
    lede: 'An empty state with a little life in it: a small looping picture in type over a heading, a line of explanation and room for an action.',
    touch: 'Pick a variant. The 404’s search light follows the pointer; a click replays the tick.',
    controls: [
      {
        kind: 'choice',
        name: 'variant',
        label: 'Variant',
        options: [
          { value: 'no-data', label: 'No data' },
          { value: 'not-found', label: 'Not found' },
          { value: 'offline', label: 'Offline' },
          { value: 'done', label: 'Done' },
        ],
        defaultValue: 'no-data',
        description:
          'The picture, and the default words: empty axes and a tumbleweed, a 404 under a search light, a plug reaching for its socket, or a tick and confetti.',
      },
      {
        kind: 'color',
        name: 'accent',
        label: 'Accent',
        defaultValue: '#8b6cff',
        description: 'Colour of the picture’s accent.',
      },
      {
        kind: 'range',
        name: 'height',
        label: 'Picture height',
        min: 60,
        max: 240,
        step: 4,
        defaultValue: 120,
        description: 'Height of the picture in pixels.',
      },
    ],
    code: `import { AsciiEmptyState } from '{from}';

export function NoRevenueYet() {
  return (
    <AsciiEmptyState{props}>
      <button type="button">Connect a source</button>
    </AsciiEmptyState>
  );
}`,
    props: [
      {
        name: 'title',
        type: 'ReactNode',
        defaultValue: 'one that fits the variant',
        description: 'The heading.',
      },
      {
        name: 'description',
        type: 'ReactNode',
        defaultValue: 'one that fits the variant',
        description: 'A line under the heading.',
      },
      {
        name: 'children',
        type: 'ReactNode',
        defaultValue: '—',
        description: 'Actions under the words, such as a button.',
      },
      {
        name: 'cellSize',
        type: 'number',
        defaultValue: '12',
        description: 'Font size of the picture’s cells.',
      },
    ],
  },
  {
    id: 'countdown',
    shelf: 'Interface',
    title: 'Countdown',
    component: 'AsciiCountdown',
    demo: 'AsciiCountdownDemo',
    demoOnly: ['from'],
    lede: 'A countdown in big type built from glyphs. Digits fall out of their slots and scramble in as they change; at zero they burst and the done text sweeps in.',
    touch: 'Set the stage to count from 8 seconds to watch it finish.',
    controls: [
      {
        kind: 'choice',
        name: 'from',
        label: 'Stage counts',
        options: [
          { value: 'days', label: '2 days' },
          { value: 'seconds', label: '8 seconds' },
        ],
        defaultValue: 'days',
        description: 'Stage only: how far off the demo’s target is.',
      },
      {
        kind: 'toggle',
        name: 'seconds',
        label: 'Seconds',
        defaultValue: true,
        description: 'Show seconds.',
      },
      {
        kind: 'toggle',
        name: 'labels',
        label: 'Labels',
        defaultValue: true,
        description: 'Label each group: days, hours, minutes, seconds.',
      },
      {
        kind: 'text',
        name: 'done',
        label: 'Done text',
        defaultValue: 'LIVE',
        description: 'Shown at zero, in the same big type. Letters, digits and . ! ? -',
      },
      {
        kind: 'color',
        name: 'accent',
        label: 'Accent',
        defaultValue: '#8b6cff',
        description: 'Colour of a digit as it lands, and of the burst at zero.',
      },
    ],
    code: `import { AsciiCountdown } from '{from}';

export function Launch() {
  return (
    <section style={{ height: 220 }}>
      <AsciiCountdown to="2026-11-01T17:00:00Z"{props} />
    </section>
  );
}`,
    props: [
      {
        name: 'to',
        type: 'string | number',
        defaultValue: 'an hour from now',
        description: 'When it reaches zero: a date string or milliseconds since 1970.',
      },
      {
        name: 'color',
        type: 'string',
        defaultValue: 'the text colour',
        description: 'Colour of the digits.',
      },
    ],
  },
  {
    id: 'dissolve',
    shelf: 'Interface',
    title: 'Dissolve image',
    component: 'AsciiDissolve',
    kind: 'dom',
    lede: 'An image that arrives out of type: glyphs in the picture’s own colours give way to the picture in drifting patches. Afterwards the pointer turns it back into type.',
    touch:
      'Move over the picture to dissolve it around the pointer. Change the duration to watch it arrive again.',
    controls: [
      {
        kind: 'text',
        name: 'src',
        label: 'Image URL',
        defaultValue: '',
        description: 'Same origin, or served with CORS. Empty paints a sunset in the browser.',
      },
      {
        kind: 'range',
        name: 'duration',
        label: 'Duration',
        min: 0.4,
        max: 5,
        step: 0.1,
        defaultValue: 1.8,
        description: 'Seconds from all type to all picture.',
      },
      {
        kind: 'range',
        name: 'cellSize',
        label: 'Cell size',
        min: 6,
        max: 20,
        step: 1,
        defaultValue: 10,
        description: 'Font size of each cell of type, in pixels.',
      },
      {
        kind: 'toggle',
        name: 'hover',
        label: 'Pointer',
        defaultValue: true,
        description: 'Turn the picture back into type around the pointer.',
      },
      {
        kind: 'choice',
        name: 'fit',
        label: 'Fit',
        options: [
          { value: 'cover', label: 'Cover' },
          { value: 'contain', label: 'Contain' },
        ],
        defaultValue: 'cover',
        description: 'Fill the box and crop, or show all of it.',
      },
    ],
    usage:
      'It fills its parent; give the parent a size. The picture’s pixels are read to colour the type, so it must come from the same origin or be served with CORS; otherwise the type takes the text colour and the picture still arrives. Give it an `alt` when the picture carries meaning.',
    props: [
      {
        name: 'alt',
        type: 'string',
        defaultValue: '—',
        description: 'Describes the image for screen readers. Without one it is decorative.',
      },
      {
        name: 'trigger',
        type: "'view' | 'mount'",
        defaultValue: "'view'",
        description: 'When it resolves: the first time it scrolls into view, or at once.',
      },
      {
        name: 'characters',
        type: 'string',
        defaultValue: "' .:-=+*#%@'",
        description: 'Glyphs from sparse to dense.',
      },
    ],
  },
  {
    id: 'logo-cloud',
    shelf: 'Interface',
    title: 'Logo cloud',
    component: 'AsciiLogoCloud',
    kind: 'dom',
    layout: 'center',
    lede: 'A wall of logos drawn in type. At rest each is a scatter of flickering glyphs; as the pointer reaches it, it pulls together into a crisp mark.',
    touch: 'Move across the logos.',
    controls: [
      {
        kind: 'range',
        name: 'columns',
        label: 'Columns',
        min: 1,
        max: 6,
        step: 1,
        defaultValue: 3,
        description: 'Logos a row.',
      },
      {
        kind: 'range',
        name: 'height',
        label: 'Tile height',
        min: 40,
        max: 140,
        step: 2,
        defaultValue: 84,
        description: 'Height of each tile in pixels.',
      },
      {
        kind: 'range',
        name: 'cellSize',
        label: 'Glyph size',
        min: 5,
        max: 14,
        step: 1,
        defaultValue: 7,
        description: 'Font size of the glyphs, in pixels.',
      },
    ],
    code: `import { AsciiLogoCloud } from '{from}';

const LOGOS = [
  { name: 'Northwind', src: '/logos/northwind.svg', href: 'https://northwind.example' },
  { name: 'Acme', src: '/logos/acme.svg' },
  { name: 'Globex' },
];

export function TrustedBy() {
  return <AsciiLogoCloud logos={LOGOS}{props} />;
}`,
    props: [
      {
        name: 'logos',
        type: '{ name: string; src?: string; href?: string }[]',
        defaultValue: 'six made-up wordmarks',
        description:
          'The logos. A logo with no `src` is set as a wordmark from its name; with `href` it is a link.',
      },
      {
        name: 'color',
        type: 'string',
        defaultValue: 'the text colour',
        description: 'Colour a logo sharpens into.',
      },
    ],
  },
  {
    id: 'log',
    shelf: 'Interface',
    title: 'Live log',
    component: 'AsciiLog',
    kind: 'dom',
    layout: 'center',
    lede: 'A log pane that streams: new lines decode in from glyphs at the bottom and the rest glide up. Hover to freeze it and read; it counts what arrives meanwhile.',
    touch: 'Hover to pause. Leave to catch up.',
    controls: [
      {
        kind: 'text',
        name: 'title',
        label: 'Title',
        defaultValue: 'api · production',
        description: 'A title over the pane, such as the service’s name.',
      },
      {
        kind: 'range',
        name: 'rate',
        label: 'Lines a second',
        min: 0.2,
        max: 8,
        step: 0.1,
        defaultValue: 1.4,
        description: 'How fast the demo stream writes. Ignored when you pass `lines`.',
      },
      {
        kind: 'range',
        name: 'height',
        label: 'Height',
        min: 120,
        max: 480,
        step: 10,
        defaultValue: 280,
        description: 'Height of the pane in pixels.',
      },
      {
        kind: 'toggle',
        name: 'timestamps',
        label: 'Times',
        defaultValue: true,
        description: 'Show the time at the start of each line.',
      },
      {
        kind: 'toggle',
        name: 'pauseOnHover',
        label: 'Pause on hover',
        defaultValue: true,
        description: 'Freeze the view while the pointer is over it.',
      },
    ],
    code: `import { useEffect, useState } from 'react';
import { AsciiLog, type LogLine } from '{from}';

export function Deploys() {
  const [lines, setLines] = useState<LogLine[]>([]);
  useEffect(() => {
    const events = new EventSource('/api/logs');
    events.onmessage = (event) => setLines((all) => [...all, JSON.parse(event.data)]);
    return () => events.close();
  }, []);
  return <AsciiLog lines={lines}{props} />;
}`,
    props: [
      {
        name: 'lines',
        type: '{ id?, time?, level?, message }[]',
        defaultValue: 'a demo stream',
        description:
          "The lines, oldest first; `level` is 'debug', 'info', 'ok', 'warn' or 'error'. Append to the array and new lines stream in.",
      },
      {
        name: 'max',
        type: 'number',
        defaultValue: '200',
        description: 'Lines kept.',
      },
    ],
  },
  {
    id: 'status',
    shelf: 'Interface',
    title: 'Status rail',
    component: 'AsciiStatus',
    kind: 'dom',
    layout: 'center',
    lede: 'A status page’s uptime rail: a bar a day, coloured by how it went, with the uptime beside it. The bars fill in from the left through shades of type.',
    touch: 'Hover or tab through the days to read each one.',
    controls: [
      {
        kind: 'text',
        name: 'title',
        label: 'Title',
        defaultValue: 'API',
        description: 'The service’s name.',
      },
      {
        kind: 'range',
        name: 'height',
        label: 'Bar height',
        min: 16,
        max: 64,
        step: 2,
        defaultValue: 30,
        description: 'Height of the bars in pixels.',
      },
    ],
    code: `import { AsciiStatus } from '{from}';

export function Uptime({ days }: { days: { date: string; status: 'up' | 'degraded' | 'down' | 'none'; note?: string }[] }) {
  return <AsciiStatus days={days} style={{ width: 560 }}{props} />;
}`,
    props: [
      {
        name: 'days',
        type: '{ date, status, note? }[]',
        defaultValue: '90 demo days',
        description:
          "One entry a day, oldest first. `status` is 'up', 'degraded', 'down' or 'none'; a degraded day still counts as up.",
      },
      {
        name: 'colors',
        type: 'Partial<Record<status, string>>',
        defaultValue: 'green, amber, red, faint',
        description: 'Colours for each status.',
      },
    ],
  },
  {
    id: 'scroll-meter',
    shelf: 'Interface',
    title: 'Scroll meter',
    component: 'AsciiScrollMeter',
    demo: 'AsciiScrollMeterDemo',
    kind: 'dom',
    layout: 'center',
    lede: 'A reading meter in type along the edge of the page or a scrolling box. It fills as you read, its leading cell scrambling like a cursor, and shows how far through you are.',
    touch: 'Scroll the article on the stage.',
    controls: [
      {
        kind: 'choice',
        name: 'side',
        label: 'Side',
        options: [
          { value: 'right', label: 'Right' },
          { value: 'left', label: 'Left' },
        ],
        defaultValue: 'right',
        description: 'Which edge it runs along.',
      },
      {
        kind: 'colors',
        name: 'colors',
        label: 'Colours',
        min: 1,
        max: 4,
        defaultValue: ['#7c5cff', '#e5489c', '#ffb36b'],
        description: 'Gradient stops the read part takes, top to bottom.',
      },
      {
        kind: 'toggle',
        name: 'label',
        label: 'Percentage',
        defaultValue: true,
        description: 'Show how far through you are beside the head while scrolling.',
      },
      {
        kind: 'range',
        name: 'cellSize',
        label: 'Cell size',
        min: 8,
        max: 18,
        step: 1,
        defaultValue: 11,
        description: 'Font size of the cells, in pixels.',
      },
    ],
    code: `import { AsciiScrollMeter } from '{from}';

// Once, in your layout: it fixes itself to the edge of the window.
export function Reading() {
  return <AsciiScrollMeter{props} />;
}`,
    props: [
      {
        name: 'target',
        type: 'RefObject<HTMLElement | null>',
        defaultValue: 'the page',
        description:
          'The element whose scrolling it measures. With one, it fills the edge of its positioned parent instead of the window.',
      },
      {
        name: 'read, unread',
        type: 'string',
        defaultValue: "'█', '·'",
        description: 'Glyphs for read and unread cells.',
      },
    ],
  },
];
