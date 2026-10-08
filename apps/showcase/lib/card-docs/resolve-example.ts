import type {
  AnimatedNumberVariant,
  CardLegend,
  ChartAxisStyle,
  ChartBackground,
  ChartEmptyLook,
  ChartHoverReadout,
  ChartLoadingStyle,
  ChartPalette,
  ChartSurface,
} from '@lilt-ui/charts';
import type { CardDocContent } from './content';
import {
  cardComponents,
  cardModule,
  exampleSource,
  isBookSource,
  isExampleRow,
  isRangeSource,
  type CardExample,
  type DocExample,
} from './examples';
import { rangesOf, withPeriodSelect } from './periods';

export interface ChartDocSettings {
  palette?: ChartPalette;
  surface?: ChartSurface;
  background?: ChartBackground;
  axis?: ChartAxisStyle;
  hover?: ChartHoverReadout;
  legend?: CardLegend;
  numberStyle?: AnimatedNumberVariant;
  loadingStyle?: ChartLoadingStyle;
  empty?: ChartEmptyLook;
  /** Undefined follows the selected look; false explicitly asks for flat marks. */
  depth?: boolean;
}

/** Depth reaches bars through their style, so a look that sets either one owns both. */
const DEPTH_PROPS = ['depth', 'barStyle'];

function settingProps(
  example: CardExample,
  settings: ChartDocSettings,
  supportedProps: readonly string[],
  keep: readonly string[],
): Record<string, unknown> {
  const kept = new Set(
    keep.some((key) => DEPTH_PROPS.includes(key)) ? [...keep, ...DEPTH_PROPS] : keep,
  );
  const props = Object.fromEntries(
    Object.entries(settings).filter(
      ([key, value]) => value !== undefined && supportedProps.includes(key) && !kept.has(key),
    ),
  );
  // An explicit bar appearance takes precedence over the package's depth shorthand.
  if (
    ['bar', 'combo', 'ranking', 'stat'].includes(example.kind) &&
    props.depth !== undefined &&
    example.props.barStyle !== undefined
  ) {
    if (props.depth) props.barStyle = 'isometric';
    else if (example.props.barStyle === 'isometric')
      props.barStyle = example.kind === 'ranking' ? 'inline' : 'solid';
  }
  return props;
}

/**
 * Site settings work like a theme: they restyle every example, but never the props in `keep`,
 * which make a look or variant what it is. A 3D look stays 3D under a flat site setting, and still
 * takes the site's palette. The current preview state (tune, loading) sits on top of both.
 */
export function resolveCardExample(
  example: CardExample,
  settings: ChartDocSettings,
  supportedProps: readonly string[],
  previewProps: Readonly<Record<string, unknown>> = {},
  keep: readonly string[] = [],
): CardExample {
  return {
    ...example,
    props: {
      ...example.props,
      ...settingProps(example, settings, supportedProps, keep),
      ...previewProps,
    },
  };
}

export function resolveDocExample(
  example: DocExample,
  settings: ChartDocSettings,
  supportedProps: readonly string[],
): DocExample {
  return isExampleRow(example)
    ? {
        ...example,
        row: example.row.map((card) => resolveCardExample(card, settings, supportedProps)),
      }
    : resolveCardExample(example, settings, supportedProps);
}

export function examplePrompt(example: CardExample, name: string): string {
  return `Use ${cardComponents[example.kind]} from '${cardModule(example.kind)}' for ${String(example.props.title)}, with the ${example.title} look. Preserve the props and data field names in this React/TypeScript example. Replace the sample rows with application data and import the stylesheet once.\n\n\`\`\`tsx\n${exampleSource(example, name)}\n\`\`\``;
}

/** One card on the stage, and the appearance props it sets for itself. */
export interface StageSubject {
  example: CardExample;
  change: readonly string[];
}

/** Preview, complete source, and AI prompt describe this one resolved example. */
export function resolveSubject(
  look: StageSubject,
  name: string,
  settings: ChartDocSettings,
  supportedProps: readonly string[],
  previewProps: Readonly<Record<string, unknown>> = {},
) {
  const example = resolveCardExample(
    look.example,
    settings,
    supportedProps,
    previewProps,
    look.change,
  );
  return {
    example,
    code: exampleSource(example, name),
    prompt: examplePrompt(example, name),
  };
}

/** Subject and data props do not describe a variant's appearance. */
const SUBJECT_PROPS = new Set([
  'title',
  'valueFormat',
  'xFormat',
  'x',
  'y',
  'series',
  'category',
  'value',
  'samples',
  'from',
  'to',
  'label',
  'xLabel',
  'yLabel',
  'fromLabel',
  'toLabel',
  'caption',
  'unit',
  'name',
  'delta',
  'range',
  'ranges',
  'height',
]);

/** The appearance props a variant changes, which site settings leave as the variant sets them. */
export function variantChange(example: DocExample, hero: DocExample): readonly string[] {
  if (isExampleRow(example) || isExampleRow(hero)) return [];
  return Object.keys(example.props).filter(
    (key) =>
      !SUBJECT_PROPS.has(key) &&
      JSON.stringify(example.props[key]) !== JSON.stringify(hero.props[key]),
  );
}

/**
 * A page's stage, in order: the default card, then each variant with the appearance props it
 * sets for itself, so site settings style everything else.
 */
export function stageExamples(doc: CardDocContent) {
  return [
    { example: doc.hero, change: [] as readonly string[] },
    // Each variant carries the default card's period select, so its data change plays too.
    ...doc.examples.map((example) => ({
      example: withPeriodSelect(example, doc.hero),
      change: variantChange(example, doc.hero),
    })),
  ];
}

/** The stage's selected variant, with settings applied to every card in a row. */
export function resolveStage(
  example: DocExample,
  change: readonly string[],
  name: string,
  settings: ChartDocSettings,
  supportedProps: readonly string[],
  previewProps: Readonly<Record<string, unknown>> = {},
) {
  if (!isExampleRow(example))
    return resolveSubject({ example, change }, name, settings, supportedProps, previewProps);
  const resolved = {
    ...example,
    row: example.row.map((card) =>
      resolveCardExample(card, settings, supportedProps, previewProps),
    ),
  };
  return {
    example: resolved,
    code: exampleSource(resolved, name),
    prompt: examplePrompt(resolved.row[0]!, name),
  };
}

/**
 * The same example with nothing to draw, as the stage's Empty toggle shows it and its code prints
 * it: no rows (or an empty book), and the period label kept where ranges named it.
 */
export function withoutData(example: DocExample): DocExample {
  if (isExampleRow(example))
    return { ...example, row: example.row.map((card) => withoutData(card) as CardExample) };
  const { source, ...rest } = example;
  const { title, ...props } = example.props as Record<string, unknown>;
  delete props.ranges;
  delete props.defaultRange;
  const nothing = isBookSource(source)
    ? { bids: [], asks: [] }
    : example.kind === 'progress'
      ? { value: null }
      : { data: [] };
  const range = isRangeSource(source) ? { range: rangesOf(source)[0]?.label } : {};
  return {
    ...rest,
    props: { ...(title === undefined ? {} : { title }), ...nothing, ...range, ...props },
  };
}
