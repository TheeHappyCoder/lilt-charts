import type { AsciiControl, AsciiSceneDoc } from '../ascii-scenes';

const MODES = [
  { value: 'glyphs', label: 'Glyphs' },
  { value: 'blocks', label: 'Blocks' },
] as const;

const pictureControls = (defaults: {
  color: 'source' | 'mono';
  fit: 'cover' | 'contain';
  contrast: number;
}): AsciiControl[] => [
  {
    kind: 'choice',
    name: 'mode',
    label: 'Mode',
    options: MODES,
    defaultValue: 'glyphs',
    description:
      'Glyphs draws a density ramp of type. Blocks draws solid lit blocks with a glyph cut in.',
  },
  {
    kind: 'choice',
    name: 'color',
    label: 'Colour',
    options: [
      { value: 'source', label: 'Source' },
      { value: 'mono', label: 'Mono' },
    ],
    defaultValue: defaults.color,
    description: 'Source takes each cell’s colour from the picture. Mono draws in one ink.',
  },
  {
    kind: 'choice',
    name: 'fit',
    label: 'Fit',
    options: [
      { value: 'contain', label: 'Contain' },
      { value: 'cover', label: 'Cover' },
    ],
    defaultValue: defaults.fit,
    description: 'Contain shows the whole picture with room around it. Cover fills the frame.',
  },
  {
    kind: 'range',
    name: 'contrast',
    label: 'Contrast',
    min: 0.5,
    max: 2.5,
    step: 0.05,
    defaultValue: defaults.contrast,
    description: 'Above 1 pushes tones apart; below 1 pulls them together.',
  },
  {
    kind: 'toggle',
    name: 'invert',
    label: 'Invert',
    defaultValue: false,
    description: 'Swap which end of the tones gets the dense glyphs, for dark pictures on light.',
  },
];

const scrambleProp = {
  name: 'scramble',
  type: 'string',
  defaultValue: 'code: 01<>/{}[]#$%&*+=?~',
  description: 'Characters the pointer stirs the picture into.',
};

/** Images, video and 3D models, drawn in type. */
export const mediaDocs: readonly AsciiSceneDoc[] = [
  {
    id: 'image',
    shelf: 'Media',
    title: 'Image',
    component: 'AsciiImage',
    lede: 'Any image drawn in type, each cell taking the colour of the pixels beneath it.',
    touch: 'Move to stir the picture into code. Click to send a ring through it.',
    controls: [
      {
        kind: 'text',
        name: 'src',
        label: 'Image URL',
        defaultValue: '',
        description:
          'The image to draw. Same origin, or served with CORS. Empty draws three lit spheres.',
      },
      ...pictureControls({ color: 'source', fit: 'contain', contrast: 1 }),
    ],
    usage:
      'The image’s pixels are read, so it must come from the same origin as the page or be served with CORS headers; anything else shows a short note instead. Each cell averages every pixel beneath it. The picture scrambles in when it first appears. On a light backdrop it draws as ink on paper, with the dark parts dense, and it follows a theme change without reloading. Give it a label when the picture carries meaning; without one it is hidden from screen readers.',
    props: [
      {
        name: 'tint',
        type: 'string',
        defaultValue: 'the text colour',
        description: 'The ink for mono, as any CSS colour.',
      },
      scrambleProp,
      {
        name: 'label',
        type: 'string',
        defaultValue: '—',
        description: 'Describes the picture for screen readers.',
      },
    ],
  },
  {
    id: 'video',
    shelf: 'Media',
    title: 'Video',
    component: 'AsciiVideo',
    lede: 'A video or your camera drawn in type, frame by frame.',
    touch: 'Press Start camera to see yourself. Move to stir the picture into code.',
    controls: [
      {
        kind: 'choice',
        name: 'source',
        label: 'Source',
        options: [
          { value: 'webcam', label: 'Camera' },
          { value: 'video', label: 'Video' },
        ],
        defaultValue: 'webcam',
        description: 'The reader’s camera, or the video at the URL.',
      },
      {
        kind: 'text',
        name: 'src',
        label: 'Video URL',
        defaultValue: '',
        description: 'A video to play, muted on a loop. Same origin, or served with CORS.',
      },
      ...pictureControls({ color: 'mono', fit: 'cover', contrast: 1.2 }),
      {
        kind: 'color',
        name: 'tint',
        label: 'Tint',
        defaultValue: '#8b6cff',
        description: 'The ink for mono.',
      },
    ],
    usage:
      'The camera never starts by itself: the component shows a Start camera button, and the browser asks for permission when it is pressed. The picture is mirrored, stays on the device, and the camera turns off when the component leaves the screen or unmounts. Camera access needs a secure page (https or localhost). A video plays muted on a loop while it is on screen and must come from the same origin or be served with CORS. With reduced motion, a video shows one still frame and the camera takes one picture.',
    props: [
      scrambleProp,
      {
        name: 'label',
        type: 'string',
        defaultValue: '—',
        description: 'Describes the picture for screen readers.',
      },
    ],
  },
  {
    id: 'model',
    shelf: 'Media',
    title: '3D model',
    component: 'AsciiModel',
    lede: 'A lit, solid 3D shape drawn in type, turning slowly.',
    touch: 'Move to lean it toward you. Click to flick it into a spin.',
    controls: [
      {
        kind: 'choice',
        name: 'shape',
        label: 'Shape',
        options: [
          { value: 'torus', label: 'Torus' },
          { value: 'cube', label: 'Cube' },
          { value: 'sphere', label: 'Sphere' },
          { value: 'knot', label: 'Knot' },
          { value: 'icosahedron', label: 'Icosahedron' },
        ],
        defaultValue: 'torus',
        description: 'A built-in shape. A mesh of your own replaces it.',
      },
      {
        kind: 'choice',
        name: 'mode',
        label: 'Mode',
        options: [
          { value: 'blocks', label: 'Blocks' },
          { value: 'glyphs', label: 'Glyphs' },
        ],
        defaultValue: 'blocks',
        description:
          'Blocks draws a solid lit body with a glyph cut in. Glyphs draws it in type alone.',
      },
      {
        kind: 'color',
        name: 'color',
        label: 'Colour',
        defaultValue: '#8b6cff',
        description:
          'The body’s colour. Its shadow warms toward rose; its highlight runs to white.',
      },
      {
        kind: 'range',
        name: 'spin',
        label: 'Spin',
        min: 0,
        max: 30,
        step: 0.5,
        defaultValue: 6,
        description: 'Turns a minute, on its own. 0 holds it still.',
      },
      {
        kind: 'range',
        name: 'size',
        label: 'Size',
        min: 0.3,
        max: 1,
        step: 0.01,
        defaultValue: 0.86,
        description: 'Share of the shorter side the model spans.',
      },
    ],
    props: [
      {
        name: 'mesh',
        type: '{ vertices: number[][]; faces: number[][] }',
        defaultValue: '—',
        description:
          'A mesh of your own: points as [x, y, z], and faces as lists of point indices. It is centred, scaled to fit and drawn with flat faces.',
      },
      {
        name: 'label',
        type: 'string',
        defaultValue: '—',
        description: 'Describes the model for screen readers.',
      },
    ],
  },
];
