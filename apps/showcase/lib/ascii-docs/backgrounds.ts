import type { AsciiControl, AsciiSceneDoc } from '../ascii-scenes';

/** Places a background behind a hero's content: the scene fills the section, the copy sits on top. */
const behindHero = (name: string) => `export function ${name}() {
  return (
    <section style={{ position: 'relative', overflow: 'hidden', minHeight: 560 }}>
      <div style={{ position: 'absolute', inset: 0 }}>
        {element}
      </div>
      <div style={{ position: 'relative', maxWidth: 640, margin: '0 auto', padding: '160px 24px' }}>
        <h1>Charts that feel alive</h1>
        <p>Your content sits on top, real text that stays sharp and selectable.</p>
      </div>
    </section>
  );
}`;

const usage = (what: string) =>
  `${what} The scene fills its parent, so put it in an absolutely positioned layer behind your content and give the section a position. It is decorative and hidden from screen readers unless you give it a label. It takes its ink from the CSS colour, so it follows a light or dark theme, and with reduced motion it shows one still frame.`;

const intensity: AsciiControl = {
  kind: 'range',
  name: 'intensity',
  label: 'Intensity',
  min: 0.2,
  max: 2,
  step: 0.05,
  defaultValue: 1,
  description: 'How strongly the background shows. 1 is quiet enough for text on top.',
};

const CHARACTERS = [
  { value: '01<>/\\{}[]=+*:;', label: 'Code' },
  { value: '01', label: 'Binary' },
  { value: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', label: 'Letters' },
] as const;

/** Quiet backgrounds drawn in type, to sit behind a page. */
export const backgroundDocs: readonly AsciiSceneDoc[] = [
  {
    id: 'dot-grid',
    shelf: 'Backgrounds',
    title: 'Dot grid',
    component: 'AsciiDotGrid',
    lede: 'An even grid of small dots that swells softly around the pointer.',
    touch: 'Move to push a lens through the dots. Click to send a ring out.',
    controls: [
      {
        kind: 'range',
        name: 'spacing',
        label: 'Spacing',
        min: 2,
        max: 10,
        step: 1,
        defaultValue: 4,
        description:
          'Columns between dots across. Rows between them are chosen to keep the grid square.',
      },
      {
        kind: 'color',
        name: 'color',
        label: 'Colour',
        defaultValue: '#7c5cff',
        description: 'Colour of the dots the pointer and rings disturb.',
      },
      {
        kind: 'range',
        name: 'reach',
        label: 'Reach',
        min: 3,
        max: 24,
        step: 0.5,
        defaultValue: 10,
        description: 'Radius of the lens around the pointer, in cells.',
      },
      {
        kind: 'toggle',
        name: 'breathe',
        label: 'Breathe',
        defaultValue: true,
        description: 'A slow wave of light that drifts across the grid.',
      },
      intensity,
    ],
    code: behindHero('Hero'),
    usage: usage(
      'Use the dot grid behind a hero, a sign-up form or an empty state, where a plain colour feels flat.',
    ),
  },
  {
    id: 'matrix',
    backdrop: 'night',
    shelf: 'Backgrounds',
    title: 'Matrix',
    component: 'AsciiMatrix',
    lede: 'Digital rain, slow and sparse, with bright heads and trails that fade through the brand colours.',
    touch:
      'Move to part the rain and light the code behind it. Click to send down a burst of drops.',
    controls: [
      {
        kind: 'range',
        name: 'density',
        label: 'Density',
        min: 0.05,
        max: 1,
        step: 0.05,
        defaultValue: 0.4,
        description: 'Share of lanes with a drop falling at once.',
      },
      {
        kind: 'colors',
        name: 'colors',
        label: 'Colours',
        min: 1,
        max: 4,
        defaultValue: ['#7c5cff', '#e5489c'],
        description: 'Trail colours as hex, from just behind the head to the tail.',
      },
      {
        kind: 'choice',
        name: 'characters',
        label: 'Characters',
        options: CHARACTERS,
        defaultValue: CHARACTERS[0].value,
        description: 'Characters the rain is made of. Each cell swaps its character now and then.',
      },
      intensity,
    ],
    code: behindHero('Hero'),
    usage: usage(
      'Use the rain behind a developer product, a launch page or a terminal-themed section. Speed sets how fast it falls.',
    ),
  },
  {
    id: 'topography',
    shelf: 'Backgrounds',
    title: 'Topography',
    component: 'AsciiTopography',
    lede: 'Contour lines of slowly drifting land, drawn like a topographic map.',
    touch:
      'Move to raise a hill the lines flow around. Click to drop a pit on high ground or a peak on low.',
    controls: [
      {
        kind: 'range',
        name: 'levels',
        label: 'Levels',
        min: 4,
        max: 30,
        step: 1,
        defaultValue: 12,
        description:
          'Contour lines from the lowest ground to the highest. Every fifth is a brighter index line.',
      },
      {
        kind: 'color',
        name: 'color',
        label: 'Colour',
        defaultValue: '#8b6cff',
        description: 'Colour of the index lines, and of the ground the pointer raises.',
      },
      {
        kind: 'range',
        name: 'drift',
        label: 'Drift',
        min: 0,
        max: 4,
        step: 0.1,
        defaultValue: 1,
        description: 'How fast the land drifts and changes shape. 0 holds it still.',
      },
      intensity,
    ],
    code: behindHero('Hero'),
    usage: usage(
      'Use the map behind an outdoor, travel or data product, or anywhere a page wants texture without a picture. Each line is drawn with the stroke that follows its direction.',
    ),
  },
  {
    id: 'starfield',
    backdrop: 'night',
    shelf: 'Backgrounds',
    title: 'Starfield',
    component: 'AsciiStarfield',
    lede: 'Stars streaming toward you in perspective, growing and streaking as they near.',
    touch: 'Move to steer toward the pointer. Click to jump to warp, then ease back to cruise.',
    controls: [
      {
        kind: 'range',
        name: 'stars',
        label: 'Stars',
        min: 40,
        max: 800,
        step: 10,
        defaultValue: 200,
        description: 'Stars in flight at once.',
      },
      {
        kind: 'color',
        name: 'color',
        label: 'Colour',
        defaultValue: '#8b6cff',
        description: 'Colour of the streaks near stars leave behind.',
      },
      intensity,
    ],
    code: behindHero('Hero'),
    usage: usage(
      'Use the starfield behind a launch, a countdown or a space-themed page. Speed sets how fast you travel.',
    ),
  },
];
