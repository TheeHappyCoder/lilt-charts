import { backgroundDocs } from './ascii-docs/backgrounds';
import { dataDocs } from './ascii-docs/data';
import { interfaceDocs } from './ascii-docs/interface';
import { mediaDocs } from './ascii-docs/media';
import { sceneDocs } from './ascii-docs/scenes';
import { textDocs } from './ascii-docs/text';
import { pieceDocs } from './ascii-docs/pieces';
import { worldDocs } from './ascii-docs/worlds';

/**
 * The ASCII scenes, as data for their pages: what each is, how to touch it, and its props. Each
 * prop is also a control in the page's Customize panel, so its default here must match the
 * package's default.
 */
/** A page's id: its last path segment under `/components` or `/ascii`. */
export type AsciiSceneId = string;

interface ControlBase {
  name: string;
  label: string;
  description: string;
}

export type AsciiControl = ControlBase &
  (
    | { kind: 'range'; min: number; max: number; step: number; defaultValue: number }
    | { kind: 'toggle'; defaultValue: boolean }
    | { kind: 'colors'; min: number; max: number; defaultValue: readonly string[] }
    | { kind: 'color'; defaultValue: string }
    | { kind: 'text'; defaultValue: string }
    | {
        kind: 'choice';
        options: readonly { value: string; label: string }[];
        defaultValue: string;
      }
  );

export type AsciiValue = number | boolean | string | readonly string[];

/**
 * The shelves the pages sit on in the rail, in order. Interface and Text are UI components and
 * live under Components; the rest are ASCII scenes. Both install as source from the registry.
 */
export const componentShelves = ['Interface', 'Text'] as const;
export const asciiShelves = [
  'Lettering',
  'Backgrounds',
  'Media',
  'Data',
  'Light',
  'Space',
  'Water',
  'Nature',
  'Science',
] as const;
export type AsciiShelf = (typeof componentShelves)[number] | (typeof asciiShelves)[number];

/** The two sections these pages live in. */
export type SceneSection = 'components' | 'ascii';

export interface AsciiSceneDoc {
  id: AsciiSceneId;
  shelf: AsciiShelf;
  title: string;
  component: string;
  /**
   * A package export the stage runs in place of `component`, for a component that needs something
   * around it to show off, such as content to frame or a changing key. The code still names
   * `component`.
   */
  demo?: string;
  lede: string;
  /** What the pointer and a click do, shown under the stage. */
  touch: string;
  controls: readonly AsciiControl[];
  /**
   * `canvas` (the default) runs on the ASCII stage and takes the canvas props: cell size, speed,
   * pointer and label. `dom` is a React component of real text and takes only its own props.
   */
  kind?: 'canvas' | 'dom';
  /** `fill` (the default) fills the stage; `center` sits in the middle of it, at its own size. */
  layout?: 'fill' | 'center';
  /**
   * The code shown under the panel, with `{element}` where the component goes, or `{props}` after
   * a tag the template writes itself (for components that wrap children), and `{from}` for the
   * component's import path. A template that starts with its own import keeps it. Without one, the component fills a 560px hero section.
   */
  code?: string;
  /** Type on the stage for a component that inherits it, such as a headline effect. */
  stage?: { fontSize?: number; fontWeight?: number; fontFamily?: string };
  /** Controls that only steer the stage's demo, left out of the code. */
  demoOnly?: readonly string[];
  /** The Usage paragraph, when the canvas's own does not apply. */
  usage?: string;
  /** Props that are not controls, such as a chart's data, listed in the props table only. */
  props?: readonly { name: string; type: string; defaultValue: string; description: string }[];
}

/** Props every scene shares: the canvas's own. */
export const canvasControls: readonly AsciiControl[] = [
  {
    kind: 'range',
    name: 'cellSize',
    label: 'Cell size',
    min: 8,
    max: 24,
    step: 1,
    defaultValue: 14,
    description: 'Font size of each cell in pixels. Smaller cells draw a finer picture.',
  },
  {
    kind: 'range',
    name: 'speed',
    label: 'Speed',
    min: 0.25,
    max: 3,
    step: 0.05,
    defaultValue: 1,
    description: 'How fast the clock runs: 0.5 is half speed, 2 is double.',
  },
  {
    kind: 'toggle',
    name: 'interactive',
    label: 'Pointer',
    defaultValue: true,
    description: 'Follow the pointer and answer clicks.',
  },
];

const SCRAMBLES = [
  { value: '01<>/\\{}[]#$%&*+=?~', label: 'Code' },
  { value: '01', label: 'Binary' },
  { value: 'abcdefghijklmnopqrstuvwxyz', label: 'Letters' },
  { value: '+-*/=<>^~', label: 'Operators' },
  { value: '.:', label: 'Dust' },
] as const;

const chartColor: AsciiControl = {
  kind: 'color',
  name: 'color',
  label: 'Colour',
  defaultValue: '#8b6cff',
  description: 'Colour of the data.',
};

/** The charts drawn in type: real data, hover readouts, and a description for screen readers. */
const asciiChartScenes: readonly AsciiSceneDoc[] = [
  {
    id: 'area',
    shelf: 'Data',
    title: 'Area chart',
    component: 'AsciiArea',
    lede: 'A line and the area beneath it, drawn in type, that scrambles in from the left.',
    touch: 'Hover to read a value.',
    controls: [
      chartColor,
      {
        kind: 'toggle',
        name: 'fill',
        label: 'Fill',
        defaultValue: true,
        description: 'Fill the area under the line; off draws the line alone.',
      },
    ],
    props: [
      {
        name: 'label',
        type: 'string',
        defaultValue: 'a summary of the data',
        description:
          'Describes the chart for screen readers. Without one it reads its count, lowest, highest and latest values.',
      },
      {
        name: 'data',
        type: 'number[]',
        defaultValue: '90 days of demo data',
        description: 'The values, left to right.',
      },
      {
        name: 'labels',
        type: 'string[]',
        defaultValue: '—',
        description: 'A label for each value, read out on hover and along the bottom.',
      },
    ],
  },
  {
    id: 'bars',
    shelf: 'Data',
    title: 'Bar chart',
    component: 'AsciiBars',
    lede: 'Bars of solid type that grow in turn, their tips scrambling until they land.',
    touch: 'Hover a bar to read its value.',
    controls: [chartColor],
    props: [
      {
        name: 'label',
        type: 'string',
        defaultValue: 'a summary of the data',
        description:
          'Describes the chart for screen readers. Without one it reads its count, lowest, highest and latest values.',
      },
      {
        name: 'data',
        type: 'number[]',
        defaultValue: 'a demo year',
        description: 'The values, one bar each, left to right. Negative values draw as zero.',
      },
      {
        name: 'labels',
        type: 'string[]',
        defaultValue: '—',
        description: 'A label under each bar, also read out on hover.',
      },
    ],
  },
  {
    id: 'heatmap',
    shelf: 'Data',
    title: 'Calendar heatmap',
    component: 'AsciiHeatmap',
    lede: 'A year a glyph a day, denser and brighter on the busy ones.',
    touch: 'Hover a day to read its date and value.',
    controls: [chartColor],
    props: [
      {
        name: 'label',
        type: 'string',
        defaultValue: 'a summary of the data',
        description:
          'Describes the calendar for screen readers. Without one it reads its count, lowest, highest and latest values.',
      },
      {
        name: 'data',
        type: 'number[]',
        defaultValue: 'a demo year',
        description: 'One value a day, oldest first, the last falling on end.',
      },
      {
        name: 'end',
        type: 'string',
        defaultValue: 'today',
        description: 'The day of the last value, as YYYY-MM-DD.',
      },
    ],
  },
];

export const asciiScenes: readonly AsciiSceneDoc[] = [
  ...textDocs,
  ...interfaceDocs,
  ...pieceDocs,
  ...backgroundDocs,
  ...mediaDocs,
  ...dataDocs,
  ...sceneDocs,
  {
    id: 'glow',
    shelf: 'Light',
    title: 'Glow',
    component: 'AsciiGlow',
    lede: 'Soft gradient light, drawn in type.',
    touch: 'Move to stir the characters into code. Click to send a ring out.',
    controls: [
      {
        kind: 'colors',
        name: 'colors',
        label: 'Colours',
        min: 1,
        max: 5,
        defaultValue: ['#7c5cff', '#e5489c'],
        description: 'Gradient stops as hex colours, from the coolest light to the warmest.',
      },
      {
        kind: 'choice',
        name: 'scramble',
        label: 'Stirs into',
        options: SCRAMBLES,
        defaultValue: SCRAMBLES[0].value,
        description: 'Characters the pointer stirs the type into.',
      },
      {
        kind: 'range',
        name: 'lights',
        label: 'Lights',
        min: 1,
        max: 8,
        step: 1,
        defaultValue: 4,
        description: 'Soft lights drifting across the field.',
      },
      {
        kind: 'range',
        name: 'size',
        label: 'Light size',
        min: 0.4,
        max: 2,
        step: 0.05,
        defaultValue: 1,
        description: 'How large the lights are; 1 is about a third of the shorter side.',
      },
      {
        kind: 'range',
        name: 'reach',
        label: 'Stir reach',
        min: 1,
        max: 12,
        step: 0.5,
        defaultValue: 4.5,
        description: 'Radius of the stir around the pointer, in cells.',
      },
    ],
  },
  {
    id: 'planet',
    shelf: 'Space',
    title: 'Planet',
    component: 'AsciiPlanet',
    lede: 'A ringed world turning under its own light.',
    touch: 'Move to bring the light with you. Click to give it a spin.',
    controls: [
      {
        kind: 'color',
        name: 'sea',
        label: 'Seas',
        defaultValue: '#3d6bff',
        description: 'Colour of the seas.',
      },
      {
        kind: 'color',
        name: 'ringColour',
        label: 'Ring colour',
        defaultValue: '#d8b98a',
        description: 'Colour of the ring.',
      },
      {
        kind: 'range',
        name: 'spin',
        label: 'Spin',
        min: 0,
        max: 6,
        step: 0.1,
        defaultValue: 1.2,
        description: 'Turns per minute.',
      },
      {
        kind: 'range',
        name: 'size',
        label: 'Size',
        min: 0.2,
        max: 0.8,
        step: 0.01,
        defaultValue: 0.5,
        description: 'Share of the shorter side the planet fills, before the ring.',
      },
      {
        kind: 'toggle',
        name: 'ring',
        label: 'Ring',
        defaultValue: true,
        description: 'Draw a ring.',
      },
    ],
  },
  {
    id: 'ember',
    shelf: 'Nature',
    title: 'Campfire',
    component: 'AsciiEmber',
    lede: 'Flames that lick and fork, and sparks that drift away.',
    touch: 'Move near the fire and it leans away. Click to throw sparks.',
    controls: [
      {
        kind: 'colors',
        name: 'colors',
        label: 'Flame',
        min: 4,
        max: 4,
        defaultValue: ['#a3201a', '#f2621f', '#ffb22e', '#fff1c7'],
        description: 'Four colours from the cool edge of a flame to its core.',
      },
      {
        kind: 'range',
        name: 'width',
        label: 'Width',
        min: 0.05,
        max: 1,
        step: 0.01,
        defaultValue: 0.42,
        description: 'Share of the width the fire burns across. 1 lights the whole floor.',
      },
      {
        kind: 'range',
        name: 'height',
        label: 'Height',
        min: 0.15,
        max: 0.95,
        step: 0.01,
        defaultValue: 0.62,
        description: 'How high the flames reach, as a share of the height.',
      },
      {
        kind: 'range',
        name: 'sparks',
        label: 'Sparks',
        min: 0,
        max: 60,
        step: 1,
        defaultValue: 14,
        description: 'Sparks per second.',
      },
    ],
  },
  {
    id: 'murmuration',
    shelf: 'Nature',
    title: 'Murmuration',
    component: 'AsciiMurmuration',
    lede: 'Starlings folding across the evening sky.',
    touch: 'Your pointer is a falcon: watch the swerve ripple through. Click to scatter them.',
    controls: [
      {
        kind: 'range',
        name: 'density',
        label: 'Birds',
        min: 20,
        max: 220,
        step: 5,
        defaultValue: 90,
        description: 'Birds per thousand cells.',
      },
    ],
  },
  {
    id: 'rain',
    shelf: 'Water',
    title: 'Rain',
    component: 'AsciiRain',
    lede: 'Rain on still water, in three depths.',
    touch: 'Your pointer holds an umbrella. Click for lightning.',
    controls: [
      {
        kind: 'range',
        name: 'density',
        label: 'Rain',
        min: 2,
        max: 30,
        step: 1,
        defaultValue: 16,
        description: 'Drops per thousand cells.',
      },
      {
        kind: 'range',
        name: 'wind',
        label: 'Wind',
        min: -1,
        max: 1,
        step: 0.05,
        defaultValue: 0.45,
        description: 'Lean of the rain in columns per row. Negative leans left.',
      },
      {
        kind: 'toggle',
        name: 'umbrella',
        label: 'Umbrella',
        defaultValue: true,
        description: 'Hold an umbrella at the pointer.',
      },
    ],
  },
  {
    id: 'koi',
    shelf: 'Water',
    title: 'Koi pond',
    component: 'AsciiKoi',
    lede: 'Koi gliding under lily pads, on water that really ripples.',
    touch: 'Hold still and they drift over; move fast and they scatter. Click to feed them.',
    controls: [
      {
        kind: 'range',
        name: 'count',
        label: 'Koi',
        min: 1,
        max: 16,
        step: 1,
        defaultValue: 4,
        description: 'How many koi.',
      },
      {
        kind: 'range',
        name: 'pads',
        label: 'Lily pads',
        min: 0,
        max: 12,
        step: 1,
        defaultValue: 3,
        description: 'How many lily pads float on the pond.',
      },
      {
        kind: 'range',
        name: 'size',
        label: 'Koi size',
        min: 0.5,
        max: 1.6,
        step: 0.05,
        defaultValue: 1,
        description: 'Size of the koi, relative to the pond.',
      },
    ],
  },
  {
    id: 'jellyfish',
    shelf: 'Water',
    title: 'Jellyfish',
    component: 'AsciiJellyfish',
    lede: 'Glowing bells that pulse to swim, trailing tentacles through the dark.',
    touch: 'Your pointer is a current that pushes them aside. Click to startle them.',
    controls: [
      {
        kind: 'colors',
        name: 'colors',
        label: 'Glow',
        min: 1,
        max: 5,
        defaultValue: ['#5ee7ff', '#a78bfa', '#ff7ad9', '#ffc36b'],
        description: 'Glow colours, one per jellyfish in turn.',
      },
      {
        kind: 'range',
        name: 'count',
        label: 'Jellyfish',
        min: 1,
        max: 12,
        step: 1,
        defaultValue: 4,
        description: 'How many jellyfish.',
      },
      {
        kind: 'range',
        name: 'snow',
        label: 'Marine snow',
        min: 0,
        max: 40,
        step: 1,
        defaultValue: 12,
        description: 'Drifting flecks of marine snow per thousand cells.',
      },
    ],
  },
  {
    id: 'aurora',
    shelf: 'Light',
    title: 'Aurora',
    component: 'AsciiAurora',
    lede: 'The northern lights over a mountain lake.',
    touch: 'Move to lift the curtain. Click to send a surge of light along it.',
    controls: [
      {
        kind: 'colors',
        name: 'colors',
        label: 'Colours',
        min: 1,
        max: 5,
        defaultValue: ['#4dffa6', '#2fd6c2', '#5f8cff', '#b06bff'],
        description: "Colours from the curtain's lower edge to its top.",
      },
      {
        kind: 'range',
        name: 'curtains',
        label: 'Curtains',
        min: 1,
        max: 6,
        step: 1,
        defaultValue: 3,
        description: 'Curtains of light hanging across the sky.',
      },
      {
        kind: 'toggle',
        name: 'landscape',
        label: 'Mountains',
        defaultValue: true,
        description: 'Draw the mountains and the lake that mirrors the sky.',
      },
    ],
  },
  {
    id: 'meadow',
    shelf: 'Nature',
    title: 'Meadow',
    component: 'AsciiMeadow',
    lede: 'Grass in the wind at dusk, with flowers and fireflies.',
    touch: 'Move through the grass to part it. Click and the fireflies flash together.',
    controls: [
      {
        kind: 'range',
        name: 'wind',
        label: 'Wind',
        min: 0,
        max: 1,
        step: 0.05,
        defaultValue: 0.5,
        description: 'How strong the wind is, 0 still to 1 blustery.',
      },
      {
        kind: 'range',
        name: 'fireflies',
        label: 'Fireflies',
        min: 0,
        max: 120,
        step: 1,
        defaultValue: 28,
        description: 'Fireflies over the grass.',
      },
      {
        kind: 'range',
        name: 'flowers',
        label: 'Flowers',
        min: 0,
        max: 0.4,
        step: 0.01,
        defaultValue: 0.06,
        description: 'Share of blades that carry a flower.',
      },
    ],
  },
  {
    id: 'sea',
    shelf: 'Water',
    title: 'Moonlit sea',
    component: 'AsciiSea',
    lede: 'Swells rolling in under the moon, and its path of light across them.',
    touch: 'The moon follows your pointer across the sky. Click for a shooting star.',
    controls: [
      {
        kind: 'color',
        name: 'moon',
        label: 'Moon',
        defaultValue: '#ffe9b0',
        description: 'Colour of the moon and its path on the water.',
      },
      {
        kind: 'color',
        name: 'water',
        label: 'Water',
        defaultValue: '#5b7fe0',
        description: 'Colour of the sea.',
      },
      {
        kind: 'range',
        name: 'swell',
        label: 'Swell',
        min: 0,
        max: 1,
        step: 0.05,
        defaultValue: 0.5,
        description: 'How rough the water is, 0 glassy to 1 choppy.',
      },
    ],
  },
  {
    id: 'galaxy',
    shelf: 'Space',
    title: 'Galaxy',
    component: 'AsciiGalaxy',
    lede: 'A spiral galaxy, its arms sweeping through turning stars.',
    touch: 'Move to tilt it toward you. Click to set off a supernova.',
    controls: [
      {
        kind: 'range',
        name: 'arms',
        label: 'Arms',
        min: 1,
        max: 6,
        step: 1,
        defaultValue: 2,
        description: 'Spiral arms.',
      },
      {
        kind: 'range',
        name: 'stars',
        label: 'Stars',
        min: 150,
        max: 1500,
        step: 50,
        defaultValue: 600,
        description: 'Stars per thousand cells.',
      },
      {
        kind: 'range',
        name: 'spin',
        label: 'Spin',
        min: 0,
        max: 4,
        step: 0.1,
        defaultValue: 1,
        description: 'How fast it turns; 1 is a slow, stately spin.',
      },
    ],
  },
  ...asciiChartScenes,
  ...worldDocs,
];

export const asciiScene = (id: string) => asciiScenes.find((scene) => scene.id === id);

/** Which section a page lives in: Components for interface pieces and text effects, else ASCII. */
export const sectionOf = (scene: AsciiSceneDoc): SceneSection =>
  (componentShelves as readonly string[]).includes(scene.shelf) ? 'components' : 'ascii';

/** The pages in one section, in rail order. */
export const scenesIn = (section: SceneSection) =>
  asciiScenes.filter((scene) => sectionOf(scene) === section);

/** A page's address: `/components/<id>` or `/ascii/<id>`. */
export const scenePath = (scene: AsciiSceneDoc) => `/${sectionOf(scene)}/${scene.id}`;

/** How a control's type reads in the props table. */
export function typeOf(control: AsciiControl): string {
  switch (control.kind) {
    case 'range':
      return 'number';
    case 'toggle':
      return 'boolean';
    case 'colors':
      return 'string[]';
    default:
      return 'string';
  }
}

/** A value as it would be written in JSX source. */
export function literal(value: AsciiValue): string {
  if (typeof value === 'string') return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
  if (Array.isArray(value)) return `[${value.map((v) => literal(v)).join(', ')}]`;
  return String(value);
}

export const defaultsOf = (controls: readonly AsciiControl[]) =>
  Object.fromEntries(controls.map((control) => [control.name, control.defaultValue])) as Record<
    string,
    AsciiValue
  >;
