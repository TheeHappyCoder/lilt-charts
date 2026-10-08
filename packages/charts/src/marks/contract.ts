import { Children, Fragment, isValidElement, type ReactElement, type ReactNode } from 'react';
import type { ChartSnapshot } from '../chart-context';
import type { NormalizedRow } from '../engine/normalize';
import type { ChartSeries } from '../types';
import type { RangeScales } from '../engine/ranges';

/** A neutral column uses the mark's own geometry, never an accepted observation. */
export interface LoadingMark {
  kind: string;
  depth?: boolean;
  render: (input: {
    cx: number;
    low: number;
    high: number;
    scales: RangeScales;
    mask: boolean;
  }) => ReactNode;
}

/**
 * The private contract every range mark is built on. A mark is an ordinary primitive that
 * draws from the chart context; its spec tells the plot how to lay it out and inspect it.
 * The contract is internal until it has proved itself across several marks.
 */
export interface MarkSpec<P> {
  /**
   * `column` marks give each observation a bar-like slot, so the plot insets its edges, and
   * replace the line point with their own highlight on inspection. `overlay` marks, such as a
   * band behind a line, leave layout and inspection to the line.
   */
  layout: 'column' | 'overlay';
  series: (props: P) => string;
  /** Field IDs the mark reads from its series. */
  fields: (props: P) => readonly string[];
  loading?: (props: P) => LoadingMark;
  /** Draws one observation emphasized, over the dimmed marks, while it is inspected. */
  highlight?: (props: P, input: MarkHighlightInput) => ReactNode;
  /**
   * The color one observation is drawn in, when the mark decides it (rising and falling
   * candles). Otherwise the series' `colorAt`, then its color.
   */
  color?: (props: P, input: Omit<MarkHighlightInput, 'color'>) => string | undefined;
}

export interface MarkHighlightInput {
  row: NormalizedRow<unknown>;
  snapshot: ChartSnapshot<unknown>;
  descriptor: ChartSeries<unknown>;
  color: string;
}

/** A mark found among a plot's children, with its props bound. */
export interface PlotMark {
  series: string;
  layout: MarkSpec<unknown>['layout'];
  fields: readonly string[];
  loading?: LoadingMark;
  highlight?: (input: MarkHighlightInput) => ReactNode;
  color?: (input: Omit<MarkHighlightInput, 'color'>) => string | undefined;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- keyed by component identity
const specs = new WeakMap<(props: any) => ReactNode, MarkSpec<any>>();

export function defineMark<P>(
  component: (props: P) => ReactElement,
  spec: MarkSpec<P>,
): (props: P) => ReactElement {
  specs.set(component, spec);
  return component;
}

/** Marks placed directly in a plot, or inside fragments there, in document order. */
export function collectMarks(children: ReactNode): PlotMark[] {
  const marks: PlotMark[] = [];
  const visit = (node: ReactNode) => {
    Children.forEach(node, (child) => {
      if (!isValidElement(child)) return;
      const props = child.props as { children?: ReactNode };
      if (child.type === Fragment) {
        visit(props.children);
        return;
      }
      const spec = typeof child.type === 'function' ? specs.get(child.type as never) : undefined;
      if (!spec) return;
      marks.push({
        series: spec.series(props),
        layout: spec.layout,
        fields: spec.fields(props),
        loading: spec.loading?.(props),
        highlight: spec.highlight
          ? (input: MarkHighlightInput) => spec.highlight!(props, input)
          : undefined,
        color: spec.color
          ? (input: Omit<MarkHighlightInput, 'color'>) => spec.color!(props, input)
          : undefined,
      });
    });
  };
  visit(children);
  return marks;
}

/** The descriptor a mark draws, after checking it carries every field the mark reads. */
export function markSeries<T>(
  mark: string,
  descriptors: readonly ChartSeries<T>[],
  series: string,
  fields: readonly string[],
): { descriptor: ChartSeries<T>; index: number } {
  const index = descriptors.findIndex((item) => item.id === series);
  const descriptor = descriptors[index];
  if (!descriptor) throw new Error(`Lilt ${mark} references unknown series "${series}".`);
  const missing = fields.filter((id) => !descriptor.fields?.[id]);
  if (missing.length)
    throw new Error(
      `Lilt ${mark} reads field${missing.length > 1 ? 's' : ''} ${missing
        .map((id) => `"${id}"`)
        .join(', ')}, which series "${series}" does not define in \`fields\`.`,
    );
  return { descriptor, index };
}

/** Field values of one row, or null when any of them is missing. */
export function rowFields(
  row: NormalizedRow<unknown>,
  series: string,
  fields: readonly string[],
): number[] | null {
  const values = row.fields[series];
  const result: number[] = [];
  for (const id of fields) {
    const value = values?.[id];
    if (value === null || value === undefined) return null;
    result.push(value);
  }
  return result;
}

/** An observation's own color, falling back to the series color. */
export function observationColor<T>(
  descriptor: ChartSeries<T>,
  row: NormalizedRow<T>,
  fallback: string,
): string {
  return descriptor.colorAt?.(row.datum) ?? fallback;
}
