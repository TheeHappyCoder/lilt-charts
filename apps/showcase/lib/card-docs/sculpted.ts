import { curate, type CardDocContent, type PropRow } from './content';
import { cardExample } from './examples';
import { observationProps } from './observation-variants';

const text = 'text key of Row',
  numeric = 'numeric key of Row';
const prop = (name: string, type: string, description: string): PropRow => ({
  name,
  type,
  description,
});
const legend = prop(
  'legend',
  "false | 'tiles' | 'inline' | 'list' | 'pills' | 'bars'",
  'Rounded-square legend with group inspection and pinning. Defaults to tiles; false removes it.',
);
const inspection =
  'Hover or focus to read the original observation in the headline. Click or press Enter to pin; Escape releases. Arrow keys, Home, and End move between marks. Touch dragging inspects and lifting pins. Loading uses shaped shimmer, staggered draw, or breathe placeholders, holds through its opacity exit, then reveals the data. Refreshes retain accepted data. Reduced motion keeps inspection feedback and skips decorative animation.';
const common = (height: number) =>
  observationProps.map((row) =>
    row.name === 'height'
      ? {
          ...row,
          description: `Minimum plot height, default ${height}. Dense data can expand or scroll to preserve geometry.`,
        }
      : row,
  );
const links = [
  prop('source', text, 'Source node; nodes retain first-seen order.'),
  prop('target', text, 'Destination node. Must differ from source.'),
  prop(
    'value',
    numeric,
    'Nonnegative flow. Null is missing; zero has no ribbon but remains in the accessible table.',
  ),
];

export const chordLoomDoc = curate(
  {
    kind: 'chordloom',
    title: 'Chord loom',
    lede: 'Weighted flows woven through a tilted circular frame, with every ribbon available to inspect.',
    heroFile: 'TeamHandoffsCard.tsx',
    hero: cardExample({
      id: 'hero',
      title: 'Team handoffs',
      description: '',
      kind: 'chordloom',
      source: 'teamHandoffs',
      props: { title: 'Team handoffs', source: 'from', target: 'to', value: 'count' },
    }),
    usage:
      '<ChordLoomCard title="Team handoffs" data={teamHandoffs} source="from" target="to" value="count" />',
    dataShape:
      "const teamHandoffs = [\n  { from: 'Design', to: 'Build', count: 84 },\n  { from: 'Build', to: 'Review', count: 68 },\n];",
    dataNote:
      'One row per directed source/target pair. Aggregate duplicate pairs first. Ribbon width encodes flow and color identifies the source. Node sectors and legend totals include incoming plus outgoing flow; the headline counts each row once. Self-links and negative values are rejected. Null and zero do not invent a flow.',
    hover: `Ribbons weave across the frame on entrance. The pointer follows each silhouette, so gaps stay open. ${inspection}`,
    props: [
      ...common(340),
      ...links,
      prop('tilt', 'number', 'Vertical proportion of the ring, 0.4 to 1, default 0.68.'),
      prop('gap', 'number', 'Gap between node sectors in radians, 0 to 0.16, default 0.06.'),
      legend,
    ],
    examples: [
      cardExample({
        id: 'gaps',
        title: 'Incomplete handoffs',
        description:
          'Missing and measured-zero routes stay in the data table without claiming a flow.',
        kind: 'chordloom',
        source: 'handoffsWithGaps',
        props: { title: 'Incomplete handoffs', source: 'from', target: 'to', value: 'count' },
      }),
    ],
  } satisfies CardDocContent,
  {},
);

export const rankRibbonsDoc = curate(
  {
    kind: 'rankribbons',
    title: 'Rank ribbons',
    lede: 'Follow a leaderboard as its tracks climb, cross, and change places.',
    heroFile: 'ProductLeagueCard.tsx',
    hero: cardExample({
      id: 'hero',
      title: 'Product league',
      description: '',
      kind: 'rankribbons',
      source: 'productLeague',
      props: {
        title: 'Product league',
        series: 'product',
        period: 'month',
        value: 'score',
        legend: 'inline',
      },
    }),
    usage:
      '<RankRibbonsCard title="Product league" data={productLeague} series="product" period="month" value="score" />',
    dataShape:
      "const productLeague = [\n  { product: 'Orbit', month: 'Apr', score: 92 },\n  { product: 'Field', month: 'Apr', score: 72 },\n  { product: 'Orbit', month: 'May', score: 88 },\n];",
    dataNote:
      'One row per series and period; periods stay in first-seen order. Scores determine ranks independently each period. Equal scores share a competition rank (1, 1, 3). Missing values break the track. The resting headline is the mean of known scores; inspection reports the original score and rank, and the legend reports the final period score.',
    hover: `Tracks weave from left to right. Inspecting a segment highlights the whole series and reads the segment’s ending period. ${inspection}`,
    props: [
      ...common(300).map((row) =>
        row.name === 'aggregate'
          ? { ...row, description: 'Resting score summary; defaults to mean.' }
          : row,
      ),
      prop('series', text, 'One colored track per series.'),
      prop('period', text, 'Time period, in first-seen order.'),
      prop('value', numeric, 'Score used to derive rank and shown in the readout.'),
      prop(
        'order',
        "'descending' | 'ascending'",
        'Descending (default) ranks the largest value first; ascending ranks the smallest first.',
      ),
      prop('thickness', 'number', 'Track width, 3 to 18 pixels, default 10.'),
      legend,
    ],
    examples: [
      cardExample({
        id: 'gaps',
        title: 'Interrupted reporting',
        description:
          'A product can miss a report and rejoin later; the ribbon never bridges missing periods.',
        kind: 'rankribbons',
        source: 'leagueWithGaps',
        props: {
          title: 'Interrupted reporting',
          series: 'product',
          period: 'month',
          value: 'score',
          legend: 'inline',
        },
      }),
    ],
  } satisfies CardDocContent,
  {},
);

export const eventHelixDoc = curate(
  {
    kind: 'eventhelix',
    title: 'Event helix',
    lede: 'Events climb a coil: recurring times line up while each new cycle rises above the last.',
    heroFile: 'ServiceEventsCard.tsx',
    hero: cardExample({
      id: 'hero',
      title: 'Service activity',
      description: '',
      kind: 'eventhelix',
      source: 'serviceEvents',
      props: {
        title: 'Service activity',
        label: 'event',
        date: 'at',
        value: 'requests',
        group: 'service',
        legend: 'inline',
      },
    }),
    usage:
      '<EventHelixCard title="Service activity" data={serviceEvents} label="event" date="at" value="requests" group="service" />',
    dataShape:
      "const serviceEvents = [\n  { event: 'Run 01', at: '2026-09-28T02:00:00Z', service: 'API', requests: 12 },\n  { event: 'Run 02', at: '2026-09-28T06:00:00Z', service: 'Workers', requests: 29 },\n];",
    dataNote:
      'Each event has a unique label, timestamp and nonnegative magnitude. Dates accept Date objects, epoch milliseconds or ISO strings with explicit time zones (plain ISO dates are UTC). Events are sorted chronologically; simultaneous events remain individually keyboard-accessible. Daily turns start at UTC midnight; weekly turns start Monday. At most 60 cycles fit one view. Null magnitudes stay marked as missing; zero is a small measured bead.',
    hover: `The coil grows upward and beads arrive in time order. ${inspection}`,
    props: [
      ...common(360),
      prop('label', text, 'Unique event name.'),
      prop('date', 'date, string, or numeric key of Row', 'Event timestamp, interpreted in UTC.'),
      prop('value', numeric, 'Nonnegative magnitude, encoded by bead size.'),
      prop('group', text, 'Optional category color and legend.'),
      prop('cycle', "'day' | 'week'", 'One revolution per day (default) or week.'),
      prop('pitch', 'number', 'Minimum turn spacing, 26 to 100 pixels, default 54.'),
      legend,
    ],
    examples: [
      cardExample({
        id: 'burst',
        title: 'An afternoon burst',
        description:
          'Several closely timed events collect on one part of the coil while the rest retain their positions.',
        kind: 'eventhelix',
        source: 'eventBurst',
        props: {
          title: 'An afternoon burst',
          label: 'event',
          date: 'at',
          value: 'requests',
          group: 'service',
          legend: 'inline',
        },
      }),
    ],
  } satisfies CardDocContent,
  {},
);

export const contourIslandsDoc = curate(
  {
    kind: 'contourislands',
    title: 'Contour islands',
    lede: 'Clusters become contour terraces, with the actual observations still visible on their surface.',
    heroFile: 'CustomerClustersCard.tsx',
    hero: cardExample({
      id: 'hero',
      title: 'Customer activity',
      description: '',
      kind: 'contourislands',
      source: 'customerCloud',
      props: { title: 'Customer activity', label: 'account', x: 'sessions', y: 'actions' },
    }),
    usage:
      '<ContourIslandsCard title="Customer activity" data={customerCloud} label="account" x="sessions" y="actions" />',
    dataShape:
      "const customerCloud = [\n  { account: 'A', sessions: 28, actions: 38, seats: 4 },\n  { account: 'B', sessions: 78, actions: 70, seats: 2 },\n];",
    dataNote:
      'One uniquely named observation per row. A Gaussian kernel estimates density on a fixed grid; contour levels are fractions of the peak density in this view. Contours show an estimate, never an exact count or a geographic boundary. Dots preserve measured x and y with a decorative vertical lift onto their terrace. Missing coordinates remain in the accessible table but have no position. Weights are optional and nonnegative; zero contributes no density. Without weights, the headline counts located observations.',
    hover: `Terraces rise from the outside inward, then observation dots appear. Hover reports the original coordinates and weight, not the smoothed density. ${inspection}`,
    props: [
      ...common(320),
      prop('x', numeric, 'Horizontal coordinate.'),
      prop('y', numeric, 'Vertical coordinate.'),
      prop('label', text, 'Unique observation name.'),
      prop(
        'weight',
        numeric,
        'Optional nonnegative density weight; omitted means one per observation.',
      ),
      prop(
        'bandwidth',
        'number',
        'Kernel width as a fraction of each axis span, 0.04 to 0.25, default 0.1.',
      ),
      prop('levels', 'number', 'Number of contour terraces, 3 to 9, default 6.'),
    ],
    examples: [
      cardExample({
        id: 'weighted',
        title: 'Seats behind the activity',
        description:
          'Weighting by seats reveals where larger accounts concentrate, using the same observed coordinates.',
        kind: 'contourislands',
        source: 'customerCloud',
        props: {
          title: 'Seats behind the activity',
          label: 'account',
          x: 'sessions',
          y: 'actions',
          weight: 'seats',
        },
      }),
    ],
  } satisfies CardDocContent,
  {},
);

export const parallelRibbonsDoc = curate(
  {
    kind: 'parallelribbons',
    title: 'Parallel ribbons',
    lede: 'Trace a profile through several metrics and find the tradeoffs that one score would hide.',
    heroFile: 'ProductProfilesCard.tsx',
    hero: cardExample({
      id: 'hero',
      title: 'Product profiles',
      description: '',
      kind: 'parallelribbons',
      source: 'productProfiles',
      props: {
        title: 'Product profiles',
        label: 'product',
        metrics: ['speed', 'quality', 'cost', 'reach'],
        metricLabels: { speed: 'Speed', quality: 'Quality', cost: 'Cost', reach: 'Reach' },
        legend: 'inline',
      },
    }),
    usage:
      '<ParallelRibbonsCard title="Product profiles" data={productProfiles} label="product" metrics={["speed", "quality", "cost", "reach"]} />',
    dataShape:
      "const productProfiles = [\n  { product: 'Orbit', speed: 92, quality: 88, cost: 42, reach: 75 },\n  { product: 'Field', speed: 72, quality: 96, cost: 68, reach: 90 },\n];",
    dataNote:
      'One unique label per record and at least two distinct numeric metric keys. Each axis uses its own observed min/max or a supplied domain; constant axes place values in the middle. Missing readings break the ribbon. The resting headline counts records instead of adding unlike metrics; inspection reads the original value at the ending axis. Higher on an axis means larger, not necessarily better.',
    hover: `Threads weave across the axes. Inspecting a segment keeps the whole record lit while other records soften. ${inspection}`,
    props: [
      ...common(300).filter((row) => row.name !== 'aggregate'),
      prop('label', text, 'Unique record name and legend label.'),
      prop(
        'metrics',
        'readonly numeric keys of Row[]',
        'At least two distinct numeric axes, left to right.',
      ),
      prop(
        'metricLabels',
        'Partial<Record<key, string>>',
        'Optional names printed under each axis.',
      ),
      prop(
        'domains',
        'Partial<Record<key, [number, number]>>',
        'Optional fixed finite bounds containing every reading on the axis.',
      ),
      prop('thickness', 'number', 'Ribbon width, 2 to 14 pixels, default 5.'),
      legend,
    ],
    examples: [
      cardExample({
        id: 'gaps',
        title: 'Incomplete profiles',
        description:
          'Missing measurements leave a break in the record instead of becoming zeros or interpolated values.',
        kind: 'parallelribbons',
        source: 'profilesWithGaps',
        props: {
          title: 'Incomplete profiles',
          label: 'product',
          metrics: ['speed', 'quality', 'cost', 'reach'],
          legend: 'inline',
        },
      }),
    ],
  } satisfies CardDocContent,
  {},
);

export const arcBridgesDoc = curate(
  {
    kind: 'arcbridges',
    title: 'Arc bridges',
    lede: 'Weighted connections arch over a shared baseline, exposing long jumps and local handoffs.',
    heroFile: 'WorkflowBridgesCard.tsx',
    hero: cardExample({
      id: 'hero',
      title: 'Workflow handoffs',
      description: '',
      kind: 'arcbridges',
      source: 'teamHandoffs',
      props: {
        title: 'Workflow handoffs',
        source: 'from',
        target: 'to',
        value: 'count',
        legend: 'inline',
      },
    }),
    usage:
      '<ArcBridgesCard title="Workflow handoffs" data={teamHandoffs} source="from" target="to" value="count" />',
    dataShape:
      "const teamHandoffs = [\n  { from: 'Design', to: 'Build', count: 84 },\n  { from: 'Build', to: 'Review', count: 68 },\n];",
    dataNote:
      'One row per directed pair, with nonnegative weight. Nodes retain first-seen order; arch height reflects separation along that ordering, while thickness carries flow. Color identifies the source. Reverse links use a lower arch so both directions can be inspected. Legend totals count outgoing flows only. Missing and zero links remain in the accessible table without a bridge; self-links and duplicate pairs are rejected.',
    hover: `Bridges draw across their silhouettes in sequence. ${inspection}`,
    props: [
      ...common(300),
      ...links,
      prop(
        'rise',
        'number',
        'Maximum arch height as a fraction of plot height, 0.3 to 1, default 0.85.',
      ),
      prop('thickness', 'number', 'Maximum bridge width, 4 to 28 pixels, default 18.'),
      legend,
    ],
    examples: [
      cardExample({
        id: 'gaps',
        title: 'Incomplete routes',
        description:
          'Absent and measured-zero connections remain distinct in the data without drawing false bridges.',
        kind: 'arcbridges',
        source: 'handoffsWithGaps',
        props: {
          title: 'Incomplete routes',
          source: 'from',
          target: 'to',
          value: 'count',
          legend: 'inline',
        },
      }),
    ],
  } satisfies CardDocContent,
  {},
);
