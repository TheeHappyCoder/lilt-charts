import type { AsciiControl, AsciiSceneDoc } from './ascii-scenes';

/**
 * The Components pages, as data: interface pieces that are not drawn in type. Each is a real
 * spot in a product with one detail worth stealing. Every control is a prop, and its default must
 * match the component's.
 */
export const componentShelves = ['AI', 'Status', 'Actions', 'Surfaces'] as const;
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
  {
    id: 'stream-text',
    shelf: 'AI',
    title: 'Stream text',
    component: 'StreamText',
    demo: 'StreamTextDemo',
    lede: 'Text that arrives the way a model writes it. Each new word clears out of a blur while the words already there stay perfectly still, and a soft caret rides the end until the stream stops.',
    touch: 'Watch the answer stream in. Turn the blur up to see each burst of words land.',
    controls: [
      {
        kind: 'range',
        name: 'blur',
        label: 'Blur',
        min: 0,
        max: 14,
        step: 1,
        defaultValue: 6,
        description: 'How blurred a word arrives, in pixels.',
      },
      {
        kind: 'range',
        name: 'duration',
        label: 'Clears in',
        min: 150,
        max: 1200,
        step: 50,
        defaultValue: 500,
        description: 'Milliseconds a new word takes to clear.',
      },
      {
        kind: 'toggle',
        name: 'caret',
        label: 'Caret',
        defaultValue: true,
        description: 'A soft dot riding the end of the text while it streams.',
      },
      {
        kind: 'range',
        name: 'speed',
        label: 'Speed',
        min: 0.5,
        max: 3,
        step: 0.25,
        defaultValue: 1,
        description: 'How fast the stage streams its answer.',
      },
    ],
    demoOnly: ['speed'],
    props: [
      {
        name: 'text',
        type: 'string',
        defaultValue: '—',
        description:
          'Everything received so far. Pass the growing text each time; if it stops being a continuation, it starts over.',
      },
      {
        name: 'streaming',
        type: 'boolean',
        defaultValue: 'false',
        description: 'Still arriving. Shows the caret, and sets `aria-busy`.',
      },
    ],
    code: `import { StreamText } from '{from}';

export function Answer({ text, done }: { text: string; done: boolean }) {
  return <StreamText{props} text={text} streaming={!done} />;
}`,
    usage: `${MOTION_USAGE} Only the new words animate, each once, so a long answer costs no more than a short one. It keeps the text's line breaks; render Markdown yourself once it finishes if you need it.`,
  },
  {
    id: 'tool-trace',
    shelf: 'AI',
    title: 'Tool trace',
    component: 'ToolTrace',
    demo: 'ToolTraceDemo',
    lede: 'What an agent did, folded into one line. Closed, it shows the step it is on right now and the time so far; open, each step has a row whose spinner becomes a tick, and the rail down the left fills in behind each step as it completes.',
    touch: 'Close it to watch the steps roll through the one line, then open it again.',
    controls: [
      {
        kind: 'toggle',
        name: 'defaultOpen',
        label: 'Open',
        defaultValue: true,
        description: 'Open at first.',
      },
    ],
    demoOnly: ['defaultOpen'],
    props: [
      {
        name: 'steps',
        type: 'TraceStep[]',
        defaultValue: '—',
        description:
          "Each `{ id, label, detail, status, duration }`. Status is 'running', 'done' or 'error'; a running step counts its own time.",
      },
      {
        name: 'open',
        type: 'boolean',
        defaultValue: '—',
        description: 'Open or closed, when you hold the state yourself, with `onOpenChange`.',
      },
      {
        name: 'summary',
        type: '(steps) => string',
        defaultValue: "'Used N tools'",
        description: 'The closed line once nothing is running.',
      },
    ],
    code: `import { ToolTrace, type TraceStep } from '{from}';

export function AgentSteps({ steps }: { steps: TraceStep[] }) {
  return <ToolTrace steps={steps} defaultOpen />;
}`,
    usage: `${MOTION_USAGE} The header is a button with \`aria-expanded\`, and the current step is announced politely as it changes.`,
  },
  {
    id: 'number-roll',
    shelf: 'Status',
    title: 'Number roll',
    component: 'NumberRoll',
    demo: 'NumberRollDemo',
    lede: 'A number that rolls. Every digit is its own wheel on a spring, so only the digits that change move, and each blurs as fast as it turns. A new column and its comma widen in from nothing.',
    touch: 'Watch it cross 100,000, or click the card to roll it yourself.',
    controls: [
      {
        kind: 'choice',
        name: 'format',
        label: 'Format',
        options: [
          { value: 'currency', label: 'Currency' },
          { value: 'number', label: 'Number' },
          { value: 'percent', label: 'Percent' },
          { value: 'compact', label: 'Compact' },
        ],
        defaultValue: 'currency',
        description: 'Which `Intl.NumberFormat` options the stage passes.',
      },
      {
        kind: 'toggle',
        name: 'cycle',
        label: 'Play',
        defaultValue: true,
        description: 'Roll to a new figure every few seconds.',
      },
    ],
    demoOnly: ['format', 'cycle'],
    props: [
      {
        name: 'value',
        type: 'number',
        defaultValue: '—',
        description: 'The number to show.',
      },
      {
        name: 'format',
        type: 'Intl.NumberFormatOptions',
        defaultValue: '—',
        description:
          "How to write it, such as `{ style: 'currency', currency: 'USD' }` or `{ notation: 'compact' }`.",
      },
      {
        name: 'locales',
        type: 'Intl.LocalesArgument',
        defaultValue: "the reader's",
        description:
          'The locale to write it in. Set one when you render on the server, so the server and browser agree.',
      },
    ],
    code: `import { NumberRoll } from '{from}';

const USD = { style: 'currency', currency: 'USD' } as const;

export function Revenue({ total }: { total: number }) {
  return <NumberRoll value={total} format={USD} locales="en-US" />;
}`,
    usage: `${MOTION_USAGE} It takes its size and weight from the text around it and sets tabular figures, so the width only changes when a column does. Screen readers get the plain formatted number.`,
  },
  {
    id: 'swipe-row',
    shelf: 'Actions',
    title: 'Swipe row',
    component: 'SwipeRow',
    demo: 'SwipeRowDemo',
    lede: 'A row you can swipe, like a mail inbox. The action waits underneath, faint, until you cross the line; then the colour floods in, the icon jumps and rides the edge with your finger, and letting go slides the row away and folds it shut.',
    touch:
      'Drag a row left to archive it or right to mark it read. Point at one for the same actions as buttons.',
    controls: [
      {
        kind: 'range',
        name: 'threshold',
        label: 'Line',
        min: 60,
        max: 200,
        step: 4,
        defaultValue: 104,
        description: 'How far to drag, in pixels, before letting go commits.',
      },
    ],
    surfaceProp: 'surface',
    props: [
      {
        name: 'start',
        type: 'SwipeAction',
        defaultValue: '—',
        description:
          'Revealed by dragging right: `{ label, icon, tone, onAction, dismiss }`. With `dismiss: false` the row springs back instead of leaving.',
      },
      {
        name: 'end',
        type: 'SwipeAction',
        defaultValue: '—',
        description: 'Revealed by dragging left.',
      },
      {
        name: 'surface',
        type: 'string',
        defaultValue: "'Canvas'",
        description: "The row's background, which covers the actions until you drag.",
      },
    ],
    code: `import { SwipeRow } from '{from}';

export function MailRow({ mail, onArchive }: { mail: Mail; onArchive: () => void }) {
  return (
    <SwipeRow{props}
      end={{ label: 'Archive', tone: '#8b6cff', icon: <ArchiveIcon />, onAction: onArchive }}
    >
      <MailPreview mail={mail} />
    </SwipeRow>
  );
}`,
    usage: `${MOTION_USAGE} A dismissed row folds itself shut before \`onAction\` runs, so removing it from your list needs no exit animation of your own. Phones that support it give a small tap of haptics as it arms. With a mouse or the keyboard, the actions sit at the row's end on hover and focus.`,
  },
  {
    id: 'theme-flip',
    shelf: 'Actions',
    title: 'Theme flip',
    component: 'ThemeFlip',
    demo: 'ThemeFlipDemo',
    lede: 'A theme toggle whose new theme spreads out from the button in a circle with a soft, feathered edge. The sun draws in its rays as the bite slides off the moon, on a spring.',
    touch: 'Press the toggle in the corner of the window.',
    controls: [
      {
        kind: 'range',
        name: 'duration',
        label: 'Spread',
        min: 300,
        max: 1600,
        step: 50,
        defaultValue: 700,
        description: 'Milliseconds the new theme takes to spread across the page.',
      },
    ],
    props: [
      {
        name: 'theme',
        type: "'light' | 'dark'",
        defaultValue: '—',
        description: 'The theme showing now.',
      },
      {
        name: 'onThemeChange',
        type: '(theme) => void',
        defaultValue: '—',
        description:
          'Called with the other theme, inside the view transition. Apply it synchronously, as setting state or a class on the page does.',
      },
    ],
    code: `import { ThemeFlip } from '{from}';
import { useTheme } from 'next-themes';

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  return (
    <ThemeFlip{props}
      theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
      onThemeChange={setTheme}
    />
  );
}`,
    usage: `${MOTION_USAGE} The spread uses the browser's view transitions; where they are missing, or motion is reduced, the theme simply switches. It adds one small style tag the first time it runs.`,
  },
  {
    id: 'dynamic-island',
    shelf: 'Surfaces',
    title: 'Dynamic island',
    component: 'DynamicIsland',
    demo: 'DynamicIslandDemo',
    lede: 'One black shape that becomes whatever it needs to be. Change its view and the old content blurs away, the shape springs to the size of the new content, and the new content clears out of a blur as it lands.',
    touch: 'It plays silent mode, a timer, an upload and a call. Turn off Play to hold one view.',
    controls: [
      {
        kind: 'toggle',
        name: 'cycle',
        label: 'Play',
        defaultValue: true,
        description: 'Play through the views on the stage.',
      },
      {
        kind: 'choice',
        name: 'view',
        label: 'View',
        options: [
          { value: 'idle', label: 'Idle' },
          { value: 'silent', label: 'Silent' },
          { value: 'timer', label: 'Timer' },
          { value: 'upload', label: 'Upload' },
          { value: 'call', label: 'Call' },
        ],
        defaultValue: 'call',
        description: 'The view to hold when Play is off.',
      },
    ],
    demoOnly: ['cycle', 'view'],
    props: [
      {
        name: 'view',
        type: 'string',
        defaultValue: '—',
        description:
          'Names what it shows now. A new name swaps the content and reshapes the island.',
      },
      {
        name: 'children',
        type: 'ReactNode',
        defaultValue: '—',
        description: 'What it shows for this view. The island takes its size from this.',
      },
      {
        name: 'radius',
        type: 'number',
        defaultValue: '24',
        description: 'Corner radius once it is taller than a pill.',
      },
    ],
    code: `import { DynamicIsland } from '{from}';

export function Island({ call }: { call?: Call }) {
  return (
    <DynamicIsland view={call ? 'call' : 'idle'}>
      {call ? <IncomingCall call={call} /> : <div style={{ width: 118, height: 36 }} />}
    </DynamicIsland>
  );
}`,
    usage: `${MOTION_USAGE} Growing, the shape leads so the new content has room; shrinking, it waits for the old content to go so nothing is squeezed. It stays black in both themes, like the hardware it borrows from.`,
  },
];

export const componentDoc = (id: string) => componentDocs.find((doc) => doc.id === id);

/** A page's address. */
export const componentPath = (doc: ComponentDoc) => `/components/${doc.id}`;
