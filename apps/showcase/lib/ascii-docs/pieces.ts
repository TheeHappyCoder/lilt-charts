import type { AsciiSceneDoc } from '../ascii-scenes';

const asProp = (tag: string) => ({
  name: 'as',
  type: 'ElementType',
  defaultValue: `'${tag}'`,
  description: "The element to render, such as 'h1' or 'p'.",
});

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
