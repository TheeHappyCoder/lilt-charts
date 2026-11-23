import type { AsciiControl, AsciiSceneDoc } from './ascii-scenes';

/**
 * The Components pages, as data: interface pieces that are not drawn in type. Each is a real
 * spot in a product with one detail worth stealing. Every control is a prop, and its default must
 * match the component's.
 */
export const componentShelves = ['AI', 'Status', 'Actions', 'Data'] as const;
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
        defaultValue: '#d93848',
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
    id: 'profile-photo',
    shelf: 'Actions',
    title: 'Profile photo',
    component: 'ProfilePhoto',
    demo: 'ProfilePhotoDemo',
    lede: 'Upload, crop and save a profile photo in one place, without a modal. Inside the circle the photo stays sharp and outside it blurs and fades back, while live previews show it at the sizes people will see.',
    touch:
      'Drop a photo on the circle or try the sample. Drag to move it, scroll or pinch to zoom, then save.',
    controls: [
      {
        kind: 'text',
        name: 'name',
        label: 'Name',
        defaultValue: 'Nora Vance',
        description: 'Whose photo it is. Their initials stand in until there is one.',
      },
    ],
    props: [
      {
        name: 'src',
        type: 'string',
        defaultValue: '—',
        description: 'The photo they have now, if any.',
      },
      {
        name: 'onSave',
        type: '({ blob, size }) => void | Promise<void>',
        defaultValue: '—',
        description:
          'Called with the cropped square. Return a promise to show the upload while it runs; if it rejects, the old photo comes back.',
      },
      {
        name: 'onRemove',
        type: '() => void | Promise<void>',
        defaultValue: '—',
        description: 'Called when Remove is pressed. Without it there is no Remove button.',
      },
      {
        name: 'description',
        type: 'string',
        defaultValue: "'Shown on your profile and comments'",
        description: 'The line beside the title while nothing is happening.',
      },
      {
        name: 'size',
        type: 'number',
        defaultValue: '400',
        description: 'The side of the saved square, in pixels.',
      },
      {
        name: 'minSide',
        type: 'number',
        defaultValue: '400',
        description:
          'A photo shorter than this on its short side gets a note that it may look soft.',
      },
      {
        name: 'accept',
        type: 'string',
        defaultValue: "'image/png,image/jpeg,image/webp'",
        description: 'MIME types the picker offers and a drop accepts.',
      },
      {
        name: 'ref',
        type: 'Ref<ProfilePhotoHandle>',
        defaultValue: '—',
        description:
          'Its `edit(fileOrUrl)` opens the cropper from outside, on a sample photo for instance.',
      },
    ],
    code: `import { ProfilePhoto } from '{from}';

export function AccountPhoto({ user }: { user: { name: string; avatarUrl?: string } }) {
  return (
    <ProfilePhoto
      name={user.name}
      src={user.avatarUrl}
      onSave={async ({ blob }) => {
        const body = new FormData();
        body.append('photo', blob, 'avatar.jpg');
        await fetch('/api/avatar', { method: 'POST', body });
      }}
    />
  );
}`,
    usage: `${MOTION_USAGE} The circle and the buttons open the file picker, and a drop anywhere on it works. While a file is dragged over, it says what it holds, using only the count and type a browser shares mid-drag. In the cropper, the arrow keys move the photo, plus and minus zoom, R turns it, Enter saves and Escape cancels. The saved square is drawn on a canvas, so a photo from another site needs CORS.`,
  },
  {
    id: 'date-range',
    shelf: 'Data',
    title: 'Date range',
    component: 'DateRange',
    demo: 'DateRangeDemo',
    lede: 'A date range for the top of a report. Pick two days in either order and the earlier one becomes the start. While you look for the second, the band follows the pointer and a label counts the days. Compare draws the period before as a dashed ghost.',
    touch:
      'Click a day, then another before or after it. Hover to see the count, Shift-click to move the nearer end, Escape to let go.',
    controls: [
      {
        kind: 'toggle',
        name: 'defaultCompare',
        label: 'Compare',
        defaultValue: false,
        description: 'Start with the previous period drawn as a dashed ghost.',
      },
    ],
    props: [
      {
        name: 'value / defaultValue',
        type: '{ start: Date; end: Date }',
        defaultValue: 'the last 7 days',
        description:
          'The applied range. Either order is accepted; the earlier day always becomes the start.',
      },
      {
        name: 'onChange',
        type: '(value) => void',
        defaultValue: '—',
        description: 'Called whenever a whole range is picked: a preset, or two days.',
      },
      {
        name: 'onApply',
        type: '(value, compare) => void',
        defaultValue: '—',
        description:
          'Called when Apply is pressed, with the period before when comparing, or null.',
      },
      {
        name: 'onCancel',
        type: '() => void',
        defaultValue: '—',
        description:
          'Called when Cancel is pressed. The picker also goes back to the applied range.',
      },
      {
        name: 'presets',
        type: '{ label, range(today) }[]',
        defaultValue: 'Today … Last quarter',
        description: 'The list beside the month. Pass [] to hide it. Custom is always there.',
      },
      {
        name: 'min / max',
        type: 'Date | null',
        defaultValue: 'none / today',
        description:
          'The days that can be picked. Days after today are out of reach unless max is null.',
      },
      {
        name: 'weekStartsOn',
        type: '0 | 1',
        defaultValue: '1',
        description: '1 starts weeks on Monday, 0 on Sunday.',
      },
      {
        name: 'locales',
        type: 'Intl.LocalesArgument',
        defaultValue: "the reader's",
        description: 'The locale months and ranges are written in.',
      },
      {
        name: 'today',
        type: 'Date',
        defaultValue: "the reader's today",
        description:
          'Pins the calendar to a day, for tests and demos. The server draws a hidden stand-in month either way, so it never disagrees with the browser.',
      },
      {
        name: 'title / note',
        type: 'string',
        defaultValue: "'Date range' / —",
        description: 'The heading, and a quiet line beside the buttons such as the time zone.',
      },
    ],
    code: `import { DateRange } from '{from}';

export function ReportRange({ onRange }: { onRange: (from: Date, to: Date) => void }) {
  return (
    <DateRange
      note="Times are in UTC"
      onApply={(range) => onRange(range.start, range.end)}
    />
  );
}`,
    usage: `${MOTION_USAGE} Each day is a button in a grid with one tab stop: the arrow keys move by day and week, Home and End to the week's ends, Page Up and Page Down by month (with Shift, by year), Enter or Space picks, and Escape lets go of a half-picked range. Ranges and counts are announced politely. Days are plain calendar days, so time zones never shift a range by one.`,
  },
  {
    id: 'data-table',
    shelf: 'Data',
    title: 'Data table',
    component: 'DataTable',
    demo: 'DataTableDemo',
    lede: 'Rows that sit on the page, with one warm band for the header. Narrow it and it never squashes: at each width it snaps to the layout that fits, folding its least important columns into a line under each name while every other cell glides to its new place.',
    touch:
      'Drag the handle on the right to narrow the table. Click a header to sort; drag a header edge to resize a column, or double-click it to fit.',
    controls: [
      {
        kind: 'toggle',
        name: 'resizable',
        label: 'Resizable columns',
        defaultValue: true,
        description:
          'Lets readers drag column edges, and fit a column to its longest value with a double click.',
      },
    ],
    props: [
      {
        name: 'rows',
        type: 'Row[]',
        defaultValue: '—',
        description: 'The rows, in the order they arrive. Sorting never changes your array.',
      },
      {
        name: 'columns',
        type: 'DataTableColumn<Row>[]',
        defaultValue: '—',
        description:
          'The first column is the row’s name: it never folds and takes the room that is left. Each other column has a `width`, a `priority` (lower stays longer), and optionally `align`, `cell`, `value`, `folded` and `compact`.',
      },
      {
        name: 'rowKey',
        type: '(row) => string',
        defaultValue: '—',
        description: 'A stable key for each row, so a sorted row glides to its place.',
      },
      {
        name: 'label',
        type: 'string',
        defaultValue: '—',
        description: 'Names the table for screen readers.',
      },
      {
        name: 'defaultSort',
        type: "{ key, direction: 'asc' | 'desc' }",
        defaultValue: 'none',
        description:
          'The column to start sorted by. A first click sorts numbers high to low and text A to Z; the next flips it.',
      },
      {
        name: 'onSortChange',
        type: '(sort) => void',
        defaultValue: '—',
        description: 'Called when a reader sorts, to fetch the next page in that order, say.',
      },
      {
        name: 'minPrimaryWidth',
        type: 'number',
        defaultValue: '180',
        description: 'How narrow the first column gets before another column folds into it.',
      },
      {
        name: 'empty',
        type: 'ReactNode',
        defaultValue: "'Nothing here yet.'",
        description: 'Shown in place of rows when there are none.',
      },
    ],
    code: `import { DataTable, type DataTableColumn } from '{from}';

interface Customer {
  id: string;
  name: string;
  plan: string;
  seats: number;
  mrr: number;
}

const columns: DataTableColumn<Customer>[] = [
  { key: 'name', header: 'Customer' },
  { key: 'plan', header: 'Plan', width: 104, priority: 3 },
  {
    key: 'seats',
    header: 'Seats',
    align: 'end',
    width: 80,
    priority: 4,
    folded: (customer) => \`\${customer.seats} seats\`,
  },
  {
    key: 'mrr',
    header: 'MRR',
    align: 'end',
    width: 100,
    priority: 1,
    cell: (customer) => \`$\${customer.mrr.toLocaleString()}\`,
  },
];

export function Customers({ rows }: { rows: Customer[] }) {
  return (
    <DataTable
      label="Customers"
      rows={rows}
      columns={columns}
      rowKey={(customer) => customer.id}{props}
    />
  );
}`,
    usage: `${MOTION_USAGE} It measures its own width, not the window’s, so it snaps the same in a sidebar as on a full page. Between snaps the first column simply flexes; only a fold, a sort or a new set of rows sets the cells gliding, and a column comes back only once there is room to spare, so a scrollbar cannot make it flicker. Headers are buttons that sort, with \`aria-sort\` on the sorted one. Each column edge is a separator you can drag, step with the arrow keys (Shift for bigger steps) or fit with Enter or a double click; a dragged edge sticks to the fitted width as you pass it. Folded values stay readable to screen readers in the line under each name. It suits the tens of rows a page shows; page or virtualize past that.`,
  },
];

export const componentDoc = (id: string) => componentDocs.find((doc) => doc.id === id);

/** A page's address. */
export const componentPath = (doc: ComponentDoc) => `/components/${doc.id}`;
