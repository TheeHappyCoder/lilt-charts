export type BrushDrag = {
  kind: 'start' | 'end' | 'move' | 'create';
  anchor: number;
  start: number;
  end: number;
  pointerId: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function draggedRange(drag: BrushDrag, index: number, last: number): readonly [number, number] {
  if (drag.kind === 'start') return [clamp(index, 0, drag.end - 1), drag.end];
  if (drag.kind === 'end') return [drag.start, clamp(index, drag.start + 1, last)];
  if (drag.kind === 'move') {
    const width = drag.end - drag.start;
    const start = clamp(drag.start + index - drag.anchor, 0, last - width);
    return [start, start + width];
  }
  if (index !== drag.anchor) return [Math.min(drag.anchor, index), Math.max(drag.anchor, index)];
  return index - drag.start <= drag.end - index
    ? [clamp(index, 0, drag.end - 1), drag.end]
    : [drag.start, clamp(index, drag.start + 1, last)];
}

/** A cancelled drag cannot publish a range when pointer-up arrives later. */
export function createBrushGesture() {
  let active: BrushDrag | null = null;
  return {
    get active() {
      return active;
    },
    start(drag: BrushDrag) {
      active = drag;
    },
    move(index: number, last: number) {
      return active ? draggedRange(active, index, last) : null;
    },
    finish(index: number, last: number) {
      const drag = active;
      active = null;
      return drag ? draggedRange(drag, index, last) : null;
    },
    cancel() {
      active = null;
    },
  };
}
