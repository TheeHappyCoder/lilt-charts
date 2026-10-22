import type { AsciiSceneDoc } from '../ascii-scenes';

const SCRAMBLES = [
  { value: '01<>/\\{}[]#$%&*+=?~', label: 'Code' },
  { value: '01', label: 'Binary' },
  { value: 'abcdefghijklmnopqrstuvwxyz', label: 'Letters' },
  { value: '+-*/=<>^~', label: 'Operators' },
  { value: '.:', label: 'Dust' },
] as const;

const asProp = {
  name: 'as',
  type: 'ElementType',
  defaultValue: "'span'",
  description: "The element to render, such as 'h1' or 'p'.",
};

/** Text effects: type that decodes, types itself out, glitches, and logos set in type. */
export const textDocs: readonly AsciiSceneDoc[] = [
  {
    id: 'logo',
    shelf: 'Lettering',
    title: 'Logo',
    component: 'AsciiLogo',
    lede: 'A word set in big type, built from lit slabs of colour, with a sheen that passes now and then and snow if you want it.',
    touch: 'Move across the letters to knock cells loose. Click to send a shockwave through them.',
    controls: [
      {
        kind: 'text',
        name: 'text',
        label: 'Text',
        defaultValue: 'lilt',
        description: 'The word. It is fitted to the canvas with room to spare, so keep it short.',
      },
      {
        kind: 'colors',
        name: 'colors',
        label: 'Colours',
        min: 1,
        max: 5,
        defaultValue: ['#7c5cff', '#e5489c'],
        description: 'Gradient stops as hex colours, left to right.',
      },
      {
        kind: 'range',
        name: 'weight',
        label: 'Weight',
        min: 300,
        max: 900,
        step: 100,
        defaultValue: 800,
        description: 'Font weight of the lettering. Heavy weights make the fullest slabs.',
      },
      {
        kind: 'range',
        name: 'snow',
        label: 'Snow',
        min: 0,
        max: 2,
        step: 0.1,
        defaultValue: 0,
        description:
          'How hard it snows. Snow settles in caps on the letters, melts where the pointer rests, and falls off any letter knocked loose.',
      },
      {
        kind: 'range',
        name: 'clearBelow',
        label: 'Clear below',
        min: 0,
        max: 0.7,
        step: 0.02,
        defaultValue: 0,
        description:
          'Share of the height kept clear under the word, for a headline or buttons laid over it.',
      },
    ],
    props: [
      {
        name: 'fires',
        type: 'number[]',
        defaultValue: '[]',
        description:
          'Campfires on the ground, each a share of the width, such as [0.2, 0.8]. Snow hisses into steam in them and a click stokes one. With fires the pointer has a temperature: it frosts over out in the snow, thaws and glows by a fire, and a small readout says how it is doing.',
      },
      {
        name: 'snowColor',
        type: 'string',
        defaultValue: "'#e6ecfb'",
        description: 'Colour of the snow.',
      },
      {
        name: 'font',
        type: 'string',
        defaultValue: "the system's sans serif",
        description:
          'CSS font family for the lettering. A web font must have loaded before the canvas draws.',
      },
      {
        name: 'label',
        type: 'string',
        defaultValue: '—',
        description:
          'Describes the canvas for screen readers; usually the word itself. Without one it is decorative.',
      },
    ],
  },
  {
    id: 'scramble',
    shelf: 'Text',
    title: 'Scramble',
    component: 'AsciiScramble',
    kind: 'dom',
    layout: 'center',
    stage: { fontSize: 48, fontWeight: 600 },
    lede: 'A line of real text that decodes from random glyphs, letter by letter from the left.',
    touch: 'Hover the text to stir it. Change the text or duration to watch it decode again.',
    controls: [
      {
        kind: 'text',
        name: 'text',
        label: 'Text',
        defaultValue: 'Charts that feel alive',
        description: 'The text it decodes into.',
      },
      {
        kind: 'choice',
        name: 'trigger',
        label: 'Starts',
        options: [
          { value: 'view', label: 'In view' },
          { value: 'mount', label: 'At once' },
          { value: 'hover', label: 'On hover' },
        ],
        defaultValue: 'view',
        description:
          'When it decodes: the first time it scrolls into view, as soon as it renders, or only on hover.',
      },
      {
        kind: 'range',
        name: 'duration',
        label: 'Duration',
        min: 0.3,
        max: 4,
        step: 0.1,
        defaultValue: 1.2,
        description: 'Seconds from the first letter landing to the last.',
      },
      {
        kind: 'choice',
        name: 'characters',
        label: 'Scrambles through',
        options: SCRAMBLES,
        defaultValue: SCRAMBLES[0].value,
        description: 'Characters the letters scramble through.',
      },
    ],
    code: `export function Hero() {
  return (
    <h1 style={{ fontSize: 56 }}>
      {element}
    </h1>
  );
}`,
    usage:
      'It is real text: it takes its font, size and colour from where you put it, and screen readers hear the words once, never the scramble. Each letter keeps its own width while it scrambles, so nothing around it moves, in monospace or proportional type. With reduced motion it shows the text at once.',
    props: [asProp],
  },
  {
    id: 'terminal',
    shelf: 'Text',
    title: 'Terminal',
    component: 'AsciiTerminal',
    kind: 'dom',
    layout: 'center',
    lede: 'A terminal window that types out an install session behind a blinking block cursor.',
    touch: 'It starts typing when it scrolls into view. Turn on Loop to watch it again.',
    controls: [
      {
        kind: 'range',
        name: 'speed',
        label: 'Speed',
        min: 5,
        max: 80,
        step: 1,
        defaultValue: 32,
        description: 'Characters typed per second, a little uneven, as people type.',
      },
      {
        kind: 'toggle',
        name: 'loop',
        label: 'Loop',
        defaultValue: false,
        description: 'Start over a few seconds after the last line.',
      },
      {
        kind: 'text',
        name: 'prompt',
        label: 'Prompt',
        defaultValue: '$',
        description: 'What the prompt shows before each command.',
      },
      {
        kind: 'color',
        name: 'accent',
        label: 'Accent',
        defaultValue: '#7c5cff',
        description: 'Colour of the prompt, and of ticks and pluses that start an output line.',
      },
      {
        kind: 'text',
        name: 'title',
        label: 'Title',
        defaultValue: 'zsh',
        description: "Text in the window's title bar.",
      },
    ],
    code: `export function Install() {
  return (
    <section style={{ display: 'grid', placeItems: 'center', padding: 48 }}>
      {element}
    </section>
  );
}`,
    usage:
      'Lines that start with "$ " are commands, typed key by key; the rest are their output and appear at once. The window takes the size of the finished session from the start, so the page never shifts as it types. Its colours come from the text colour around it. Screen readers get the whole session as text, and with reduced motion every line shows at once.',
    props: [
      {
        name: 'lines',
        type: 'string[]',
        defaultValue: 'a pnpm install session',
        description:
          'The session, a line each. Start a line with "$ " to type it as a command; an empty string is a blank line.',
      },
    ],
  },
  {
    id: 'glitch',
    shelf: 'Text',
    title: 'Glitch',
    component: 'AsciiGlitch',
    kind: 'dom',
    layout: 'center',
    stage: { fontSize: 140, fontWeight: 800 },
    lede: 'Text that glitches now and then: slices slip, the colours split, a letter turns to a glyph.',
    touch: 'Hover the text to make it glitch.',
    controls: [
      {
        kind: 'text',
        name: 'text',
        label: 'Text',
        defaultValue: '404',
        description: 'The text.',
      },
      {
        kind: 'range',
        name: 'intensity',
        label: 'Intensity',
        min: 0,
        max: 1,
        step: 0.05,
        defaultValue: 0.5,
        description: 'How far slices slip, how wide the colours split and how many letters swap.',
      },
      {
        kind: 'range',
        name: 'interval',
        label: 'Interval',
        min: 0,
        max: 12,
        step: 0.5,
        defaultValue: 4,
        description: 'Seconds between glitches, give or take. 0 glitches only on hover.',
      },
    ],
    code: `export function NotFound() {
  return (
    <main style={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>
      <h1 style={{ margin: 0, fontSize: 160, fontWeight: 800 }}>
        {element}
      </h1>
    </main>
  );
}`,
    usage:
      'It is real text in the font, size and colour around it. Each glitch is a burst of a few frames, a fraction of a second long, then the text snaps back; the gaps between them vary so it never falls into a beat. With reduced motion it never glitches.',
    props: [asProp],
  },
];
