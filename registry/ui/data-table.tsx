'use client';

import { AnimatePresence, motion, useReducedMotion, type Transition } from 'motion/react';
import {
  Fragment,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from 'react';

export interface DataTableColumn<Row> {
  /** Names the column. Without `value`, it also reads `row[key]`. */
  key: string;
  /** The label in the header band. */
  header: string;
  /** The value behind the cell: what it sorts by and, without `cell`, what it shows. */
  value?: (row: Row) => string | number | null | undefined;
  /** What the cell shows. Default its value as text. */
  cell?: (row: Row) => ReactNode;
  /** The first column only: something before its text, such as an avatar. */
  lead?: (row: Row) => ReactNode;
  /** How the column reads in the line under the first column once it folds. Default its cell. */
  folded?: (row: Row) => ReactNode;
  /** A narrower form, such as a status icon on its own, that the column takes before it folds. */
  compact?: (row: Row) => ReactNode;
  /** 'end' lines numbers up on the right. Default 'start'. */
  align?: 'start' | 'end';
  /** Its width in pixels, gutter included. The first column takes what is left. Default 120. */
  width?: number;
  /** The narrowest a reader can drag it. Default 56. */
  minWidth?: number;
  /** Which columns stay as the table narrows: lower numbers stay longer. Default its place. */
  priority?: number;
  /** false leaves it out of sorting. */
  sortable?: boolean;
}

export interface DataTableSort {
  key: string;
  direction: 'asc' | 'desc';
}

export interface DataTableProps<Row> {
  rows: readonly Row[];
  /** The first column is the row's name: it never folds and takes whatever room is left. */
  columns: readonly DataTableColumn<Row>[];
  /** A stable key for each row, so a row glides to its new place rather than redrawing. */
  rowKey: (row: Row) => string;
  /** Names the table for screen readers. */
  label: string;
  /** The column and direction to start sorted by. */
  defaultSort?: DataTableSort | null;
  /** Called when a reader sorts. */
  onSortChange?: (sort: DataTableSort) => void;
  /** Lets readers drag column edges, and fit a column with a double click. Default true. */
  resizable?: boolean;
  /** How narrow the first column gets before another column folds into it. Default 180. */
  minPrimaryWidth?: number;
  /** Shown when there are no rows. */
  empty?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

// Lilt's blur fade: in on the site's ease-out, out faster on an ease-in.
const EASE = [0.22, 1, 0.36, 1] as const;
const EASE_IN = [0.4, 0, 1, 1] as const;
/** Cells glide to a new layout on a spring that settles without wobbling. */
const GLIDE: Transition = { type: 'spring', duration: 0.5, bounce: 0.1 };
const PAD = 16; // the header band's and each row's inline padding
const GUTTER = 20; // the space before every column but the first
const COMPACT = 44; // a column in its compact form: the gutter and an icon
const DEFAULT_WIDTH = 120;
const DEFAULT_MIN = 56;
const SLACK = 24; // spare room a column waits for before it unfolds, so a scrollbar cannot flicker it
const SNAP = 8; // a dragged edge sticks to the column's fitted width within this distance

type Value = string | number | null;

interface Plan {
  folded: ReadonlySet<string>;
  compact: ReadonlySet<string>;
}

interface Step {
  key: string;
  /** false takes the column's compact form; true folds it into the first column. */
  fold: boolean;
}

const NONE: Plan = { folded: new Set(), compact: new Set() };

function valueOf<Row>(column: DataTableColumn<Row>, row: Row): Value {
  const value = column.value ? column.value(row) : (row as Record<string, unknown>)[column.key];
  if (value === null || value === undefined) return null;
  return typeof value === 'number' || typeof value === 'string' ? value : String(value);
}

function cellOf<Row>(column: DataTableColumn<Row>, row: Row): ReactNode {
  return column.cell ? column.cell(row) : (valueOf(column, row) ?? '');
}

/** Empty values sort last either way; numbers by size, text the way people read it. */
function compare(a: Value, b: Value, sign: number) {
  const blankA = a === null || a === '';
  const blankB = b === null || b === '';
  if (blankA || blankB) return blankA === blankB ? 0 : blankA ? 1 : -1;
  if (typeof a === 'number' && typeof b === 'number') return sign * (a - b);
  return sign * String(a).localeCompare(String(b), undefined, { numeric: true });
}

const widthFor = <Row,>(column: DataTableColumn<Row>, widths: Record<string, number>) =>
  widths[column.key] ?? column.width ?? DEFAULT_WIDTH;

/** What a column takes from the row under a plan. */
function footprint<Row>(column: DataTableColumn<Row>, widths: Record<string, number>, plan: Plan) {
  if (plan.folded.has(column.key)) return 0;
  return plan.compact.has(column.key) ? COMPACT : widthFor(column, widths);
}

function spentOn<Row>(
  columns: readonly DataTableColumn<Row>[],
  widths: Record<string, number>,
  plan: Plan,
) {
  return columns.slice(1).reduce((sum, column) => sum + footprint(column, widths, plan), 0);
}

/**
 * The order a table gives up room in: the least important column first, ties to the later one,
 * each taking its compact form, if it has one, before it folds.
 */
function stepsOf<Row>(columns: readonly DataTableColumn<Row>[], free: (key: string) => boolean) {
  return columns
    .slice(1)
    .map((column, index) => ({ column, rank: column.priority ?? index + 1, index }))
    .filter(({ column }) => free(column.key))
    .sort((a, b) => b.rank - a.rank || b.index - a.index)
    .flatMap(({ column }): Step[] =>
      column.compact
        ? [
            { key: column.key, fold: false },
            { key: column.key, fold: true },
          ]
        : [{ key: column.key, fold: true }],
    );
}

function take(base: Plan, steps: readonly Step[], count: number): Plan {
  const folded = new Set(base.folded);
  const compact = new Set(base.compact);
  for (const step of steps.slice(0, count)) {
    if (step.fold) {
      compact.delete(step.key);
      folded.add(step.key);
    } else compact.add(step.key);
  }
  return { folded, compact };
}

/** How few steps leave the first column at least `floor` wide in this much room. */
function needed<Row>(
  columns: readonly DataTableColumn<Row>[],
  widths: Record<string, number>,
  base: Plan,
  steps: readonly Step[],
  room: number,
  floor: number,
) {
  for (let count = 0; count < steps.length; count++) {
    if (room - spentOn(columns, widths, take(base, steps, count)) >= floor) return count;
  }
  return steps.length;
}

/** How much a plan has given up: a fold counts its compact form too. */
const weightOf = <Row,>(columns: readonly DataTableColumn<Row>[], plan: Plan) =>
  columns.reduce(
    (sum, column) =>
      sum +
      (plan.folded.has(column.key)
        ? column.compact
          ? 2
          : 1
        : plan.compact.has(column.key)
          ? 1
          : 0),
    0,
  );

const samePlan = (a: Plan, b: Plan) =>
  a.folded.size === b.folded.size &&
  a.compact.size === b.compact.size &&
  [...a.folded].every((key) => b.folded.has(key)) &&
  [...a.compact].every((key) => b.compact.has(key));

/**
 * The plan for this much room. A column folds the moment the first column runs short, but only
 * comes back once there is room to spare, so a scrollbar coming and going cannot make it flicker.
 */
function settle<Row>(
  columns: readonly DataTableColumn<Row>[],
  widths: Record<string, number>,
  current: Plan,
  base: Plan,
  steps: readonly Step[],
  room: number,
  floor: number,
): Plan {
  if (room - spentOn(columns, widths, current) < floor) {
    return take(base, steps, needed(columns, widths, base, steps, room, floor));
  }
  const roomier = take(base, steps, needed(columns, widths, base, steps, room - SLACK, floor));
  return weightOf(columns, roomier) < weightOf(columns, current) ? roomier : current;
}

function templateOf<Row>(
  columns: readonly DataTableColumn<Row>[],
  widths: Record<string, number>,
  plan: Plan,
) {
  return columns
    .flatMap((column, index) => {
      if (index === 0) return ['minmax(0, 1fr)'];
      return plan.folded.has(column.key) ? [] : [`${footprint(column, widths, plan)}px`];
    })
    .join(' ');
}

const escapeKey = (key: string) =>
  typeof CSS !== 'undefined' && typeof CSS.escape === 'function' ? CSS.escape(key) : key;

/**
 * A data table that sits on the page: one warm band for the header and rows split by hairlines.
 * It never squashes. As it narrows it snaps to the layout that fits, folding its least important
 * columns into a line under the first, and every cell glides to its new place. Headers sort, and
 * dragging a header's edge resizes the column after it.
 */
export function DataTable<Row>({
  rows,
  columns,
  rowKey,
  label,
  defaultSort = null,
  onSortChange,
  resizable = true,
  minPrimaryWidth = 180,
  empty = 'Nothing here yet.',
  className,
  style,
}: DataTableProps<Row>) {
  const reduced = Boolean(useReducedMotion());
  const root = useRef<HTMLDivElement>(null);
  const guide = useRef<HTMLDivElement>(null);
  const readout = useRef<HTMLSpanElement>(null);

  // Widths a reader has dragged; every other column keeps its own.
  const [widths, setWidths] = useState<Record<string, number>>({});
  const [plan, setPlan] = useState<Plan>(NONE);
  const [sort, setSort] = useState<DataTableSort | null>(defaultSort);
  const [resizing, setResizing] = useState<string | null>(null);
  const [measured, setMeasured] = useState(false);
  const [ready, setReady] = useState(false);

  // What the handlers read. While an edge is dragged the widths run ahead of state, written
  // straight to the grid, and the table only re-renders when a column folds or comes back.
  const live = useRef(widths);
  const current = useRef(plan);
  const room = useRef<number | null>(null);
  const drag = useRef<{ key: string; base: Plan; steps: Step[] } | null>(null);

  useLayoutEffect(() => {
    if (!drag.current) live.current = widths;
  }, [widths]);

  const adopt = useCallback((next: Plan) => {
    if (samePlan(next, current.current)) return false;
    current.current = next;
    setPlan(next);
    return true;
  }, []);

  useLayoutEffect(() => {
    const node = root.current;
    if (!node) return;
    const measure = () => {
      room.current = node.clientWidth - PAD * 2;
      if (drag.current) return;
      const all = stepsOf(columns, () => true);
      adopt(
        settle(columns, live.current, current.current, NONE, all, room.current, minPrimaryWidth),
      );
      setMeasured(true);
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [adopt, columns, minPrimaryWidth]);

  // The first plan lands before the first paint, without motion; every change after it glides.
  useEffect(() => {
    if (measured) setReady(true);
  }, [measured]);

  const sorted = useMemo(() => {
    const column = sort ? columns.find((candidate) => candidate.key === sort.key) : undefined;
    if (!sort || !column) return rows;
    const sign = sort.direction === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => compare(valueOf(column, a), valueOf(column, b), sign));
  }, [rows, columns, sort]);

  const toggleSort = (column: DataTableColumn<Row>) => {
    const sample = rows
      .map((row) => valueOf(column, row))
      .find((value) => value !== null && value !== '');
    const next: DataTableSort =
      sort?.key === column.key
        ? { key: column.key, direction: sort.direction === 'asc' ? 'desc' : 'asc' }
        : { key: column.key, direction: typeof sample === 'number' ? 'desc' : 'asc' };
    setSort(next);
    onSortChange?.(next);
  };

  const indexOf = (key: string) => columns.findIndex((column) => column.key === key);
  const rankOf = (key: string) => columns[indexOf(key)]?.priority ?? indexOf(key);
  const lessImportant = (key: string, than: string) =>
    rankOf(key) > rankOf(than) || (rankOf(key) === rankOf(than) && indexOf(key) > indexOf(than));

  /** Columns are packed against the right, so a column's left edge is the sum of those after it. */
  const placeGuide = (key: string) => {
    const node = root.current;
    const line = guide.current;
    if (!node || !line) return;
    let x = node.clientWidth - PAD;
    for (let index = columns.length - 1; index > 0; index--) {
      const column = columns[index]!;
      x -= footprint(column, live.current, current.current);
      if (column.key === key) break;
    }
    line.style.transform = `translateX(${x}px)`;
  };

  /** The width that fits a column's longest value and its header. */
  const fitOf = (key: string) => {
    const node = root.current;
    if (!node) return null;
    let widest = 0;
    node
      .querySelectorAll<HTMLElement>(`[data-col="${escapeKey(key)}"] [data-measure]`)
      .forEach((part) => {
        widest = Math.max(widest, part.scrollWidth);
      });
    return widest > 0 ? Math.ceil(widest) + GUTTER : null;
  };

  const begin = (key: string) => {
    const start = current.current;
    // Only columns less important than this one may fold to make it room.
    const free = (candidate: string) => candidate !== key && lessImportant(candidate, key);
    drag.current = {
      key,
      base: {
        folded: new Set([...start.folded].filter((candidate) => !free(candidate))),
        compact: new Set([...start.compact].filter((candidate) => !free(candidate))),
      },
      steps: stepsOf(columns, free),
    };
    setResizing(key);
    placeGuide(key);
  };

  /**
   * Sets the column's width. Following the pointer writes straight to the grid; a fold, or a
   * step from the keyboard, goes through state so the cells glide.
   */
  const resize = (key: string, width: number, follow: boolean) => {
    const active = drag.current;
    const space = room.current;
    const column = columns[indexOf(key)];
    if (!active || space === null || !column) return;
    const floor = column.minWidth ?? DEFAULT_MIN;
    const leanest = take(active.base, active.steps, active.steps.length);
    const others = spentOn(columns, { ...live.current, [key]: 0 }, leanest);
    const ceiling = Math.max(floor, space - minPrimaryWidth - others);
    const next = Math.round(Math.min(ceiling, Math.max(floor, width)));
    live.current = { ...live.current, [key]: next };
    const planned = settle(
      columns,
      live.current,
      current.current,
      active.base,
      active.steps,
      space,
      minPrimaryWidth,
    );
    if (adopt(planned) || !follow) setWidths(live.current);
    else root.current?.style.setProperty('--dt-cols', templateOf(columns, live.current, planned));
    if (readout.current) readout.current.textContent = String(next);
    placeGuide(key);
  };

  const end = () => {
    if (!drag.current) return;
    drag.current = null;
    setResizing(null);
    setWidths(live.current);
    if (room.current === null) return;
    const all = stepsOf(columns, () => true);
    adopt(settle(columns, live.current, current.current, NONE, all, room.current, minPrimaryWidth));
  };

  const once = (key: string, width: number | null) => {
    if (width === null) return;
    begin(key);
    resize(key, width, false);
    end();
  };

  const onGripDown = (event: PointerEvent<HTMLDivElement>, key: string) => {
    if (event.button !== 0) return;
    event.preventDefault();
    const grip = event.currentTarget;
    grip.setPointerCapture(event.pointerId);
    const startX = event.clientX;
    const startWidth = live.current[key] ?? columns[indexOf(key)]?.width ?? DEFAULT_WIDTH;
    const fit = fitOf(key);
    begin(key);
    const move = (moved: globalThis.PointerEvent) => {
      // Dragging an edge left widens the column after it, since the columns are packed right.
      let width = startWidth - (moved.clientX - startX);
      if (fit !== null && Math.abs(width - fit) <= SNAP) width = fit;
      resize(key, width, true);
    };
    const up = () => {
      grip.removeEventListener('pointermove', move);
      grip.removeEventListener('pointerup', up);
      grip.removeEventListener('pointercancel', up);
      end();
    };
    grip.addEventListener('pointermove', move);
    grip.addEventListener('pointerup', up);
    grip.addEventListener('pointercancel', up);
  };

  const onGripKey = (event: KeyboardEvent<HTMLDivElement>, column: DataTableColumn<Row>) => {
    const now = live.current[column.key] ?? column.width ?? DEFAULT_WIDTH;
    const step = event.shiftKey ? 32 : 8;
    const width =
      event.key === 'ArrowLeft'
        ? now + step
        : event.key === 'ArrowRight'
          ? now - step
          : event.key === 'Enter' || event.key === 'Home'
            ? fitOf(column.key)
            : undefined;
    if (width === undefined) return;
    event.preventDefault();
    once(column.key, width);
  };

  const visible = columns.filter((column) => !plan.folded.has(column.key));
  const folded = columns.filter((column) => plan.folded.has(column.key));
  const template = templateOf(columns, widths, plan);
  // Cells only measure their layout when it can have changed for a reason worth gliding for.
  const layoutKey = [
    [...plan.folded].join(),
    [...plan.compact].join(),
    sort ? `${sort.key}:${sort.direction}` : '',
    template,
    sorted.map(rowKey).join(),
  ].join('|');
  const glide = ready && !reduced ? ('position' as const) : false;
  const cellMotion = {
    layout: glide,
    layoutDependency: layoutKey,
    initial: reduced ? { opacity: 0 } : { opacity: 0, filter: 'blur(6px)' },
    animate: reduced
      ? { opacity: 1 }
      : { opacity: 1, filter: 'blur(0px)', transitionEnd: { filter: 'none' } },
    exit: reduced
      ? { opacity: 0, transition: { duration: 0.1 } }
      : { opacity: 0, filter: 'blur(6px)', transition: { duration: 0.17, ease: EASE_IN } },
    transition: { duration: reduced ? 0.12 : 0.32, ease: EASE, layout: GLIDE },
  };

  return (
    <>
      <style href="lilt-ui-data-table" precedence="default">
        {css}
      </style>
      <div
        ref={root}
        role="table"
        aria-label={label}
        className={['lilt-dt', className].filter(Boolean).join(' ')}
        data-resizing={resizing ? '' : undefined}
        style={{ ...style, '--dt-cols': template } as CSSProperties}
      >
        <div role="rowgroup">
          <div role="row" className="lilt-dt-head">
            <Presence on={ready}>
              {visible.map((column, index) => {
                const first = index === 0;
                const compact = plan.compact.has(column.key);
                const direction = sort?.key === column.key ? sort.direction : null;
                const sortable = column.sortable !== false;
                return (
                  <motion.div
                    key={column.key}
                    role="columnheader"
                    aria-sort={
                      direction ? (direction === 'asc' ? 'ascending' : 'descending') : undefined
                    }
                    className="lilt-dt-th"
                    data-col={column.key}
                    data-primary={first || undefined}
                    data-align={column.align === 'end' ? 'end' : undefined}
                    {...cellMotion}
                  >
                    {!first && resizable && !compact ? (
                      <div
                        role="separator"
                        aria-orientation="vertical"
                        aria-label={`Resize ${column.header}`}
                        aria-valuenow={widthFor(column, widths)}
                        aria-valuemin={column.minWidth ?? DEFAULT_MIN}
                        tabIndex={0}
                        className="lilt-dt-grip"
                        data-active={resizing === column.key || undefined}
                        onPointerDown={(event) => onGripDown(event, column.key)}
                        onDoubleClick={() => once(column.key, fitOf(column.key))}
                        onKeyDown={(event) => onGripKey(event, column)}
                      />
                    ) : null}
                    {sortable ? (
                      <button
                        type="button"
                        className="lilt-dt-sort"
                        data-measure={compact ? undefined : ''}
                        aria-label={compact ? column.header : undefined}
                        onClick={() => toggleSort(column)}
                      >
                        {compact ? null : <span className="lilt-dt-label">{column.header}</span>}
                        <Arrow />
                      </button>
                    ) : compact ? (
                      <span className="lilt-dt-sr">{column.header}</span>
                    ) : (
                      <span className="lilt-dt-label" data-measure="">
                        {column.header}
                      </span>
                    )}
                    {resizing === column.key ? (
                      <span ref={readout} className="lilt-dt-readout" aria-hidden="true">
                        {widthFor(column, widths)}
                      </span>
                    ) : null}
                  </motion.div>
                );
              })}
            </Presence>
          </div>
        </div>

        <div role="rowgroup" className="lilt-dt-body">
          {sorted.length === 0 ? (
            <div role="row" className="lilt-dt-row lilt-dt-empty">
              <div role="cell" className="lilt-dt-cell">
                {empty}
              </div>
            </div>
          ) : (
            <Presence on={ready}>
              {sorted.map((row) => (
                <motion.div key={rowKey(row)} role="row" className="lilt-dt-row" {...cellMotion}>
                  <Presence on={ready}>
                    {visible.map((column, index) =>
                      index === 0 ? (
                        <motion.div
                          key={column.key}
                          role="rowheader"
                          className="lilt-dt-cell"
                          data-col={column.key}
                          data-primary=""
                          {...cellMotion}
                        >
                          {column.lead ? (
                            <span className="lilt-dt-lead">{column.lead(row)}</span>
                          ) : null}
                          <span className="lilt-dt-stack">
                            <span className="lilt-dt-main" data-measure="">
                              {cellOf(column, row)}
                            </span>
                            <Folded
                              id={folded.map((part) => part.key).join()}
                              enter={ready}
                              reduced={reduced}
                            >
                              {folded.length
                                ? folded.map((part, at) => (
                                    <Fragment key={part.key}>
                                      {at > 0 ? ' · ' : null}
                                      {part.folded ? part.folded(row) : cellOf(part, row)}
                                    </Fragment>
                                  ))
                                : null}
                            </Folded>
                          </span>
                        </motion.div>
                      ) : (
                        <motion.div
                          key={column.key}
                          role="cell"
                          className="lilt-dt-cell"
                          data-col={column.key}
                          data-align={column.align === 'end' ? 'end' : undefined}
                          {...cellMotion}
                        >
                          {column.compact ? (
                            <Swap
                              id={plan.compact.has(column.key) ? 'compact' : 'full'}
                              reduced={reduced}
                            >
                              {plan.compact.has(column.key) ? (
                                column.compact(row)
                              ) : (
                                <span className="lilt-dt-value" data-measure="">
                                  {cellOf(column, row)}
                                </span>
                              )}
                            </Swap>
                          ) : (
                            <span className="lilt-dt-value" data-measure="">
                              {cellOf(column, row)}
                            </span>
                          )}
                        </motion.div>
                      ),
                    )}
                  </Presence>
                </motion.div>
              ))}
            </Presence>
          )}
        </div>

        <div
          ref={guide}
          className="lilt-dt-guide"
          data-on={resizing ? '' : undefined}
          aria-hidden="true"
        />
      </div>
    </>
  );
}

/** Animates cells in and out once the table is settled; until then they simply appear. */
function Presence({ on, children }: { on: boolean; children: ReactNode }) {
  return on ? (
    <AnimatePresence initial={false} mode="popLayout">
      {children}
    </AnimatePresence>
  ) : (
    <>{children}</>
  );
}

/** The line under the first column: it opens as columns fold into it, and rolls when they change. */
function Folded({
  id,
  enter,
  reduced,
  children,
}: {
  id: string;
  enter: boolean;
  reduced: boolean;
  children: ReactNode;
}) {
  return (
    <AnimatePresence initial={false}>
      {children ? (
        <motion.span
          key="folded"
          className="lilt-dt-folded"
          initial={enter ? { height: 0, opacity: 0 } : false}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: reduced ? 0 : 0.32, ease: EASE }}
        >
          <span className="lilt-dt-roll">
            <AnimatePresence initial={false}>
              <motion.span
                key={id}
                className="lilt-dt-roll-line"
                initial={reduced ? { opacity: 0 } : { opacity: 0, y: 6, filter: 'blur(4px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={reduced ? { opacity: 0 } : { opacity: 0, y: -6, filter: 'blur(4px)' }}
                transition={{ duration: reduced ? 0.1 : 0.26, ease: EASE }}
              >
                {children}
              </motion.span>
            </AnimatePresence>
          </span>
        </motion.span>
      ) : null}
    </AnimatePresence>
  );
}

/** A cell that trades its full form for its compact one through a blur. */
function Swap({ id, reduced, children }: { id: string; reduced: boolean; children: ReactNode }) {
  return (
    <span className="lilt-dt-swap">
      <AnimatePresence initial={false}>
        <motion.span
          key={id}
          className="lilt-dt-swap-part"
          initial={reduced ? { opacity: 0 } : { opacity: 0, filter: 'blur(4px)' }}
          animate={{ opacity: 1, filter: 'blur(0px)' }}
          exit={reduced ? { opacity: 0 } : { opacity: 0, filter: 'blur(4px)' }}
          transition={{ duration: reduced ? 0.1 : 0.22, ease: EASE }}
        >
          {children}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

function Arrow() {
  return (
    <svg
      aria-hidden="true"
      className="lilt-dt-arrow"
      width={12}
      height={12}
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 2.5v7M3 6.6 6 9.5l3-2.9" />
    </svg>
  );
}

const css = /* css */ `
.lilt-dt {
  --dt-ink: #1a1a18;
  --dt-muted: #6b6b66;
  --dt-faint: #8c8c87;
  --dt-band: rgb(26 26 24 / 0.048);
  --dt-line: rgb(26 26 24 / 0.08);
  --dt-hover: rgb(26 26 24 / 0.035);
  --dt-handle: rgb(26 26 24 / 0.3);
  --dt-guide: rgb(26 26 24 / 0.22);
  --dt-accent: #7c5cff;
  --dt-ease: cubic-bezier(0.22, 1, 0.36, 1);
  position: relative;
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  color: var(--dt-ink);
  font-size: 14px;
  line-height: 20px;
  -webkit-font-smoothing: antialiased;
}
:where(.dark, [data-theme="dark"]) .lilt-dt {
  --dt-ink: #f4f4f2;
  --dt-muted: #a3a39d;
  --dt-faint: #73736e;
  --dt-band: rgb(244 244 242 / 0.07);
  --dt-line: rgb(244 244 242 / 0.08);
  --dt-hover: rgb(244 244 242 / 0.04);
  --dt-handle: rgb(244 244 242 / 0.3);
  --dt-guide: rgb(244 244 242 / 0.24);
  --dt-accent: #9a82ff;
}
[data-theme="light"] .lilt-dt {
  --dt-ink: #1a1a18;
  --dt-muted: #6b6b66;
  --dt-faint: #8c8c87;
  --dt-band: rgb(26 26 24 / 0.048);
  --dt-line: rgb(26 26 24 / 0.08);
  --dt-hover: rgb(26 26 24 / 0.035);
  --dt-handle: rgb(26 26 24 / 0.3);
  --dt-guide: rgb(26 26 24 / 0.22);
  --dt-accent: #7c5cff;
}
.lilt-dt *, .lilt-dt *::before, .lilt-dt *::after { box-sizing: border-box; }
.lilt-dt[data-resizing] { cursor: col-resize; user-select: none; }

.lilt-dt-head,
.lilt-dt-row {
  position: relative;
  display: grid;
  grid-template-columns: var(--dt-cols);
  align-items: center;
  padding-inline: ${PAD}px;
}
/* The header is one warm band; the rows sit on the page with a hairline between them. */
.lilt-dt-head {
  min-height: 36px;
  border-radius: 10px;
  background: var(--dt-band);
  color: var(--dt-muted);
  font-size: 13px;
  line-height: 16px;
}
.lilt-dt-row { min-height: 52px; padding-block: 11px; }
.lilt-dt-row::before {
  content: "";
  position: absolute;
  inset: 3px 0;
  border-radius: 10px;
  background: var(--dt-hover);
  opacity: 0;
  pointer-events: none;
  transition: opacity 160ms;
}
.lilt-dt-row:hover::before { opacity: 1; }
.lilt-dt-row::after {
  content: "";
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  height: 1px;
  background: var(--dt-line);
  pointer-events: none;
}
.lilt-dt-body > .lilt-dt-row:last-child::after { display: none; }
.lilt-dt-empty { color: var(--dt-muted); }
.lilt-dt-empty > .lilt-dt-cell { grid-column: 1 / -1; justify-content: center; padding: 0; }

.lilt-dt-th,
.lilt-dt-cell {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  padding-left: ${GUTTER}px;
}
.lilt-dt-th { align-self: stretch; }
.lilt-dt-th[data-primary],
.lilt-dt-cell[data-primary] { padding-left: 0; }
.lilt-dt-cell[data-primary] { gap: 12px; }
.lilt-dt-th[data-align="end"],
.lilt-dt-cell[data-align="end"] {
  justify-content: flex-end;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.lilt-dt-lead { display: flex; flex: none; }
.lilt-dt-stack { display: flex; flex-direction: column; min-width: 0; }
.lilt-dt-main,
.lilt-dt-value,
.lilt-dt-label {
  display: block;
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.lilt-dt-main { font-weight: 500; letter-spacing: -0.005em; }
.lilt-dt-folded {
  display: block;
  overflow: hidden;
  color: var(--dt-faint);
  font-size: 12.5px;
  line-height: 16px;
}
.lilt-dt-roll { display: grid; padding-top: 2px; }
.lilt-dt-roll-line {
  grid-area: 1 / 1;
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.lilt-dt-swap { display: grid; min-width: 0; }
.lilt-dt-cell[data-align="end"] .lilt-dt-swap { justify-items: end; }
.lilt-dt-swap-part { grid-area: 1 / 1; display: flex; align-items: center; min-width: 0; }

.lilt-dt-sort {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
  max-width: 100%;
  margin: 0;
  padding: 4px 0;
  border: 0;
  border-radius: 6px;
  background: none;
  color: inherit;
  font: inherit;
  cursor: pointer;
}
.lilt-dt-th[data-align="end"] .lilt-dt-sort { flex-direction: row-reverse; }
.lilt-dt-sort:hover,
.lilt-dt-th[aria-sort] .lilt-dt-sort { color: var(--dt-ink); }
.lilt-dt-th[aria-sort] .lilt-dt-label { font-weight: 500; }
.lilt-dt-sort:focus-visible { outline: 2px solid var(--dt-accent); outline-offset: 2px; }
.lilt-dt-arrow {
  flex: none;
  opacity: 0;
  transition: opacity 160ms, transform 260ms var(--dt-ease);
}
.lilt-dt-sort:hover .lilt-dt-arrow { opacity: 0.45; }
.lilt-dt-th[aria-sort] .lilt-dt-arrow { opacity: 1; }
.lilt-dt-th[aria-sort="ascending"] .lilt-dt-arrow { transform: rotate(180deg); }
.lilt-dt-readout {
  flex: none;
  color: var(--dt-muted);
  font-size: 11px;
  font-weight: 450;
  font-variant-numeric: tabular-nums;
}
.lilt-dt-th[data-align="end"] .lilt-dt-readout { order: -1; }

/* A column's left edge: faint while the header is hovered, ink while held, violet on focus. */
.lilt-dt-grip {
  position: absolute;
  top: 0;
  bottom: 0;
  left: -6px;
  z-index: 1;
  display: grid;
  place-items: center;
  width: 12px;
  cursor: col-resize;
  touch-action: none;
  outline: none;
}
.lilt-dt-grip::before {
  content: "";
  width: 2px;
  height: 16px;
  border-radius: 2px;
  background: var(--dt-handle);
  opacity: 0;
  transition: opacity 160ms, height 200ms var(--dt-ease), background-color 160ms;
}
.lilt-dt-head:hover .lilt-dt-grip::before { opacity: 0.6; }
.lilt-dt-grip:hover::before,
.lilt-dt-grip[data-active]::before { opacity: 1; height: 20px; background: var(--dt-ink); }
.lilt-dt-grip:focus-visible::before { opacity: 1; height: 20px; background: var(--dt-accent); }
.lilt-dt-guide {
  position: absolute;
  top: 36px;
  bottom: 0;
  left: 0;
  width: 1px;
  margin-left: -0.5px;
  background: var(--dt-guide);
  opacity: 0;
  pointer-events: none;
  transition: opacity 160ms;
}
.lilt-dt-guide[data-on] { opacity: 1; }

.lilt-dt-sr {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

@media (prefers-reduced-motion: reduce) {
  .lilt-dt-row::before, .lilt-dt-arrow, .lilt-dt-grip::before, .lilt-dt-guide { transition: none; }
}
`;
