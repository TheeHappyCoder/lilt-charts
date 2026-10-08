import { completeProps } from './supplementary-props';
import { isExampleRow, type CardKind, type DocExample } from './examples';

export interface PropRow {
  name: string;
  type: string;
  description: string;
}

/** Everything one card documentation page shows. */
export interface CardDocContent {
  kind: CardKind;
  title: string;
  lede: string;
  hero: DocExample;
  heroFile: string;
  usage: string;
  dataShape: string;
  dataNote: string;
  /** How to add a period select. Omit for cards without one. */
  rangesUsage?: string;
  hover: string;
  /** The complete props table, usually built with `cartesianProps` or `cardProps`. */
  props: readonly PropRow[];
  /**
   * Variants: the situations this chart handles (a target, a forecast, missing values, another
   * kind of data), each dressed in the look that suits it. A form one prop makes (stacked, step,
   * needles, pie) is not a variant: it is a setting in Props. Anything that applies to every chart
   * (palette, depth, legend, axis, hover, loading) belongs to the chart style, not to a page.
   */
  examples: readonly DocExample[];
  /** Companion components documented as forms of this family, sharing its stage. */
  forms?: readonly CardForm[];
}

export interface CardForm {
  kind: CardKind;
  title: string;
  description: string;
  usage: string;
  props: readonly PropRow[];
}

interface Curation {
  /** Examples a single prop makes, or that only show a site-wide style: they live in Props. */
  drop?: readonly string[];
  /** A variant's own look: drawing props that show the family's range across the carousel. */
  style?: Readonly<Record<string, Readonly<Record<string, unknown>>>>;
  /** Clearer names for what a variant shows. */
  titles?: Readonly<Record<string, string>>;
}

/**
 * Keep a page's variants to situations, each in a look chosen for it. Unknown ids throw, so a
 * renamed example cannot silently fall out of its page.
 */
export function curate(
  doc: CardDocContent,
  { drop = [], style = {}, titles = {} }: Curation,
): CardDocContent {
  const ids = new Set(doc.examples.map((example) => example.id));
  for (const id of [...drop, ...Object.keys(style), ...Object.keys(titles)])
    if (!ids.has(id)) throw new Error(`${doc.title} has no "${id}" example.`);
  // Loading is a state every chart shares; the stage's load button plays it on any variant.
  const examples = doc.examples
    .filter((example) => !drop.includes(example.id) && example.id !== 'loading')
    .map((example) => {
      const props = style[example.id];
      const title = titles[example.id] ?? example.title;
      if (isExampleRow(example)) return { ...example, title };
      return { ...example, title, props: props ? { ...example.props, ...props } : example.props };
    });
  return {
    ...doc,
    props: completeProps(doc.kind, doc.props),
    forms: doc.forms?.map((form) => ({ ...form, props: completeProps(form.kind, form.props) })),
    examples,
  };
}

/** Props every Cartesian card (Area, Line, Bar, Combo) accepts. */
export const loadingProps: readonly PropRow[] = [
  { name: 'loading', type: 'boolean', description: 'Shows a neutral loading skeleton, not data.' },
  {
    name: 'loadingStyle',
    type: "'shimmer' | 'draw' | 'breathe'",
    description:
      'Shimmer sweeps a highlight over still shapes; draw reveals them in order; breathe lets them settle. Follows the selected look, including depth, and respects reduced motion.',
  },
  {
    name: 'empty',
    type: "'dots' | 'shape' | ReactElement | null",
    description:
      'What the card shows when the period has no data. Dots (default) gathers a quiet dot field around the message; shape lays the chart’s own outline behind it. Pass `<ChartEmpty>` with your own words, any element of your own, or null for nothing. Both looks stay still, so empty never reads as loading, and the headline reads a dash, never zero.',
  },
];

const sharedProps: readonly PropRow[] = [
  {
    name: 'title',
    type: 'string',
    description:
      'Optional visible title. Omit to render no title. Also supplies the accessible name unless aria-label is set.',
  },
  { name: 'data', type: 'Row[]', description: 'One row per x position. Omit when using ranges.' },
  { name: 'x', type: 'key of Row', description: 'Text, number, or Date field for the x axis.' },
  {
    name: 'series',
    type: '{ key, label?, color?, dashed? }[]',
    description:
      'Numeric fields to plot, checked against your row type. Dashed series are references left out of the headline.',
  },
  {
    name: 'header',
    type: 'boolean',
    description:
      'Defaults to true. False removes the whole header: title, headline, delta and period controls, with no reserved space. Pass data directly when your app owns period selection.',
  },
  {
    name: 'aria-label',
    type: 'string',
    description:
      'Accessible chart name, independent of the visible title. Falls back to title, then a generic chart name.',
  },
  {
    name: 'delta',
    type: 'number',
    description: 'Fractional change for the chip: 0.082 shows +8.2%.',
  },
  {
    name: 'deltaTone',
    type: "'default' | 'inverse' | 'neutral'",
    description: 'Use inverse when a decrease is good.',
  },
  {
    name: 'headline',
    type: 'number',
    description:
      'Resting headline. Defaults to the aggregate of non-reference series; dashed series are excluded.',
  },
  { name: 'range', type: 'string', description: 'Static period label in the header.' },
  {
    name: 'ranges',
    type: '{ id, label, data, delta?, headline? }[]',
    description: 'Turns the period label into a select. Each range swaps the data.',
  },
  {
    name: 'valueFormat',
    type: 'Intl.NumberFormatOptions',
    description: 'Formats the headline, tiles, and axis, e.g. currency.',
  },
  {
    name: 'tiles',
    type: 'boolean',
    description: 'Per-series value tiles. Defaults to true; false hides the legend.',
  },
  {
    name: 'legend',
    type: "false | 'tiles' | 'inline' | 'list' | 'pills' | 'bars'",
    description:
      'False removes the legend without changing the data. How the legend under the plot lays out: value tiles (default), a compact inline key, list rows, tinted pills, or bars that also draw each value against the largest.',
  },
  {
    name: 'legendSwatch',
    type: "'square' | 'dot' | 'line'",
    description: 'The mark beside each legend label. Defaults to a rounded square.',
  },
  { name: 'height', type: 'number', description: 'Plot height in pixels. Defaults to 240.' },
  {
    name: 'axis',
    type: "'minimal' | 'dots' | 'inline' | 'ruler' | 'classic' | 'segmented' | { x, y }",
    description:
      'Axis preset. Minimal (default) labels only the x ends and has no grid. Set one per axis with `{ x, y }`; a segmented axis can take a `gradient` to read as a range.',
  },
  {
    name: 'hover',
    type: "'pills' | 'tooltip' | 'strip' | 'headline'",
    description:
      'The one readout for the hovered point: pills on the axes (default), a tooltip with every series, a strip docked above the plot, or the headline and tiles alone.',
  },
  {
    name: 'hoverStyle',
    type: "'soft' | 'solid' | 'accent'",
    description:
      'How the pills or tooltip look. Soft (default) is surface glass; accent tints it with the hovered series.',
  },
  {
    name: 'pillSeries',
    type: "'nearest' | 'total' | key",
    description:
      'Which series the y pill reads and the tooltip leads with. Nearest (default) follows the pointer.',
  },
  {
    name: 'pillPosition',
    type: "'auto' | 'mark' | 'axis'",
    description:
      'Where the value pill sits: above the hovered mark, or on the y axis. Auto picks mark when there are no y labels.',
  },
  {
    name: 'tooltipIndicator',
    type: "'square' | 'dot' | 'line'",
    description: 'Series marker on each tooltip row, with hover="tooltip". Square by default.',
  },
  {
    name: 'background',
    type: "'dots' | 'grid' | 'lines' | 'none'",
    description: 'Texture behind the marks. Dots by default, with a hover spotlight.',
  },
  {
    name: 'surface',
    type: "'elevated' | 'outline' | 'ghost'",
    description:
      'Card treatment. Ghost removes the visual frame only; header and legend are independent controls.',
  },
  {
    name: 'palette',
    type: "'iris' | 'cobalt' | 'emerald'",
    description: 'Series colors. Iris by default; explicit series colors still win.',
  },
  {
    name: 'axisInset',
    type: 'number',
    description: 'Padding between the plot edges and axis labels or pills.',
  },
  ...loadingProps,
  {
    name: 'compare',
    type: "boolean | 'headline' | 'badge'",
    description:
      'Drag across the plot to compare two points in time. True or headline reads the change in the headline; badge reads it in the card’s tab and leaves the headline at rest.',
  },
  {
    name: 'target',
    type: 'number | { value, label? }',
    description:
      'A goal each point should reach: a labeled line, a “vs target” chip on hover, and a count of points on target at rest.',
  },
  {
    name: 'forecast',
    type: '{ from, lower?, upper?, label?, bands?: { lower, upper, label }[] }',
    description:
      'Rows from `from` onward are projections: dotted and excluded from the headline. Supply lower/upper for one envelope, or bands ordered widest to narrowest for a fan on Line and unstacked Area. Every bound is inspectable; no forecast is estimated.',
  },
  {
    name: 'sync',
    type: 'string',
    description:
      'Link hover and pins with every card that uses the same name, matched by x value. A click pins them all, with a ghost pin on the others; Alt-click pins one card only.',
  },
  {
    name: 'numberStyle',
    type: "'count' | 'pop' | 'slide' | 'roll' | 'flow' | 'scramble'",
    description:
      'How the headline animates when its value changes. Count (default) counts to the new value.',
  },
  {
    name: 'motion',
    type: "'auto' | 'none'",
    description: 'None turns off decorative motion; reduced motion does this automatically.',
  },
];

/** A Cartesian card's props: the core four, then the card's own options, then the shared rest. */
/** Line and area cards draw long series from fewer rows; bars draw every row. */
export const decimateProp: PropRow = {
  name: 'decimate',
  type: 'boolean',
  description:
    'Draw a long series from each pixel column’s first, last, lowest and highest point, so tens of thousands of points stay fast. Hover, tiles and exports still read every row. Defaults to true.',
};

export function cartesianProps(own: readonly PropRow[]): readonly PropRow[] {
  return [...sharedProps.slice(0, 4), ...own, ...sharedProps.slice(4)];
}

const prop = (name: string) => sharedProps.find((row) => row.name === name)!;

/** Presentation props every card accepts, for cards outside the Cartesian family. */
export function cardProps(own: readonly PropRow[]): readonly PropRow[] {
  return [
    prop('title'),
    prop('header'),
    prop('aria-label'),
    ...own,
    prop('valueFormat'),
    prop('surface'),
    prop('palette'),
    prop('numberStyle'),
    prop('loading'),
    prop('loadingStyle'),
    prop('empty'),
    prop('motion'),
  ];
}
