import type { AsciiControl, AsciiSceneDoc } from './ascii-scenes';

/**
 * The Components pages, as data: interface pieces that are not drawn in type. Each is a real
 * spot in a product with one detail worth stealing. Every control is a prop, and its default must
 * match the component's.
 */
export const componentShelves = ['AI', 'Status', 'Actions'] as const;
export type ComponentShelf = (typeof componentShelves)[number];

export interface ComponentDoc extends Omit<AsciiSceneDoc, 'shelf' | 'kind' | 'layout'> {
  shelf: ComponentShelf;
  /** A prop that takes the stage's background colour, left out of the code. */
  surfaceProp?: string;
}

const MOTION_USAGE =
  'It inherits its font and takes its colours from the text colour around it, so it fits light and dark pages alike. It needs React and Motion; the shadcn CLI installs Motion for you. With reduced motion it keeps its states but drops the movement.';

const steps: AsciiControl = {
  kind: 'choice',
  name: 'pattern',
  label: 'Pattern',
  options: [
    { value: 'drive', label: 'Drive' },
    { value: 'dots', label: 'Dots' },
    { value: 'orbit', label: 'Orbit' },
  ],
  defaultValue: 'drive',
  description:
    "The pixel grid's pattern: a front driving right, the same in dots, or a lap of the edge.",
};

export const componentDocs: readonly ComponentDoc[] = [
  {
    id: 'connect-button',
    shelf: 'AI',
    title: 'Connect button',
    component: 'ConnectButton',
    lede: 'A button that shows what it connects to. Three provider marks sit beside the label, and on hover they ripple through every provider you support, then settle back.',
    touch: 'Hover the button, or tab to it, and watch the corners change one after another.',
    controls: [
      {
        kind: 'text',
        name: 'label',
        label: 'Label',
        defaultValue: 'Connect your AI',
        description: 'What the button says.',
      },
    ],
    props: [
      {
        name: 'logos',
        type: 'TriadLogo[]',
        defaultValue: 'PROVIDER_MARKS',
        description:
          'Marks to cycle through, each `{ id, mark }`; the first three are the resting set. Use your own for integrations, payment methods or anything else you connect to.',
      },
      {
        name: '...button',
        type: 'ButtonHTMLAttributes',
        defaultValue: '—',
        description: 'Everything a button takes, such as `onClick` and `disabled`.',
      },
    ],
    code: `import { ConnectButton } from '{from}';

export function ConnectAi() {
  return {element};
}`,
    usage: `${MOTION_USAGE} The triad is its own export, \`LogoTriad\`, with a \`cycling\` prop, so you can put it in a sidebar row or a menu item and drive it from that row's hover. The provider marks come from Lobe Icons (MIT).`,
  },
  {
    id: 'thinking',
    shelf: 'AI',
    title: 'Thinking',
    component: 'Thinking',
    lede: 'What a wait for an AI looks like: a pixel grid at work, each step rolling up through a slot like a counter, a light sweeping the words, and the seconds so far.',
    touch: 'Watch the steps roll past. The width never changes, so nothing around it moves.',
    controls: [
      steps,
      {
        kind: 'toggle',
        name: 'timer',
        label: 'Timer',
        defaultValue: true,
        description: 'Show how long it has taken so far. Turn it off inside buttons.',
      },
      {
        kind: 'toggle',
        name: 'shimmer',
        label: 'Shimmer',
        defaultValue: true,
        description: 'A grey light that sweeps across the words.',
      },
      {
        kind: 'toggle',
        name: 'loop',
        label: 'Loop',
        defaultValue: false,
        description: 'Start again after the last step instead of staying on it.',
      },
      {
        kind: 'range',
        name: 'every',
        label: 'Each step',
        min: 800,
        max: 4000,
        step: 100,
        defaultValue: 2400,
        description: 'Milliseconds on each step.',
      },
    ],
    props: [
      {
        name: 'steps',
        type: 'string[]',
        defaultValue: 'four steps',
        description:
          'What it is doing, in order. Screen readers hear the first once rather than every change.',
      },
    ],
    code: `import { Thinking } from '{from}';

export function Answering() {
  return {element};
}`,
    usage: `${MOTION_USAGE} \`PixelGrid\` is exported too, for a quieter wait inside a button.`,
  },
  {
    id: 'status-pill',
    shelf: 'Status',
    title: 'Status pill',
    component: 'StatusPill',
    demo: 'StatusPillDemo',
    lede: 'One pill that tells you where things stand. It grows or shrinks to the new words on a spring, the old words blur away as the new ones land, and the mark beside them changes too: an arc running round while it saves, a tick that draws itself when it is done.',
    touch: 'It plays a save, a dropped connection and a failure. Turn off Play to hold one status.',
    controls: [
      {
        kind: 'toggle',
        name: 'cycle',
        label: 'Play',
        defaultValue: true,
        description: 'Play through the statuses on the stage.',
      },
      {
        kind: 'choice',
        name: 'status',
        label: 'Status',
        options: [
          { value: 'saving', label: 'Saving' },
          { value: 'saved', label: 'Saved' },
          { value: 'offline', label: 'Offline' },
          { value: 'error', label: 'Error' },
        ],
        defaultValue: 'saved',
        description: 'The current status, a key of `states`.',
      },
    ],
    demoOnly: ['cycle', 'status'],
    props: [
      {
        name: 'states',
        type: 'Record<string, PillState>',
        defaultValue: 'PILL_STATES',
        description:
          "Every status it can show, each `{ label, tone, mark }`. A mark is 'spin', 'tick', 'dot', 'ring' or a node of your own.",
      },
    ],
    code: `import { StatusPill } from '{from}';

export function SaveStatus({ saving, online }: { saving: boolean; online: boolean }) {
  return <StatusPill status={!online ? 'offline' : saving ? 'saving' : 'saved'} />;
}`,
    usage: `${MOTION_USAGE} Give it your own \`states\` and \`status\` takes their keys. It announces each change politely to screen readers.`,
  },
  {
    id: 'presence',
    shelf: 'Status',
    title: 'Presence',
    component: 'Presence',
    lede: 'Who else is here. Faces overlap at rest and fan apart when you point at them; point at one and it lifts and names them. Whoever is here wears a thin ring in their colour, and while they work the ring becomes a spinner.',
    touch: 'Point at the stack, then at a face. Tab through them with the keyboard too.',
    controls: [
      {
        kind: 'range',
        name: 'max',
        label: 'Faces',
        min: 2,
        max: 6,
        step: 1,
        defaultValue: 4,
        description: 'Faces shown before the rest fold into a count.',
      },
      {
        kind: 'range',
        name: 'size',
        label: 'Size',
        min: 24,
        max: 48,
        step: 2,
        defaultValue: 34,
        description: 'Avatar size in pixels.',
      },
    ],
    surfaceProp: 'surface',
    props: [
      {
        name: 'people',
        type: 'Person[]',
        defaultValue: 'six people',
        description:
          'Who is here, each `{ name, src, live, busy, note }`. `busy` turns their ring into a spinner. Without a photo a face shows initials on a gradient picked from the name.',
      },
      {
        name: 'surface',
        type: 'string',
        defaultValue: "'Canvas'",
        description:
          'The colour behind the stack, which cuts each face out of the one under it. Set it to your background.',
      },
    ],
    code: `import { Presence } from '{from}';

export function Collaborators() {
  return {element};
}`,
    usage: `${MOTION_USAGE} Each face is a button with the person's name and note, so the stack works from the keyboard.`,
  },
  {
    id: 'hold-to-confirm',
    shelf: 'Actions',
    title: 'Hold to confirm',
    component: 'HoldToConfirm',
    lede: 'For actions that are hard to undo. Hold it and colour fills it from the left, turning the words white as it passes; let go early and it drains away, hold to the end and it lands on a tick.',
    touch: 'Press and hold, or hold Space. Let go halfway to watch it drain.',
    controls: [
      {
        kind: 'text',
        name: 'label',
        label: 'Label',
        defaultValue: 'Hold to delete',
        description: 'What holding it does.',
      },
      {
        kind: 'text',
        name: 'doneLabel',
        label: 'Done',
        defaultValue: 'Deleted',
        description: 'What it says once done.',
      },
      {
        kind: 'range',
        name: 'duration',
        label: 'Hold for',
        min: 400,
        max: 3000,
        step: 100,
        defaultValue: 1200,
        description: 'Milliseconds to hold.',
      },
      {
        kind: 'color',
        name: 'tone',
        label: 'Colour',
        defaultValue: '#ff4d5e',
        description: "The fill's colour.",
      },
    ],
    props: [
      {
        name: 'onConfirm',
        type: '() => void',
        defaultValue: '—',
        description: 'Called once the hold completes.',
      },
      {
        name: 'resetAfter',
        type: 'number',
        defaultValue: '2000',
        description: 'Milliseconds before it can be held again; 0 stays done.',
      },
    ],
    code: `import { HoldToConfirm } from '{from}';

export function DeleteProject({ onDelete }: { onDelete: () => void }) {
  return <HoldToConfirm{props} onConfirm={onDelete} />;
}`,
    usage: `${MOTION_USAGE} Space or Enter held down works like a press, and screen readers hear when it is done.`,
  },
  {
    id: 'command-copy',
    shelf: 'Actions',
    title: 'Command copy',
    component: 'CommandCopy',
    lede: 'An install command you can copy. Pick a package manager and the highlight glides to it while the command rolls over; copy it and the glyph blurs into a tick.',
    touch: 'Switch tabs, then copy the command.',
    controls: [],
    props: [
      {
        name: 'commands',
        type: 'Record<string, string>',
        defaultValue: 'pnpm, npm, yarn, bun',
        description: "One command per tool, keyed by the tab's name.",
      },
      {
        name: 'defaultTool',
        type: 'string',
        defaultValue: 'first key',
        description: 'The tab open at first.',
      },
    ],
    code: `import { CommandCopy } from '{from}';

export function Install() {
  return (
    <CommandCopy
      commands={{
        pnpm: 'pnpm add your-package',
        npm: 'npm install your-package',
        bun: 'bun add your-package',
      }}
    />
  );
}`,
    usage: MOTION_USAGE,
  },
];

export const componentDoc = (id: string) => componentDocs.find((doc) => doc.id === id);

/** A page's address. */
export const componentPath = (doc: ComponentDoc) => `/components/${doc.id}`;
