import type { AsciiSceneDoc } from '../ascii-scenes';

const accent = (description: string) =>
  ({
    kind: 'color',
    name: 'color',
    label: 'Colour',
    defaultValue: '#8b6cff',
    description,
  }) as const;

/** Interface pieces drawn in type: loaders, glyph borders, transitions and a cursor trail. */
export const interfaceDocs: readonly AsciiSceneDoc[] = [
  {
    id: 'loader',
    shelf: 'Interface',
    title: 'Loader',
    component: 'AsciiLoader',
    lede: 'Loaders made of type: a progress bar, a turning stroke, counting dots, or a label that scrambles like a skeleton.',
    touch: 'Pick a variant below. Give it a value and the bar fills to it.',
    kind: 'dom',
    layout: 'center',
    controls: [
      {
        kind: 'choice',
        name: 'variant',
        label: 'Variant',
        options: [
          { value: 'bar', label: 'Bar' },
          { value: 'spinner', label: 'Spinner' },
          { value: 'dots', label: 'Dots' },
          { value: 'scramble', label: 'Scramble' },
        ],
        defaultValue: 'bar',
        description:
          'How it loads: a bar of type, a turning stroke, counting dots, or the label scrambling.',
      },
      {
        kind: 'text',
        name: 'label',
        label: 'Label',
        defaultValue: 'Loading',
        description:
          'What is loading. Screen readers always hear it; the spinner, dots and scramble show it too.',
      },
      {
        kind: 'range',
        name: 'width',
        label: 'Bar width',
        min: 8,
        max: 48,
        step: 1,
        defaultValue: 24,
        description: 'Characters across the bar, between its brackets.',
      },
    ],
    code: `export function Saving() {
  return (
    <p style={{ fontSize: 14 }}>
      {element}
    </p>
  );
}`,
    usage:
      'The loader is real text in a monospace face with tabular numbers, so its width never jitters as it moves. It takes its colour and size from the text around it. With a value from 0 to 1 the bar is a progress bar to assistive technology, with the percentage read out; without one it sweeps, and every variant is a status that reads its label. With reduced motion it holds still.',
    props: [
      {
        name: 'value',
        type: 'number',
        defaultValue: '—',
        description:
          'Progress from 0 to 1. The bar fills to it and shows a percentage; without one it sweeps.',
      },
      {
        name: 'color',
        type: 'string',
        defaultValue: 'the text colour',
        description: 'Colour of the fill and the moving parts.',
      },
    ],
  },
  {
    id: 'frame',
    shelf: 'Interface',
    title: 'Frame',
    component: 'AsciiFrame',
    demo: 'AsciiFrameDemo',
    lede: 'A border drawn in glyphs around any content, with a light that runs round it on hover.',
    touch: 'Hover the card, or tab to its button, and the light runs round the border.',
    kind: 'dom',
    layout: 'center',
    controls: [
      {
        kind: 'choice',
        name: 'variant',
        label: 'Border',
        options: [
          { value: 'round', label: 'Round' },
          { value: 'line', label: 'Line' },
          { value: 'dots', label: 'Dots' },
        ],
        defaultValue: 'round',
        description: "The border's glyphs: rounded corners (.-.), plain lines (+-|), or dots.",
      },
      {
        kind: 'choice',
        name: 'trace',
        label: 'Light',
        options: [
          { value: 'hover', label: 'On hover' },
          { value: 'always', label: 'Always' },
          { value: 'none', label: 'None' },
        ],
        defaultValue: 'hover',
        description:
          'When the light runs round the border: on hover and keyboard focus, always, or never.',
      },
      accent('Colour of the light.'),
      {
        kind: 'toggle',
        name: 'stir',
        label: 'Stir',
        defaultValue: true,
        description: 'Stir faint glyphs inside the frame near the pointer.',
      },
      {
        kind: 'range',
        name: 'padding',
        label: 'Padding',
        min: 12,
        max: 64,
        step: 1,
        defaultValue: 28,
        description: 'Space between the border and the content, in pixels.',
      },
    ],
    code: `export function Plan() {
  return (
    <AsciiFrame{props}>
      <h3>Pro</h3>
      <p>Every scene, every chart, and the source.</p>
      <button type="button">Upgrade</button>
    </AsciiFrame>
  );
}`,
    usage:
      'Wrap any content in AsciiFrame: a card, a button, a pricing tier. The border is laid on a character grid measured to fit the box exactly, and it is a canvas behind the content, so the content stays real, selectable and clickable. It takes its ink from the text colour and its glyphs from the font when that is monospace. With reduced motion the border brightens on hover instead of tracing.',
    props: [
      {
        name: 'children',
        type: 'ReactNode',
        defaultValue: '—',
        description: 'The content to frame: a card, a button, a pricing tier.',
      },
    ],
  },
  {
    id: 'transition',
    shelf: 'Interface',
    title: 'Transition',
    component: 'AsciiTransition',
    demo: 'AsciiTransitionDemo',
    demoOnly: ['interval'],
    lede: 'Content that changes behind a curtain of type, sweeping across and resolving away.',
    touch: 'The slides change every few seconds. Click to change them sooner.',
    kind: 'dom',
    layout: 'center',
    controls: [
      {
        kind: 'choice',
        name: 'direction',
        label: 'Direction',
        options: [
          { value: 'right', label: 'Right' },
          { value: 'left', label: 'Left' },
          { value: 'down', label: 'Down' },
          { value: 'up', label: 'Up' },
          { value: 'radial', label: 'Radial' },
        ],
        defaultValue: 'right',
        description: 'Which way the curtain travels; radial opens from the centre.',
      },
      {
        kind: 'range',
        name: 'duration',
        label: 'Duration',
        min: 0.3,
        max: 2.5,
        step: 0.05,
        defaultValue: 0.9,
        description: 'Seconds for the whole change, covering and revealing.',
      },
      accent('Colour of the curtain.'),
      {
        kind: 'range',
        name: 'interval',
        label: 'Interval',
        min: 1.5,
        max: 8,
        step: 0.5,
        defaultValue: 3.5,
        description: 'Stage only: seconds each slide of the demo stays before the next.',
      },
    ],
    code: `import { useState } from 'react';
import { AsciiTransition } from '{from}';

const steps = ['Connect', 'Configure', 'Launch'];

export function Steps() {
  const [step, setStep] = useState(0);
  return (
    <button type="button" onClick={() => setStep((step + 1) % steps.length)}>
      <AsciiTransition id={steps[step]}{props}>
        <h3>{steps[step]}</h3>
      </AsciiTransition>
    </button>
  );
}`,
    usage:
      'Wrap content in AsciiTransition and give it an id that names what is shown, such as the tab or step. When the id changes, a front of scrambling glyphs sweeps across and hides the old content; at the midpoint the new children take its place, and a second front resolves the curtain away. The curtain is a canvas over the content, sized to it, and it only runs during a change. With reduced motion the content swaps at once. For changes you run yourself, such as moving between routes, AsciiCurtain raises and lowers the same curtain: set covered, swap the content in onCovered, then clear covered once it is ready. Every page on this site changes behind one.',
    props: [
      {
        name: 'id',
        type: 'string',
        defaultValue: '—',
        description: 'Names what AsciiTransition shows. A new id plays the change.',
      },
      {
        name: 'children',
        type: 'ReactNode',
        defaultValue: '—',
        description: 'The content for the current id.',
      },
    ],
  },
  {
    id: 'cursor-trail',
    shelf: 'Interface',
    title: 'Cursor trail',
    component: 'AsciiCursorTrail',
    demo: 'AsciiCursorTrailDemo',
    lede: 'Glyphs shed behind the pointer that drift, slow and fade.',
    touch:
      'Move across the stage to leave a trail. Click to open a ring. Away, it draws a loop of its own.',
    controls: [
      {
        kind: 'text',
        name: 'characters',
        label: 'Characters',
        defaultValue: '*+:.',
        description: 'Glyphs each mark wears as it ages, newest first.',
      },
      {
        kind: 'colors',
        name: 'colors',
        label: 'Colours',
        min: 1,
        max: 5,
        defaultValue: ['#7c5cff', '#e5489c'],
        description: 'Colours the trail runs through from its head to its tail, as hex.',
      },
      {
        kind: 'range',
        name: 'life',
        label: 'Life',
        min: 0.3,
        max: 4,
        step: 0.1,
        defaultValue: 1.2,
        description: 'Seconds a mark lasts before it fades out.',
      },
    ],
    code: `import { AsciiCursorTrail } from '{from}';

// Add the trail once, near the root: it lies over the page and lets clicks through.
export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <AsciiCursorTrail{props} />
    </>
  );
}`,
    usage:
      'Add AsciiCursorTrail once, near the root of the page. It lies over everything, fixed and click-through, and only runs while marks are alive: a still pointer costs nothing. Marks are shed by distance travelled, so a slow hand leaves a light trail and a quick one a longer wake. Set scope="parent" to keep it inside an element instead. Touch has no trail, and with reduced motion it draws nothing.',
    props: [
      {
        name: 'scope',
        type: "'window' | 'parent'",
        defaultValue: "'window'",
        description:
          'Lay the trail over the whole page, or fill the parent element. The demo fills its parent.',
      },
      {
        name: 'autopilot',
        type: 'boolean',
        defaultValue: 'false',
        description:
          'While the pointer is away, an unseen pointer draws a slow loop. The demo turns it on.',
      },
    ],
  },
  {
    id: 'ghost-cursors',
    shelf: 'Interface',
    title: 'Ghost cursors',
    component: 'CursorGhosts',
    demo: 'CursorGhostsDemo',
    kind: 'dom',
    backdrop: 'night',
    lede: 'Company for a hero: a few ghost cursors that wander it as if reading. Out in the cold they slowly freeze, shiver, and hurry to the nearest fire, where they circle until they are cosy again.',
    touch:
      'Watch a cold ghost rush to a fire. Your own pointer feels the cold too: warm it by a fire, and do not hold it there too long.',
    controls: [
      {
        kind: 'range',
        name: 'count',
        label: 'Ghosts',
        min: 1,
        max: 8,
        step: 1,
        defaultValue: 3,
        description: 'How many share the area at once. When one leaves, someone new arrives.',
      },
      {
        kind: 'range',
        name: 'chill',
        label: 'Chill',
        min: 6,
        max: 40,
        step: 1,
        defaultValue: 18,
        description: 'Roughly how many seconds a warm ghost takes to freeze.',
      },
      {
        kind: 'toggle',
        name: 'readings',
        label: 'Readings',
        defaultValue: true,
        description: 'Show a small reading beside a ghost when it shivers, rushes or warms up.',
      },
      {
        kind: 'color',
        name: 'frost',
        label: 'Frost',
        defaultValue: '#a9d8ff',
        description: 'Colour of the frost and of a cold reading.',
      },
      {
        kind: 'color',
        name: 'ember',
        label: 'Embers',
        defaultValue: '#ffb22e',
        description: 'Colour of the embers and of a warm reading.',
      },
    ],
    code: `import { CursorGhosts } from '{from}';

// Inside a positioned area. Mark each fire with data-lilt-fire; the ghosts warm up there.
export function Hero() {
  return (
    <section style={{ position: 'relative', height: 560 }}>
      <span
        data-lilt-fire=""
        style={{ position: 'absolute', left: '20%', bottom: '10%', width: 96, height: 96 }}
      />
      <CursorGhosts avoid="h1"{props} />
      <h1>Come in from the cold</h1>
    </section>
  );
}`,
    usage:
      'Put CursorGhosts inside a positioned area, such as a hero, and mark each fire there with data-lilt-fire: any element works, drawn or not. The ghosts fill the area on one canvas that never takes the pointer and run only while it is on screen and the tab is showing. They are imagined, not real visitors, so do not label them as people online. Pass avoid with a selector to keep them off a headline. With reduced motion they do not appear. Pair it with CursorWarmth so the reader’s pointer feels the cold too; the demo also lights its fires with the Logo scene’s fires prop.',
    props: [
      {
        name: 'fires',
        type: 'string',
        defaultValue: "'[data-lilt-fire]'",
        description:
          'Selector for the fires inside the area. Each warms within about its own size.',
      },
      {
        name: 'avoid',
        type: 'string',
        defaultValue: 'none',
        description: 'Selector for elements inside the area that wandering ghosts keep clear of.',
      },
      {
        name: 'seed',
        type: 'number',
        defaultValue: 'random',
        description: 'Seed for the walk, to replay the same one.',
      },
    ],
  },
];
