import type { ObservationMark, ObservationScene } from './observations-card';

/** One grid cell for a prism layout: everything but its geometry. */
export interface PrismCell<Row>
  extends Omit<ObservationMark<Row>, 'x' | 'y' | 'width' | 'height' | 'shape' | 'prism'> {
  column: number;
  row: number;
  /** Position of the value in the domain, 0 to 1; ignored for missing and future cells. */
  share: number;
}

export interface PrismGridOptions {
  /** The tallest cell rises this many cell lengths above the floor. Default 5. */
  rise?: number;
  /** Space between neighbouring prisms as a share of a cell, 0 to 0.6. Default 0.2. */
  gap?: number;
}

/**
 * Columns recede shallowly to the right and rows more steeply toward the viewer, so a long grid
 * reads as a low street rather than a steep isometric strip.
 */
export const COLUMN_AXIS = [
  Math.cos((20 * Math.PI) / 180),
  Math.sin((20 * Math.PI) / 180),
] as const;
export const ROW_AXIS = [Math.cos((40 * Math.PI) / 180), Math.sin((40 * Math.PI) / 180)] as const;

/** Screen offset of a floor point `x` along the columns and `y` along the rows, `z` up. */
export const project = (x: number, y: number, z = 0) =>
  [x * COLUMN_AXIS[0] - y * ROW_AXIS[0], x * COLUMN_AXIS[1] + y * ROW_AXIS[1] - z] as const;

/**
 * Stands a grid of cells up as square prisms seen from above and in front. Height and color both
 * carry the value; missing cells keep a low slab on the floor and future cells lie flat as
 * outlines. Column labels run along the front edge, row labels along the right end.
 */
export function prismGridLayout<Row>(
  cells: readonly PrismCell<Row>[],
  columns: number,
  rows: number,
  width: number,
  height: number,
  {
    rise = 5,
    gap = 0.2,
    columnLabels = [],
    rowLabels = [],
    note,
  }: PrismGridOptions & {
    columnLabels?: readonly { column: number; text: string }[];
    rowLabels?: readonly { row: number; text: string }[];
    note?: string;
  },
): ObservationScene<Row> {
  const tallest = Math.max(0.5, Math.min(12, rise));
  const footprint = 1 - Math.max(0, Math.min(0.6, gap));
  // Room for column labels below the floor, row labels to the right, and air above.
  const below = columnLabels.length ? 22 : 6;
  const right = rowLabels.length ? 64 : 0;
  const headroom = 2;
  const across = columns * COLUMN_AXIS[0] + rows * ROW_AXIS[0];
  const down = columns * COLUMN_AXIS[1] + rows * ROW_AXIS[1] + tallest;
  // Fit the whole floor and the tallest cell into the card; very long grids scroll.
  const cell = Math.max(4, Math.min((width - right) / across, (height - below - headroom) / down));
  const [ux, uy] = [COLUMN_AXIS[0] * cell, COLUMN_AXIS[1] * cell];
  const [vx, vy] = [ROW_AXIS[0] * cell, ROW_AXIS[1] * cell];
  const top = tallest * cell;
  const slab = Math.max(1.5, cell * 0.2);
  const sceneWidth = Math.max(width, across * cell + right);
  const originX = (sceneWidth - right - across * cell) / 2 + rows * vx;
  const originY = top + headroom;
  const inset = (1 - footprint) / 2;
  const axes = { ux: ux * footprint, uy: uy * footprint, vx: vx * footprint, vy: vy * footprint };
  const labels: NonNullable<ObservationScene<Row>['labels']> = [];
  let lastLabel = -Infinity;
  for (const label of columnLabels) {
    const x = originX + (label.column + 0.5) * ux - rows * vx;
    if (x - lastLabel < 34) continue;
    labels.push({
      x,
      y: originY + (label.column + 0.5) * uy + rows * vy + 16,
      text: label.text,
      anchor: 'middle',
    });
    lastLabel = x;
  }
  for (const label of rowLabels)
    labels.push({
      x: originX + columns * ux - (label.row + 0.5) * vx + 8,
      y: originY + columns * uy + (label.row + 0.5) * vy + 4,
      text: label.text,
    });
  const marks = cells.map((item): ObservationMark<Row> => {
    const { column, row, share, ...mark } = item;
    const lift = mark.future
      ? 0
      : mark.value === null
        ? slab
        : slab + Math.max(0, Math.min(1, share)) * (top - slab);
    // The footprint's back corner, inset within its cell.
    const backX = originX + column * ux - row * vx + inset * (ux - vx);
    const backY = originY + column * uy + row * vy + inset * (uy + vy);
    return {
      ...mark,
      x: backX - axes.vx,
      y: backY - lift,
      width: axes.ux + axes.vx,
      height: axes.uy + axes.vy + lift,
      shape: 'prism',
      wave: (column + row) / (columns + rows),
      prism: {
        // The top face's back, right, front and left corners in the mark's box.
        top: [
          [axes.vx, 0],
          [axes.vx + axes.ux, axes.uy],
          [axes.ux, axes.uy + axes.vy],
          [0, axes.vy],
        ],
        lift,
        depth: column + row,
        wave: (column + row) / (columns + rows),
      },
    };
  });
  return {
    marks,
    labels,
    width: sceneWidth,
    height: originY + columns * uy + rows * vy + below,
    note,
  };
}

/** A prism described on the floor: its footprint in floor units, where it starts and how tall. */
export interface FloorPrism<Row>
  extends Omit<ObservationMark<Row>, 'x' | 'y' | 'width' | 'height' | 'shape' | 'prism'> {
  footprint: readonly (readonly [number, number])[];
  /** Height of its floor and of the prism itself, in floor units. */
  base: number;
  rise: number;
  depth: number;
  wave: number;
}

/** Scales a set of floor prisms to fill the card, centred, and turns each into a prism mark. */
export function fitFloorPrisms<Row>(
  items: readonly FloorPrism<Row>[],
  width: number,
  height: number,
  { headroom = 4, below = 6 }: { headroom?: number; below?: number } = {},
) {
  const corners = items.flatMap((item) =>
    item.footprint.flatMap(([x, y]) => [
      project(x, y, item.base),
      project(x, y, item.base + item.rise),
    ]),
  );
  const left = Math.min(...corners.map(([x]) => x));
  const right = Math.max(...corners.map(([x]) => x));
  const top = Math.min(...corners.map(([, y]) => y));
  const bottom = Math.max(...corners.map(([, y]) => y));
  const scale = Math.max(
    1,
    Math.min(
      width / Math.max(1e-6, right - left),
      (height - headroom - below) / Math.max(1e-6, bottom - top),
    ),
  );
  const sceneWidth = Math.max(width, (right - left) * scale);
  const offsetX = (sceneWidth - (right - left) * scale) / 2 - left * scale;
  const offsetY = headroom - top * scale;
  const marks = items.map((item): ObservationMark<Row> => {
    const { footprint, base, rise, depth, wave, ...mark } = item;
    const lift = rise * scale;
    const roof = footprint.map(([x, y]) => {
      const [px, py] = project(x, y, base + rise);
      return [px * scale + offsetX, py * scale + offsetY] as const;
    });
    const minX = Math.min(...roof.map(([x]) => x));
    const minY = Math.min(...roof.map(([, y]) => y));
    const maxX = Math.max(...roof.map(([x]) => x));
    const maxY = Math.max(...roof.map(([, y]) => y));
    return {
      ...mark,
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY + lift,
      shape: 'prism',
      wave,
      prism: { top: roof.map(([x, y]) => [x - minX, y - minY] as const), lift, depth, wave },
    };
  });
  return {
    marks,
    scale,
    width: sceneWidth,
    height: (bottom - top) * scale + headroom + below,
    toScreen: (x: number, y: number, z = 0) => {
      const [px, py] = project(x, y, z);
      return [px * scale + offsetX, py * scale + offsetY] as const;
    },
  };
}
