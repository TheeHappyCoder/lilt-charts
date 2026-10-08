import { createContext, useContext, type ReactElement, type ReactNode } from 'react';
import type { ChartEmptyLook, ChartEmptyState } from '../types';

/** The outline a chart family lays behind its empty message with the `shape` look. */
export type ChartEmptyShape =
  | 'wave'
  | 'bars'
  | 'rows'
  | 'ring'
  | 'points'
  | 'tiles'
  | 'web'
  | 'flow';

const DEFAULT_MESSAGE = 'No data for this period';

interface EmptyContextValue {
  shape: ChartEmptyShape;
  message: string;
}

/** Set by a card around its chart, so the chart's empty slot draws the family's own outline. */
export const EmptyShapeContext = createContext<ChartEmptyShape>('wave');

/** Set by the chart around its empty slot, so `ChartEmpty` knows the family and its words. */
const EmptyContext = createContext<EmptyContextValue | null>(null);

export interface ChartEmptyProps {
  /** `dots` (default) or the chart's own `shape`. */
  look?: ChartEmptyLook;
  /** The message. Defaults to the chart's own, e.g. "No data for this period". */
  children?: ReactNode;
}

const BARS = [46, 62, 54, 74, 68, 86, 80, 96];
const ROWS = [96, 78, 64, 50, 38];
const TILES = Array.from({ length: 28 }, (_, index) => 0.35 + ((index * 37) % 11) / 16);
const POINTS = [
  [34, 88],
  [62, 70],
  [88, 80],
  [112, 56],
  [140, 64],
  [166, 44],
  [190, 52],
  [214, 34],
  [240, 40],
  [266, 24],
  [76, 96],
  [154, 82],
  [228, 60],
] as const;

function Shape({ shape }: { shape: ChartEmptyShape }) {
  switch (shape) {
    case 'bars':
      return (
        <div className="lilt-chart-empty__shape" data-shape="bars">
          {BARS.map((height, index) => (
            <i key={index} style={{ height: `${height}%` }} />
          ))}
        </div>
      );
    case 'rows':
      return (
        <div className="lilt-chart-empty__shape" data-shape="rows">
          {ROWS.map((width, index) => (
            <i key={index} style={{ width: `${width}%` }} />
          ))}
        </div>
      );
    case 'tiles':
      return (
        <div className="lilt-chart-empty__shape" data-shape="tiles">
          {TILES.map((opacity, index) => (
            <i key={index} style={{ opacity }} />
          ))}
        </div>
      );
    case 'ring':
      return (
        <svg className="lilt-chart-empty__shape" data-shape="ring" viewBox="0 0 160 160">
          <circle cx="80" cy="80" r="62" />
        </svg>
      );
    case 'web':
      return (
        <svg className="lilt-chart-empty__shape" data-shape="web" viewBox="0 0 160 160">
          <polygon points="80,14 142,59 118,132 42,132 18,59" />
          <polygon points="80,47 111,70 99,106 61,106 49,70" />
        </svg>
      );
    case 'points':
      return (
        <svg
          className="lilt-chart-empty__shape"
          data-shape="points"
          viewBox="0 0 300 120"
          preserveAspectRatio="xMidYMid meet"
        >
          {POINTS.map(([cx, cy], index) => (
            <circle key={index} cx={cx} cy={cy} r="5" />
          ))}
        </svg>
      );
    case 'flow':
      return (
        <svg
          className="lilt-chart-empty__shape"
          data-shape="flow"
          viewBox="0 0 300 120"
          preserveAspectRatio="xMidYMid meet"
        >
          <path d="M20 10 H28 C150 10 150 30 272 30 H280 V62 H272 C150 62 150 52 28 52 H20 Z" />
          <path d="M20 60 H28 C150 60 150 72 272 72 H280 V110 H272 C150 110 150 100 28 100 H20 Z" />
        </svg>
      );
    default:
      return (
        <svg
          className="lilt-chart-empty__shape"
          data-shape="wave"
          viewBox="0 0 300 120"
          preserveAspectRatio="none"
        >
          <path d="M0 92 C40 84 60 70 100 74 S160 52 200 50 S260 30 300 26 V120 H0 Z" />
        </svg>
      );
  }
}

/**
 * Lilt's empty state: a still look and one quiet line. Pass it to a chart's `empty` prop with your
 * own words, e.g. `empty={<ChartEmpty>No visits yet</ChartEmpty>}`; inside a chart it takes the
 * chart's shape and message.
 */
export function ChartEmpty({ look = 'dots', children }: ChartEmptyProps): ReactElement {
  const context = useContext(EmptyContext);
  return (
    <div className="lilt-chart-empty" data-look={look}>
      {look === 'shape' ? (
        <Shape shape={context?.shape ?? 'wave'} />
      ) : (
        <div className="lilt-chart-empty__dots" />
      )}
      <p className="lilt-chart-empty__text">{children ?? context?.message ?? DEFAULT_MESSAGE}</p>
    </div>
  );
}

/**
 * Where a chart's empty state sits. Over a plot it fills the plot area; in place of a card's body
 * (`block`) it holds the body's height, so an empty card keeps its size. The outline defaults to
 * the one the card around it names.
 */
export function EmptySlot({
  state = 'dots',
  shape: ownShape,
  message = DEFAULT_MESSAGE,
  block = false,
}: {
  state?: ChartEmptyState;
  shape?: ChartEmptyShape;
  message?: string;
  block?: boolean;
}): ReactElement | null {
  const named = useContext(EmptyShapeContext);
  const shape = ownShape ?? named;
  if (state === null) return block ? <div className="lilt-chart__empty" data-block="" /> : null;
  return (
    <EmptyContext.Provider value={{ shape, message }}>
      <div className="lilt-chart__empty" data-block={block || undefined}>
        {typeof state === 'string' ? <ChartEmpty look={state} /> : state}
      </div>
    </EmptyContext.Provider>
  );
}
