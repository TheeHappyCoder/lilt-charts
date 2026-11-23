import type { AsciiSceneDoc } from './ascii-scenes';

/**
 * The Visuals pages, as data: self-contained 3:2 living product artworks built in glass, brushed
 * metal and light. Zero external dependencies — only React 19. Every control is a real prop whose
 * default matches the component.
 */
export const visualShelves = ['AI', 'Data', 'Security', 'Product'] as const;
export type VisualShelf = (typeof visualShelves)[number];

export interface VisualDoc extends Omit<AsciiSceneDoc, 'shelf' | 'kind' | 'layout'> {
  shelf: VisualShelf;
}

const VISUAL_USAGE =
  'Self-contained in one file with zero dependencies beyond React 19. It renders on a responsive 3:2 grid using container queries, follows `.dark` or `[data-theme="dark"]` automatically, pauses off screen, and settles to a calm resting state when reduced motion is preferred.';

export const visualDocs: readonly VisualDoc[] = [
  {
    id: 'effort-dial',
    shelf: 'AI',
    title: 'Effort dial',
    component: 'EffortDial',
    lede: 'A machined rotary knob inside an arc of forty-five fine ticks. It turns on a soft spring through reasoning levels while ticks light up from cool to warm and swell under the pointer.',
    touch: 'Drag the knob to any level, hover to hold it, or focus it and use the arrow keys.',
    controls: [
      {
        kind: 'text',
        name: 'caption',
        label: 'Caption',
        defaultValue: 'Reasoning effort',
        description: 'Small muted line above the active level name.',
      },
      {
        kind: 'range',
        name: 'hold',
        label: 'Hold (ms)',
        min: 800,
        max: 5000,
        step: 100,
        defaultValue: 2100,
        description: 'Milliseconds each level rests before advancing automatically.',
      },
    ],
    props: [
      {
        name: 'levels',
        type: 'EffortLevel[]',
        defaultValue: 'Low, Medium, High, Max',
        description: 'Stops along the arc, each `{ name, value }` from 0 to 1.',
      },
      {
        name: 'defaultIndex',
        type: 'number',
        defaultValue: '1',
        description: 'Index of the level selected on mount.',
      },
      {
        name: 'onChange',
        type: '(index: number) => void',
        defaultValue: '—',
        description: 'Called when the reader drags or steps to a level.',
      },
      {
        name: 'label',
        type: 'string',
        defaultValue: "'Reasoning effort'",
        description: 'Accessible slider name.',
      },
    ],
    code: `import { EffortDial } from '{from}';

export function ReasoningSetting() {
  return {element};
}`,
    usage: VISUAL_USAGE,
  },
  {
    id: 'prism-router',
    shelf: 'AI',
    title: 'Prism router',
    component: 'PrismRouter',
    lede: 'A request chip sends a pulse of plain light into a glass prism. The prism splits it into a coloured pulse and routes it down one of three fanned paths to the model that fits.',
    touch: 'Watch each prompt enter the prism, split into colour and light its destination.',
    controls: [],
    props: [
      {
        name: 'routes',
        type: '[PrismRoute, PrismRoute, PrismRoute]',
        defaultValue: 'Fast, Balanced, Deep',
        description: 'Exactly three destination chips, top to bottom, each `{ label, tone }`.',
      },
      {
        name: 'requests',
        type: 'PrismRequest[]',
        defaultValue: 'six prompts',
        description: 'Prompts played in sequence, each `{ text, route: 0 | 1 | 2 }`.',
      },
      {
        name: 'label',
        type: 'string',
        defaultValue: 'scene description',
        description: 'Accessible description for screen readers.',
      },
    ],
    code: `import { PrismRouter } from '{from}';

export function ModelRouting() {
  return {element};
}`,
    usage: VISUAL_USAGE,
  },
  {
    id: 'token-stream',
    shelf: 'AI',
    title: 'Token stream',
    component: 'TokenStream',
    lede: 'A machined display bar with a recessed well. Tokens pop in beside a glowing caret as tinted glass tiles, pushing older tokens left and cooling to plain surfaces as they travel.',
    touch: 'Watch tokens arrive in an uneven cadence, pausing naturally on punctuation.',
    controls: [
      {
        kind: 'text',
        name: 'caption',
        label: 'Caption',
        defaultValue: 'Streaming',
        description: 'Small muted label above the live token counter.',
      },
      {
        kind: 'text',
        name: 'unit',
        label: 'Unit',
        defaultValue: 'tokens',
        description: 'Word shown beside the running count.',
      },
    ],
    props: [
      {
        name: 'tokens',
        type: 'string[]',
        defaultValue: '22 sample tokens',
        description: 'Pre-split token sequence that loops through the display well.',
      },
      {
        name: 'label',
        type: 'string',
        defaultValue: 'scene description',
        description: 'Accessible description for screen readers.',
      },
    ],
    code: `import { TokenStream } from '{from}';

export function LiveTokens() {
  return {element};
}`,
    usage: VISUAL_USAGE,
  },
  {
    id: 'eval-radar',
    shelf: 'AI',
    title: 'Eval radar',
    component: 'EvalRadar',
    lede: 'Six axes on a web of hairline hexagons. A tinted, softly lit polygon morphs cleanly from one model profile to the next while its colour and average score shift along with it.',
    touch: 'Watch the polygon ease between Swift, Core and Max profiles.',
    controls: [
      {
        kind: 'toggle',
        name: 'chip',
        label: 'Profile chip',
        defaultValue: true,
        description: 'Show the pill below the web naming the active profile and average score.',
      },
    ],
    props: [
      {
        name: 'axes',
        type: 'string[]',
        defaultValue: 'Speed, Cost, Quality, Context, Safety, Tools',
        description: 'Axis labels arranged clockwise from the top.',
      },
      {
        name: 'profiles',
        type: 'RadarProfile[]',
        defaultValue: 'Swift, Core, Max',
        description: 'Profiles cycled in order, each `{ name, scores, tone }`.',
      },
      {
        name: 'label',
        type: 'string',
        defaultValue: 'scene description',
        description: 'Accessible description for screen readers.',
      },
    ],
    code: `import { EvalRadar } from '{from}';

export function ModelBenchmarks() {
  return {element};
}`,
    usage: VISUAL_USAGE,
  },
  {
    id: 'signal-lens',
    shelf: 'Data',
    title: 'Signal lens',
    component: 'SignalLens',
    lede: 'A magnifying glass lens drifts across a quiet field of dots. The few dots that matter bloom into colour beneath the glass, leave a fading trail behind it, and update the live match count.',
    touch: 'Move your pointer across the frame and the lens follows on a soft spring.',
    controls: [
      {
        kind: 'toggle',
        name: 'followPointer',
        label: 'Follow pointer',
        defaultValue: true,
        description: 'Let the lens track the pointer while it hovers over the frame.',
      },
      {
        kind: 'toggle',
        name: 'chip',
        label: 'Match chip',
        defaultValue: true,
        description: 'Show the live match counter suspended under the lens.',
      },
    ],
    props: [
      {
        name: 'unit',
        type: 'string | ((count: number) => string)',
        defaultValue: 'match / matches',
        description: 'Word after the count in the chip.',
      },
      {
        name: 'label',
        type: 'string',
        defaultValue: 'scene description',
        description: 'Accessible description for screen readers.',
      },
    ],
    code: `import { SignalLens } from '{from}';

export function SignalDetection() {
  return {element};
}`,
    usage: VISUAL_USAGE,
  },
  {
    id: 'growth-bars',
    shelf: 'Data',
    title: 'Growth bars',
    component: 'GrowthBars',
    lede: 'A row of frosted glass pillars standing on a faintly reflective floor. One after another they rise and fill with light from cool blue to warm pink while the latest metric counts up above them.',
    touch:
      'Watch the staggered pillars rise, cast pools on the floor and settle into the headline.',
    controls: [
      {
        kind: 'text',
        name: 'caption',
        label: 'Caption',
        defaultValue: 'MRR',
        description: 'Short label inside the callout pill.',
      },
      {
        kind: 'text',
        name: 'delta',
        label: 'Delta',
        defaultValue: '+32%',
        description: 'Period-over-period change shown at the end of the pill.',
      },
    ],
    props: [
      {
        name: 'values',
        type: 'number[]',
        defaultValue: '[13.4, 17.2, 15.9, 24.1, 29.8, 36.5, 48.2]',
        description: 'One value per pillar, oldest first.',
      },
      {
        name: 'format',
        type: '(value: number) => string',
        defaultValue: '(v) => `$${v.toFixed(1)}k`',
        description: 'Formats the animated counter in the pill.',
      },
      {
        name: 'label',
        type: 'string',
        defaultValue: 'scene description',
        description: 'Accessible description for screen readers.',
      },
    ],
    code: `import { GrowthBars } from '{from}';

export function RevenueGrowth() {
  return {element};
}`,
    usage: VISUAL_USAGE,
  },
  {
    id: 'usage-capsule',
    shelf: 'Data',
    title: 'Usage capsule',
    component: 'UsageCapsule',
    lede: 'A tall glass vessel etched with graduations holding rolling pastel liquid and drifting bubbles. As quota rises in calm steps, the readout underneath counts along and light pools below.',
    touch: 'Watch the liquid surface roll and step smoothly through quota milestones.',
    controls: [
      {
        kind: 'text',
        name: 'caption',
        label: 'Caption',
        defaultValue: 'Tokens used',
        description: 'Muted line beneath the numeric readout.',
      },
      {
        kind: 'text',
        name: 'unit',
        label: 'Unit',
        defaultValue: '%',
        description: 'Suffix beside the percentage figure.',
      },
      {
        kind: 'range',
        name: 'hold',
        label: 'Hold (ms)',
        min: 900,
        max: 5000,
        step: 100,
        defaultValue: 2300,
        description: 'Milliseconds each fill level rests before stepping.',
      },
    ],
    props: [
      {
        name: 'levels',
        type: 'number[]',
        defaultValue: '[0.38, 0.64, 0.82]',
        description: 'Fill fractions between 0 and 1 stepped through in a loop.',
      },
      {
        name: 'label',
        type: 'string',
        defaultValue: 'scene description',
        description: 'Accessible description for screen readers.',
      },
    ],
    code: `import { UsageCapsule } from '{from}';

export function QuotaMeter() {
  return {element};
}`,
    usage: VISUAL_USAGE,
  },
  {
    id: 'passkey-scan',
    shelf: 'Security',
    title: 'Passkey scan',
    component: 'PasskeyScan',
    lede: 'A fingerprint etched on a soft glass tile. A hairline of light sweeps upward, illuminating every ridge from blue through violet to peach before a check badge pops onto the corner.',
    touch: 'Watch the scan beam rise through the ridges and lock in verification.',
    controls: [
      {
        kind: 'text',
        name: 'scanning',
        label: 'Scanning',
        defaultValue: 'Verifying…',
        description: 'Status text while the beam is rising.',
      },
      {
        kind: 'text',
        name: 'verified',
        label: 'Verified',
        defaultValue: 'Passkey verified',
        description: 'Status text once the scan completes.',
      },
      {
        kind: 'toggle',
        name: 'chip',
        label: 'Status chip',
        defaultValue: true,
        description: 'Show the status pill below the tile.',
      },
    ],
    props: [
      {
        name: 'label',
        type: 'string',
        defaultValue: 'scene description',
        description: 'Accessible description for screen readers.',
      },
    ],
    code: `import { PasskeyScan } from '{from}';

export function PasskeyAuth() {
  return {element};
}`,
    usage: VISUAL_USAGE,
  },
  {
    id: 'guard-shield',
    shelf: 'Security',
    title: 'Guard shield',
    component: 'GuardShield',
    lede: 'A faceted glass shield suspended inside a faint dotted dome. Incoming threats drift in from the perimeter and dissolve on impact, lighting a short pastel arc and incrementing the counter.',
    touch: 'Watch incoming packets strike the outer dome and increment the blocked counter.',
    controls: [
      {
        kind: 'range',
        name: 'start',
        label: 'Start count',
        min: 0,
        max: 500,
        step: 4,
        defaultValue: 128,
        description: 'Initial number shown in the chip.',
      },
      {
        kind: 'text',
        name: 'unit',
        label: 'Unit',
        defaultValue: 'blocked',
        description: 'Word after the counter.',
      },
      {
        kind: 'toggle',
        name: 'chip',
        label: 'Counter chip',
        defaultValue: true,
        description: 'Show the counting pill under the shield.',
      },
    ],
    props: [
      {
        name: 'tones',
        type: 'GuardTone[]',
        defaultValue: "['blue', 'peach', 'violet']",
        description: 'Palette of arc colours cycled on each deflection.',
      },
      {
        name: 'label',
        type: 'string',
        defaultValue: 'scene description',
        description: 'Accessible description for screen readers.',
      },
    ],
    code: `import { GuardShield } from '{from}';

export function ThreatGuard() {
  return {element};
}`,
    usage: VISUAL_USAGE,
  },
  {
    id: 'redaction-glass',
    shelf: 'Security',
    title: 'Redaction glass',
    component: 'RedactionGlass',
    lede: 'A clean customer record sits in plain type while a thick plate of frosted glass glides over the values, blurring every private field with real backdrop-filter optics and a tiny lock.',
    touch: 'Watch the frosted plate glide across the record and obscure the sensitive column.',
    controls: [
      {
        kind: 'text',
        name: 'unit',
        label: 'Chip suffix',
        defaultValue: 'fields hidden',
        description: 'Text shown after the count in the chip below.',
      },
    ],
    props: [
      {
        name: 'fields',
        type: 'RedactionField[]',
        defaultValue: 'Name, Card, Email',
        description: 'Two to four `{ label, value }` rows.',
      },
      {
        name: 'label',
        type: 'string',
        defaultValue: 'scene description',
        description: 'Accessible description for screen readers.',
      },
    ],
    code: `import { RedactionGlass } from '{from}';

export function PiiShield() {
  return {element};
}`,
    usage: VISUAL_USAGE,
  },
  {
    id: 'auto-toggle',
    shelf: 'Product',
    title: 'Auto toggle',
    component: 'AutoToggle',
    lede: 'One oversized machined switch with a brushed-metal cap and fine knurling. Flip it on and warm-to-cool light floods the recessed well from underneath while the state rolls over below.',
    touch: 'Click the switch (or press Space) to flip it yourself; hovering pauses the loop.',
    controls: [
      {
        kind: 'text',
        name: 'caption',
        label: 'Caption',
        defaultValue: 'Autopilot',
        description: 'Small muted label under the switch.',
      },
      {
        kind: 'text',
        name: 'onWord',
        label: 'On word',
        defaultValue: 'On',
        description: 'Readout text when switched on.',
      },
      {
        kind: 'text',
        name: 'offWord',
        label: 'Off word',
        defaultValue: 'Off',
        description: 'Readout text when switched off.',
      },
    ],
    props: [
      {
        name: 'defaultOn',
        type: 'boolean',
        defaultValue: 'false',
        description: 'Initial switch state.',
      },
      {
        name: 'holdOn, holdOff',
        type: 'number',
        defaultValue: '3400, 1900',
        description: 'Milliseconds held in each state during automatic cycling.',
      },
      {
        name: 'onChange',
        type: '(on: boolean) => void',
        defaultValue: '—',
        description: 'Called whenever the reader flips the switch.',
      },
    ],
    code: `import { AutoToggle } from '{from}';

export function AutopilotSwitch() {
  return {element};
}`,
    usage: VISUAL_USAGE,
  },
  {
    id: 'diff-patch',
    shelf: 'Product',
    title: 'Diff patch',
    component: 'DiffPatch',
    lede: 'Surrounding code sits faintly on the page while a faulty line lifts out as a thick tinted slab, rotates 180 degrees in 3D, and lands on its green fix with a passing glint.',
    touch: 'Watch the faulty slab turn over on its long axis into the corrected line.',
    controls: [
      {
        kind: 'range',
        name: 'start',
        label: 'Start line',
        min: 1,
        max: 200,
        step: 1,
        defaultValue: 12,
        description: 'Line number of the first context line shown.',
      },
    ],
    props: [
      {
        name: 'before, after',
        type: 'string[]',
        defaultValue: 'retry helper lines',
        description: 'Up to two context lines above and below the slab.',
      },
      {
        name: 'bad, fix',
        type: 'DiffPatchLine',
        defaultValue: 'missing await → await fn()',
        description: 'Each `{ code, mark? }` highlights the changed token.',
      },
      {
        name: 'notes',
        type: '[string, string]',
        defaultValue: "['1 issue found', 'Fix applied']",
        description: 'Status chip text before and after the flip.',
      },
    ],
    code: `import { DiffPatch } from '{from}';

export function AutoFix() {
  return {element};
}`,
    usage: VISUAL_USAGE,
  },
  {
    id: 'glass-card',
    shelf: 'Product',
    title: 'Glass card',
    component: 'GlassCard',
    lede: 'A frosted payment card floating in 3D space with an embossed chip and iridescent rim. It sways gently as a holographic sheen crosses its face, and leans toward your pointer on hover.',
    touch: 'Move your pointer across the frame to tilt the card in 3D.',
    controls: [
      {
        kind: 'text',
        name: 'brand',
        label: 'Brand',
        defaultValue: 'Lilt',
        description: 'Wordmark in the top-left corner of the card.',
      },
      {
        kind: 'text',
        name: 'holder',
        label: 'Holder',
        defaultValue: 'Maya Okafor',
        description: 'Cardholder name embossed along the foot.',
      },
      {
        kind: 'text',
        name: 'last4',
        label: 'Last 4',
        defaultValue: '4242',
        description: 'Four visible digits of the card number.',
      },
      {
        kind: 'text',
        name: 'expiry',
        label: 'Expiry',
        defaultValue: '09/29',
        description: 'Expiry date in the bottom-right corner.',
      },
    ],
    props: [
      {
        name: 'label',
        type: 'string',
        defaultValue: 'scene description',
        description: 'Accessible description for screen readers.',
      },
    ],
    code: `import { GlassCard } from '{from}';

export function VirtualCard() {
  return {element};
}`,
    usage: VISUAL_USAGE,
  },
  {
    id: 'receipt-roll',
    shelf: 'Product',
    title: 'Receipt roll',
    component: 'ReceiptRoll',
    lede: 'A machined thermal slot feeds a paper receipt downward in mechanical steps — line items, dashed rule, bold total and torn zigzag edge — pauses briefly, drops away and prints the next.',
    touch: 'Watch the thermal slot feed each line out with its status LED lit.',
    controls: [
      {
        kind: 'text',
        name: 'merchant',
        label: 'Merchant',
        defaultValue: 'Lilt',
        description: 'Name printed at the head of each receipt.',
      },
      {
        kind: 'text',
        name: 'total',
        label: 'Total',
        defaultValue: '$84.00',
        description: 'Bold total amount at the bottom.',
      },
      {
        kind: 'text',
        name: 'note',
        label: 'Footer note',
        defaultValue: 'Paid · Visa 4242',
        description: 'Muted confirmation line at the foot.',
      },
    ],
    props: [
      {
        name: 'number',
        type: 'number',
        defaultValue: '1042',
        description: 'Starting receipt number, incremented on every sheet.',
      },
      {
        name: 'rows',
        type: 'ReceiptRow[]',
        defaultValue: 'four billing rows',
        description: 'Line items `{ label, amount }` printed above the rule.',
      },
      {
        name: 'totalLabel',
        type: 'string',
        defaultValue: "'Total'",
        description: 'Label beside the bold total.',
      },
    ],
    code: `import { ReceiptRoll } from '{from}';

export function BillingReceipt() {
  return {element};
}`,
    usage: VISUAL_USAGE,
  },
];

export const visualDoc = (id: string) => visualDocs.find((doc) => doc.id === id);

/** A visual page's address. */
export const visualPath = (doc: VisualDoc) => `/visuals/${doc.id}`;
