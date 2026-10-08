import { curate, type CardDocContent, type PropRow } from './content';
import { cardExample } from './examples';
import { observationProps } from './observation-variants';

const domainProp: PropRow = {
  name: 'domain',
  type: '[number, number]',
  description:
    'Fixed value domain that must contain every value. Defaults to zero through the largest.',
};
const prismProps = (rise: number): PropRow[] => [
  {
    name: 'rise',
    type: 'number',
    description: `How many cell lengths the largest value rises above the floor, default ${rise}.`,
  },
  {
    name: 'gap',
    type: 'number',
    description: 'Space between neighbouring prisms as a share of a cell, 0 to 0.6, default 0.2.',
  },
];
const prismHover =
  'Hover or focus a prism to read its value in the headline; hit testing follows the prism, not the box around it, and nearer prisms win where they overlap. Click or press Enter to pin; Escape releases. Arrow keys step through cells. Prisms rise from the floor on load, back rows first; reduced motion skips it.';

export const skylineDoc = curate(
  {
    kind: 'skyline',
    title: 'Skyline',
    lede: 'A year of daily activity stood up in three dimensions, so streaks and busy weeks read as a skyline.',
    heroFile: 'ContributionsCard.tsx',
    hero: cardExample({
      id: 'hero',
      title: 'Contributions',
      description: '',
      kind: 'skyline',
      source: 'yearContributions',
      props: {
        title: 'Contributions',
        date: 'date',
        value: 'commits',
        from: '2025-10-08',
        to: '2026-10-07',
        today: '2026-10-07',
      },
    }),
    usage:
      '<SkylineCard title="Contributions" data={yearContributions} date="date" value="commits" />',
    dataShape: `const yearContributions = [
  { date: '2025-10-08', commits: 4 },
  { date: '2025-10-09', commits: 11 },
  // …one row per day
];`,
    dataNote:
      'One row per UTC day. Bounds default to the observed dates and span at most ten years. Height and color both carry the value. Null days stay a low grey slab, measured zero keeps a tinted slab, and days after today lie flat as outlines. Duplicate days are rejected; aggregate them first.',
    hover: prismHover,
    props: [
      ...observationProps,
      {
        name: 'date',
        type: 'date, string, or numeric key of Row',
        description: 'UTC date per day; numbers are milliseconds since the Unix epoch.',
      },
      { name: 'value', type: 'numeric key of Row', description: 'Height, color, and headline.' },
      {
        name: 'from / to',
        type: 'string | number | Date',
        description: 'Inclusive UTC bounds. Defaults to the first and last observed dates.',
      },
      {
        name: 'today',
        type: 'string | number | Date',
        description: 'UTC cutoff for future days; defaults to today.',
      },
      { name: 'weekStartsOn', type: '0 | 1', description: 'Sunday (0) or Monday (1, default).' },
      domainProp,
      ...prismProps(5),
    ],
    examples: [
      cardExample({
        id: 'quarter',
        title: 'A quarter with gaps',
        description:
          'Ninety days with missing readings and a few days still to come: gaps stay on the floor, future days are outlines.',
        kind: 'skyline',
        source: 'calendarActivity',
        props: {
          title: 'Daily activity',
          date: 'date',
          value: 'visits',
          from: '2026-07-01',
          to: '2026-10-10',
          today: '2026-09-30',
        },
      }),
    ],
  } satisfies CardDocContent,
  {},
);

export const blockCityDoc = curate(
  {
    kind: 'blockcity',
    title: 'Block city',
    lede: 'Two categories as a city block: one prism per pair, so the tallest corner of the business stands out.',
    heroFile: 'RegionSalesCard.tsx',
    hero: cardExample({
      id: 'hero',
      title: 'Sales by region',
      description: '',
      kind: 'blockcity',
      source: 'regionSales',
      props: {
        title: 'Sales by region',
        x: 'month',
        y: 'region',
        value: 'sales',
        valueFormat: { style: 'currency', currency: 'USD', notation: 'compact' },
      },
    }),
    usage:
      '<BlockCityCard title="Sales by region" data={regionSales} x="month" y="region" value="sales" />',
    dataShape: `const regionSales = [
  { region: 'North', month: 'Jan', sales: 62 },
  { region: 'North', month: 'Feb', sales: 98 },
  // …one row per region and month
];`,
    dataNote:
      'One row per x and y pair. Columns and rows keep the order they first appear in. A pair with no row stays a low grey slab, so a gap never reads as zero. Duplicate pairs are rejected; sum them first.',
    hover: prismHover,
    props: [
      ...observationProps,
      {
        name: 'x',
        type: 'text key of Row',
        description: 'Columns, running away to the right.',
      },
      {
        name: 'y',
        type: 'text key of Row',
        description: 'Rows, coming toward the viewer.',
      },
      { name: 'value', type: 'numeric key of Row', description: 'Height, color, and headline.' },
      domainProp,
      ...prismProps(4),
    ],
    examples: [],
  } satisfies CardDocContent,
  {},
);

export const ridgelineDoc = curate(
  {
    kind: 'ridgeline',
    title: 'Ridgeline',
    lede: 'Layered ridges receding into depth, so the shape of every row reads at a glance.',
    heroFile: 'WeekdayTrafficCard.tsx',
    hero: cardExample({
      id: 'hero',
      title: 'Traffic by hour',
      description: '',
      kind: 'ridgeline',
      source: 'weekdayTraffic',
      props: { title: 'Traffic by hour', series: 'day', x: 'hour', value: 'visits' },
    }),
    usage:
      '<RidgelineCard title="Traffic by hour" data={weekdayTraffic} series="day" x="hour" value="visits" />',
    dataShape: `const weekdayTraffic = [
  { day: 'Mon', hour: '00:00', visits: 64 },
  { day: 'Mon', hour: '01:00', visits: 58 },
  // …one row per day and hour
];`,
    dataNote:
      'One row per series and x position. Ridges stack back to front in the order series first appear, and x positions keep their first-seen order. Every ridge shares one value scale so heights compare. Null draws on the baseline but reads as no data; duplicate pairs are rejected.',
    hover:
      'Hover or focus anywhere under a ridge to read that point in the headline, with a dot on the line and a rule to its baseline; the other ridges soften. Nearer ridges win where they overlap. Click or press Enter to pin; Escape releases. Arrow keys walk along a ridge and on to the next.',
    props: [
      ...observationProps,
      {
        name: 'series',
        type: 'text key of Row',
        description: 'One ridge per value, back to front.',
      },
      {
        name: 'x',
        type: 'text, number, or date key of Row',
        description: 'Position along each ridge, in first-seen order.',
      },
      { name: 'value', type: 'numeric key of Row', description: 'Ridge height and headline.' },
      {
        name: 'overlap',
        type: 'number',
        description: 'How many rows the tallest peak rises over the ridges behind it, default 2.2.',
      },
      domainProp,
    ],
    examples: [],
  } satisfies CardDocContent,
  {},
);

export const spiralYearDoc = curate(
  {
    kind: 'spiral',
    title: 'Spiral year',
    lede: 'Time as a coil, one turn per year, so the same season lines up across every year.',
    heroFile: 'DailyStepsCard.tsx',
    hero: cardExample({
      id: 'hero',
      title: 'Daily steps',
      description: '',
      kind: 'spiral',
      source: 'dailySteps',
      props: {
        title: 'Daily steps',
        date: 'date',
        value: 'steps',
        aggregate: 'mean',
        valueFormat: { maximumFractionDigits: 0 },
      },
    }),
    usage: '<SpiralYearCard title="Daily steps" data={dailySteps} date="date" value="steps" />',
    dataShape: `const dailySteps = [
  { date: '2024-01-01', steps: 4210 },
  { date: '2024-01-02', steps: 6890 },
  // …one row per day
];`,
    dataNote:
      'One row per UTC day, over at most ten years. January sits at the top and each year is one turn further out, so seasons align. Each day is a bar standing out from the coil; its length and color carry the value. Null days keep a short stub. Duplicate days are rejected.',
    hover:
      'Hover or focus a day to read it in the headline. Click or press Enter to pin; Escape releases. Arrow keys step day by day along the coil. Bars appear in order on load; reduced motion skips it.',
    props: [
      ...observationProps,
      {
        name: 'date',
        type: 'date, string, or numeric key of Row',
        description: 'UTC date per day; numbers are milliseconds since the Unix epoch.',
      },
      {
        name: 'value',
        type: 'numeric key of Row',
        description: 'Bar length, color, and headline.',
      },
      {
        name: 'from / to',
        type: 'string | number | Date',
        description: 'Inclusive UTC bounds. Defaults to the first and last observed dates.',
      },
      domainProp,
    ],
    examples: [
      cardExample({
        id: 'one-year',
        title: 'One year',
        description:
          'A single year makes one turn: weekday rhythm shows as a fine comb, bursts as long bars.',
        kind: 'spiral',
        source: 'yearContributions',
        props: { title: 'Contributions', date: 'date', value: 'commits' },
      }),
    ],
  } satisfies CardDocContent,
  {},
);

export const terrainDoc = curate(
  {
    kind: 'terrain',
    title: 'Terrain',
    lede: 'A grid of readings as a lit landscape, so peaks and quiet valleys read at a glance.',
    heroFile: 'ServerLoadCard.tsx',
    hero: cardExample({
      id: 'hero',
      title: 'Server load',
      description: '',
      kind: 'terrain',
      source: 'serverLoad',
      props: {
        title: 'Server load',
        x: 'hour',
        y: 'day',
        value: 'load',
        aggregate: 'max',
        valueFormat: { style: 'unit', unit: 'percent' },
      },
    }),
    usage: '<TerrainCard title="Server load" data={serverLoad} x="hour" y="day" value="load" />',
    dataShape: `const serverLoad = [
  { day: 'Mon', hour: '00:00', load: 12 },
  { day: 'Mon', hour: '02:00', load: 14 },
  // …one row per day and hour
];`,
    dataNote:
      'One row per x and y pair, at least two of each. The surface passes exactly through every reading and is smoothed between them; smoothing sets how many samples sit between neighbours. A missing reading sits on the floor and reads as no data. Duplicate pairs are rejected.',
    hover:
      'Hover or focus a reading to drop a pin onto the surface and read it in the headline. Nearer readings win where pins overlap. Click or press Enter to pin; Escape releases. Arrow keys walk the grid. The surface lifts from a flat floor on load, back to front; reduced motion shows it settled.',
    props: [
      ...observationProps,
      { name: 'x', type: 'text key of Row', description: 'Columns, running away to the right.' },
      { name: 'y', type: 'text key of Row', description: 'Rows, coming toward the viewer.' },
      {
        name: 'value',
        type: 'numeric key of Row',
        description: 'Surface height, color, and headline.',
      },
      {
        name: 'rise',
        type: 'number',
        description: 'How many cell lengths the highest value rises, default 3.',
      },
      {
        name: 'smoothing',
        type: 'number',
        description: 'Surface samples between neighbouring readings, 1 to 6, default 4.',
      },
      domainProp,
    ],
    examples: [],
  } satisfies CardDocContent,
  {},
);

export const hexCityDoc = curate(
  {
    kind: 'hexcity',
    title: 'Hex city',
    lede: 'Every store, team, or product as a hexagonal tower, so the biggest stands tall in the middle.',
    heroFile: 'StoreRevenueCard.tsx',
    hero: cardExample({
      id: 'hero',
      title: 'Store revenue',
      description: '',
      kind: 'hexcity',
      source: 'storeRevenue',
      props: {
        title: 'Store revenue',
        label: 'store',
        value: 'revenue',
        group: 'region',
        valueFormat: { style: 'currency', currency: 'EUR', notation: 'compact' },
      },
    }),
    usage:
      '<HexCityCard title="Store revenue" data={storeRevenue} label="store" value="revenue" group="region" />',
    dataShape: `const storeRevenue = [
  { store: 'Soho', region: 'London', revenue: 98 },
  { store: 'Mitte', region: 'Berlin', revenue: 83 },
  // …one row per store
];`,
    dataNote:
      'One row per hexagon with a unique label. By default the largest value stands in the middle and the rest spiral outward by size; arrange="order" keeps your row order instead. group colors the towers and adds a legend with the total for each group. Null stays a low slab.',
    hover:
      'Hover or focus a tower to read it in the headline; hit testing follows the hexagon, and nearer towers win where they overlap. The legend highlights a group. Click or press Enter to pin; Escape releases. The city rises from its centre outward on load; reduced motion skips it.',
    props: [
      ...observationProps,
      { name: 'label', type: 'text key of Row', description: 'Unique name for each hexagon.' },
      { name: 'value', type: 'numeric key of Row', description: 'Tower height and headline.' },
      {
        name: 'group',
        type: 'text key of Row',
        description: 'Colors towers by category and adds the legend.',
      },
      {
        name: 'arrange',
        type: "'rank' | 'order'",
        description: 'Largest in the middle (default) or your row order.',
      },
      {
        name: 'rise',
        type: 'number',
        description: 'How many hexagon widths the largest value rises, default 2.',
      },
      {
        name: 'gap',
        type: 'number',
        description: 'Space between hexagons as a share of their size, default 0.12.',
      },
      {
        name: 'legend',
        type: "false | 'tiles' | 'inline' | 'list' | 'pills' | 'bars'",
        description: 'Group legend layout when group is set. Defaults to tiles.',
      },
      domainProp,
    ],
    examples: [],
  } satisfies CardDocContent,
  {},
);

export const voxelWaffleDoc = curate(
  {
    kind: 'voxel',
    title: 'Voxel waffle',
    lede: 'Shares of a whole as a block of cubes you can count, filling from the floor up.',
    heroFile: 'TeamTimeCard.tsx',
    hero: cardExample({
      id: 'hero',
      title: 'Where the time went',
      description: '',
      kind: 'voxel',
      source: 'teamTime',
      props: {
        title: 'Where the time went',
        category: 'work',
        value: 'hours',
        valueFormat: { style: 'unit', unit: 'hour' },
      },
    }),
    usage:
      '<VoxelWaffleCard title="Where the time went" data={teamTime} category="work" value="hours" />',
    dataShape: `const teamTime = [
  { work: 'Building', hours: 412 },
  { work: 'Reviews', hours: 188 },
  // …one row per category
];`,
    dataNote:
      'One row per category with a nonnegative value. Values become whole cubes that always add up to units (100 by default, so one cube is one percent), using the largest remainder. Categories fill layer by layer from the floor up in row order. Null takes no cubes but stays in the legend and the accessible table.',
    hover:
      'Hover or focus any cube to read its category in the headline; its other cubes stay lit while the rest soften. The legend highlights a category. Click or press Enter to pin; Escape releases. Cubes drop into place layer by layer on load and land with a small settle; reduced motion skips it.',
    props: [
      ...observationProps,
      { name: 'category', type: 'text key of Row', description: 'One color per category.' },
      { name: 'value', type: 'numeric key of Row', description: 'Nonnegative share of the whole.' },
      { name: 'units', type: 'number', description: 'How many cubes make the whole, default 100.' },
      {
        name: 'footprint',
        type: 'number',
        description: 'Cubes along each side of a layer, default 5.',
      },
      {
        name: 'legend',
        type: "false | 'tiles' | 'inline' | 'list' | 'pills' | 'bars'",
        description: 'Category legend layout. Defaults to tiles.',
      },
    ],
    examples: [],
  } satisfies CardDocContent,
  {},
);
