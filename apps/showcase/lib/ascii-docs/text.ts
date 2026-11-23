import type { AsciiSceneDoc } from '../ascii-scenes';

const asProp = {
  name: 'as',
  type: 'ElementType',
  defaultValue: "'span'",
  description: "The element to render, such as 'h1' or 'p'.",
};

/** Text effects: logos set in type and glitching headlines. */
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
