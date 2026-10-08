import type { CardRange } from '@lilt-ui/charts';
import { datasets, rangeSets, type DataName, type RangeName } from './data';
import type { CardExample, CardKind, DocExample } from './examples';

/**
 * Every variant on a chart page shows the same period select as its default card, so paging the
 * stage keeps the control in place and switching it plays the card's data change. A variant's
 * own rows are the current period; the previous one is the same rows a period earlier, with
 * dates moved back and values eased, derived here so the preview and its printed code agree.
 */

/** Cards that read `ranges`; the rest show one period. */
const PERIOD_KINDS: ReadonlySet<CardKind> = new Set<CardKind>([
  'area',
  'line',
  'bar',
  'combo',
  'ranking',
  'radial',
  'activity',
  'funnel',
  'heatmap',
  'scatter',
  'sankey',
  'radar',
  'slope',
  'treemap',
  'calendar',
  'timeline',
  'strip',
  'candlestick',
  'indicator',
  'price',
  'portfolio',
]);

/** Charts over time, whose previous period varies row by row like real history. */
const TIME_KINDS: ReadonlySet<CardKind> = new Set<CardKind>([
  'area',
  'line',
  'bar',
  'combo',
  'candlestick',
  'indicator',
  'price',
  'portfolio',
]);

type Shift = { years?: number; months?: number; days?: number } | 'span';

/** A current period's label, and its previous period's with how far dates move back. */
const previous: Readonly<Record<string, { label: string; shift: Shift }>> = {
  'This year': { label: 'Last year', shift: { years: 1 } },
  'This quarter': { label: 'Last quarter', shift: { months: 3 } },
  'This month': { label: 'Last month', shift: { months: 1 } },
  'This week': { label: 'Last week', shift: { days: 7 } },
  Today: { label: 'Yesterday', shift: { days: 1 } },
  'Last 7 days': { label: 'Previous 7 days', shift: { days: 7 } },
  'Last 30 days': { label: 'Previous 30 days', shift: { days: 30 } },
  'Sep 1–21': { label: 'Aug 11–31', shift: { days: 21 } },
  'Sep 2026': { label: 'Aug 2026', shift: { months: 1 } },
  Q3: { label: 'Q2', shift: { months: 3 } },
  'This period': { label: 'Last period', shift: 'span' },
};

const PREFIX = 'periods';
const cache = new Map<string, readonly CardRange<Record<string, unknown>>[]>();

const moveBack = (date: Date, shift: Shift, span: number) => {
  const next = new Date(date);
  if (shift === 'span') next.setTime(next.getTime() - span);
  else {
    if (shift.years) next.setFullYear(next.getFullYear() - shift.years);
    if (shift.months) next.setMonth(next.getMonth() - shift.months);
    if (shift.days) next.setDate(next.getDate() - shift.days);
  }
  return next;
};

/**
 * A steady, repeatable nudge. Every field in a row moves by the same factor, so a band's lower
 * and upper, or a candle's high and low, keep their order; without `row`, every row moves
 * together, so stages, flows and shares keep their relations too.
 */
const ease = (value: number, row: number | null) => {
  const next = value * (row === null ? 0.86 : 0.84 + 0.09 * Math.sin(row * 1.3));
  const places = Math.min(2, (String(value).split('.')[1] ?? '').length);
  return Number(next.toFixed(places));
};

function derive(name: string): readonly CardRange<Record<string, unknown>>[] {
  const [, data, x, current, delta, vary] = name.split('|');
  const rows = datasets[data as DataName] as unknown as readonly Record<string, unknown>[];
  const step = previous[current!]!;
  const dates = rows.flatMap((row) => (x && row[x] instanceof Date ? [row[x].getTime()] : []));
  const span =
    dates.length > 1
      ? Math.max(...dates) - Math.min(...dates) + (dates[1]! - dates[0]!)
      : 864e5 * 7;
  const before = rows.map((row, index) =>
    Object.fromEntries(
      Object.entries(row).map(([key, value]) => [
        key,
        value instanceof Date
          ? moveBack(value, step.shift, span)
          : typeof value === 'number' && key !== x
            ? ease(value, vary ? index : null)
            : value,
      ]),
    ),
  );
  const change = delta ? Number(delta) : undefined;
  return [
    {
      id: 'current',
      label: current!,
      data: rows,
      ...(change === undefined ? {} : { delta: change }),
    },
    {
      id: 'previous',
      label: step.label,
      data: before,
      ...(change === undefined ? {} : { delta: Number((change * 0.45).toFixed(3)) }),
    },
  ];
}

export const isPeriodSource = (source: string | undefined): boolean =>
  source !== undefined && source.startsWith(`${PREFIX}|`);

/** The periods a range source holds, whether declared in the data or derived for a variant. */
export function rangesOf(source: string): readonly CardRange<Record<string, unknown>>[] {
  if (!isPeriodSource(source))
    return (rangeSets[source as RangeName] ?? []) as unknown as readonly CardRange<
      Record<string, unknown>
    >[];
  let ranges = cache.get(source);
  if (!ranges) {
    ranges = derive(source);
    cache.set(source, ranges);
  }
  return ranges;
}

/**
 * A variant with the default card's period select. Its own period label leads where it names
 * one; otherwise the default card's, when that has a previous period to compare with.
 */
export function withPeriodSelect(example: DocExample, hero: DocExample): DocExample {
  if ('row' in example || 'row' in hero) return example;
  const source = example.source as string | undefined;
  if (
    !PERIOD_KINDS.has(example.kind) ||
    source === undefined ||
    !(source in datasets) ||
    'ranges' in example.props
  )
    return example;
  const { range, delta, ...props } = example.props as Record<string, unknown>;
  const heroLabel = hero.source ? rangesOf(hero.source)[0]?.label : undefined;
  const label =
    typeof range === 'string' && range in previous
      ? range
      : !range && example.kind === hero.kind && heroLabel && heroLabel in previous
        ? heroLabel
        : 'This period';
  const x = typeof props.x === 'string' ? props.x : '';
  const vary = TIME_KINDS.has(example.kind) ? 'vary' : '';
  const name = [PREFIX, source, x, label, typeof delta === 'number' ? delta : '', vary].join('|');
  return { ...example, source: name as CardExample['source'], props } as CardExample;
}
