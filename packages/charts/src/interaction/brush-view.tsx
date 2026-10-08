import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type ReactElement,
} from 'react';
import { AnimatePresence, m } from 'motion/react';
import type { ChartSnapshot } from '../chart-context';
import type { ChartRange } from '../types';
import { createBrushGesture, type BrushDrag } from './brush-gesture';

interface BrushViewProps<T> {
  snapshot: ChartSnapshot<T>;
  range: ChartRange | null;
  seriesId: string;
  reducedMotion: boolean;
  onFocus: (range: ChartRange | null) => void;
}

type Handle = 'start' | 'end';
const HANDLE_INSET = 14;
const MINI_WIDTH = 1000;
const MINI_HEIGHT = 56;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function BrushView<T>({
  snapshot,
  range,
  seriesId,
  reducedMotion,
  onFocus,
}: BrushViewProps<T>): ReactElement {
  const rows = snapshot.data.rows;
  const last = rows.length - 1;
  const firstX = rows[0].x;
  const lastX = rows[last].x;
  const track = useRef<HTMLDivElement>(null);
  const gesture = useRef(createBrushGesture());
  const [draft, setDraft] = useState<readonly [number, number] | null>(null);
  const [hoveredHandle, setHoveredHandle] = useState<Handle | null>(null);
  const [focusedHandle, setFocusedHandle] = useState<Handle | null>(null);
  const id = useId().replace(/:/g, '');
  const clipId = `lilt-brush-clip-${id}`;
  const fillId = `lilt-brush-fill-${id}`;
  const hintId = `lilt-brush-hint-${id}`;

  const indexForX = (x: number): number => {
    let low = 0;
    let high = last;
    while (low < high) {
      const middle = Math.floor((low + high) / 2);
      if (rows[middle].x < x) low = middle + 1;
      else high = middle;
    }
    const before = Math.max(0, low - 1);
    return Math.abs(rows[before].x - x) <= Math.abs(rows[low].x - x) ? before : low;
  };
  const focusedStart = range ? indexForX(Math.min(range.startX, range.endX)) : 0;
  const focusedEnd = range ? indexForX(Math.max(range.startX, range.endX)) : last;
  const [start, end] = draft ?? [focusedStart, focusedEnd];

  const xToIndex = (clientX: number): number => {
    const bounds = track.current?.getBoundingClientRect();
    if (!bounds || bounds.width <= HANDLE_INSET * 2) return 0;
    const fraction = clamp(
      (clientX - bounds.left - HANDLE_INSET) / (bounds.width - HANDLE_INSET * 2),
      0,
      1,
    );
    return indexForX(firstX + fraction * (lastX - firstX));
  };
  const commit = (nextStart: number, nextEnd: number): void => {
    if (nextStart >= nextEnd || (nextStart === focusedStart && nextEnd === focusedEnd)) return;
    onFocus(
      nextStart === 0 && nextEnd === last
        ? null
        : { startX: rows[nextStart].x, endX: rows[nextEnd].x },
    );
  };
  const onPointerDown = (event: PointerEvent<HTMLDivElement>): void => {
    if (event.button !== 0) return;
    const target = event.target as HTMLElement;
    const handle = target.closest<HTMLElement>('[data-brush-handle]');
    const kind = handle?.dataset.brushHandle as Handle | undefined;
    const insideSelection = Boolean(target.closest('.lilt-chart__brush-selection'));
    const drag: BrushDrag = {
      kind: kind ?? (range && insideSelection ? 'move' : 'create'),
      anchor: xToIndex(event.clientX),
      start,
      end,
      pointerId: event.pointerId,
    };
    gesture.current.start(drag);
    setDraft([start, end]);
    if (!handle) setFocusedHandle(null);
    handle?.focus();
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>): void => {
    const preview = gesture.current.move(xToIndex(event.clientX), last);
    if (preview) setDraft(preview);
  };
  const onPointerUp = (event: PointerEvent<HTMLDivElement>): void => {
    const committed = gesture.current.finish(xToIndex(event.clientX), last);
    setDraft(null);
    if (committed) commit(...committed);
  };
  const onPointerCancel = (): void => {
    gesture.current.cancel();
    setDraft(null);
  };
  useEffect(() => {
    const cancelOnEscape = (event: globalThis.KeyboardEvent) => {
      const drag = gesture.current.active;
      if (event.key !== 'Escape' || !drag) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      gesture.current.cancel();
      setDraft(null);
      if (track.current?.hasPointerCapture(drag.pointerId))
        track.current.releasePointerCapture(drag.pointerId);
    };
    document.addEventListener('keydown', cancelOnEscape, true);
    return () => document.removeEventListener('keydown', cancelOnEscape, true);
  }, []);
  const onHandleKeyDown = (event: KeyboardEvent<HTMLDivElement>, handle: Handle): void => {
    const current = handle === 'start' ? start : end;
    const min = handle === 'start' ? 0 : start + 1;
    const max = handle === 'start' ? end - 1 : last;
    let next: number;
    switch (event.key) {
      case 'ArrowLeft':
      case 'ArrowDown':
        next = current - 1;
        break;
      case 'ArrowRight':
      case 'ArrowUp':
        next = current + 1;
        break;
      case 'PageDown':
        next = current - 5;
        break;
      case 'PageUp':
        next = current + 5;
        break;
      case 'Home':
        next = min;
        break;
      case 'End':
        next = max;
        break;
      default:
        return;
    }
    event.preventDefault();
    event.stopPropagation();
    const value = clamp(next, min, max);
    if (handle === 'start') commit(value, end);
    else commit(start, value);
  };

  const position = (index: number): number =>
    ((rows[index].x - firstX) / Math.max(1e-9, lastX - firstX)) * 100;
  const left = position(start);
  const right = position(end);
  const geometry = (snapshot.drawGeometry ?? snapshot.geometry)?.series[seriesId];
  const bars = snapshot.geometry?.bars[seriesId] ?? [];
  const miniX = (x: number): number =>
    ((x - snapshot.plot.left) / Math.max(1, snapshot.plot.width)) * MINI_WIDTH;
  const miniY = (y: number): number =>
    5 + ((y - snapshot.plot.top) / Math.max(1, snapshot.plot.height)) * (MINI_HEIGHT - 10);
  const segments = geometry?.segments.map((segment) => {
    const first = segment.points[0];
    const lastPoint = segment.points[segment.points.length - 1];
    const path = [
      `M${miniX(first.x)},${miniY(first.y)}`,
      ...segment.pieces.map((piece) =>
        piece.kind === 'line'
          ? `L${miniX(piece.to.x)},${miniY(piece.to.y)}`
          : `C${miniX(piece.control1.x)},${miniY(piece.control1.y)} ${miniX(piece.control2.x)},${miniY(piece.control2.y)} ${miniX(piece.to.x)},${miniY(piece.to.y)}`,
      ),
    ].join(' ');
    const area = `${path} L${miniX(lastPoint.x)},${MINI_HEIGHT} L${miniX(first.x)},${MINI_HEIGHT} Z`;
    return { path, area };
  });
  const isFullRange = start === 0 && end === last;
  const rangeLabel = draft
    ? `${snapshot.formatX(rows[start].x)}–${snapshot.formatX(rows[end].x)} · ${end - start + 1} observations`
    : isFullRange
      ? 'Full range'
      : `${end - start + 1} observations`;
  const positionTransition =
    reducedMotion || draft
      ? ({ duration: 0 } as const)
      : ({ type: 'spring', stiffness: 320, damping: 38, mass: 0.85 } as const);
  const barMarks = bars.map((bar) => (
    <rect
      height={Math.max(1, (bar.height / Math.max(1, snapshot.plot.height)) * (MINI_HEIGHT - 10))}
      key={bar.valueX}
      width={Math.max(1, (bar.width / Math.max(1, snapshot.plot.width)) * MINI_WIDTH)}
      x={miniX(bar.x)}
      y={miniY(bar.y)}
    />
  ));
  const lineMarks = (
    <>
      {segments?.map(({ path }, index) => (
        <path d={path} key={index} />
      ))}
      {geometry?.isolated.map((point, index) => (
        <circle cx={miniX(point.x)} cy={miniY(point.y)} key={`point-${index}`} r="3" />
      ))}
    </>
  );
  const areaMarks = segments?.map(({ area }, index) => <path d={area} key={index} />);

  return (
    <div aria-label="Focus range" className="lilt-chart__brush" role="group">
      <div className="lilt-chart__brush-header">
        <span className="lilt-chart__brush-title">Focus range</span>
        <div className="lilt-chart__brush-meta">
          <span className="lilt-chart__brush-summary">{rangeLabel}</span>
          {range ? (
            <button className="lilt-chart__brush-reset" onClick={() => onFocus(null)} type="button">
              Show all
            </button>
          ) : null}
        </div>
      </div>
      <span className="lilt-chart__sr-only" id={hintId}>
        Drag a handle to adjust the range, drag between the handles to move it, or drag across the
        track to choose a new interval. Arrow keys move one observation; Home and End reach the
        limits.
      </span>
      <div
        className="lilt-chart__brush-track"
        data-dragging={draft ? 'true' : undefined}
        onLostPointerCapture={onPointerCancel}
        onPointerCancel={onPointerCancel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        ref={track}
      >
        <div className="lilt-chart__brush-rail">
          <m.span
            aria-hidden="true"
            className="lilt-chart__brush-selection"
            initial={false}
            animate={{
              left: `${left}%`,
              width: `${right - left}%`,
              opacity: isFullRange ? 0.35 : 1,
              filter: isFullRange ? 'blur(10px)' : 'blur(6px)',
            }}
            transition={positionTransition}
          />
          <svg
            aria-hidden="true"
            preserveAspectRatio="none"
            viewBox={`0 0 ${MINI_WIDTH} ${MINI_HEIGHT}`}
          >
            <defs>
              <clipPath id={clipId}>
                <m.rect
                  animate={{ x: left * 10, width: (right - left) * 10 }}
                  height={MINI_HEIGHT}
                  initial={false}
                  transition={positionTransition}
                  y="0"
                />
              </clipPath>
              <linearGradient id={fillId} x1="0" x2="0" y1="0" y2="1">
                <stop
                  offset="0%"
                  stopColor="var(--lilt-series-1)"
                  stopOpacity="0.24"
                  style={{ stopColor: 'var(--lilt-series-1)' }}
                />
                <stop
                  offset="100%"
                  stopColor="var(--lilt-series-1)"
                  stopOpacity="0.02"
                  style={{ stopColor: 'var(--lilt-series-1)' }}
                />
              </linearGradient>
            </defs>
            {bars.length ? (
              <>
                <g className="lilt-chart__brush-bars">{barMarks}</g>
                <g
                  className="lilt-chart__brush-bars lilt-chart__brush-bars--active"
                  clipPath={`url(#${clipId})`}
                >
                  {barMarks}
                </g>
              </>
            ) : (
              <>
                <g className="lilt-chart__brush-area">{areaMarks}</g>
                <g
                  className="lilt-chart__brush-area lilt-chart__brush-area--active"
                  clipPath={`url(#${clipId})`}
                  style={{ fill: `url(#${fillId})` }}
                >
                  {areaMarks}
                </g>
                <g className="lilt-chart__brush-line">{lineMarks}</g>
                <g
                  className="lilt-chart__brush-line lilt-chart__brush-line--active"
                  clipPath={`url(#${clipId})`}
                >
                  {lineMarks}
                </g>
              </>
            )}
          </svg>
          <m.span
            aria-hidden="true"
            className="lilt-chart__brush-range-track"
            initial={false}
            animate={{ left: `${left}%`, width: `${right - left}%` }}
            transition={positionTransition}
          />
          {(['start', 'end'] as const).map((handle) => {
            const index = handle === 'start' ? start : end;
            const percent = position(index);
            const showTooltip = hoveredHandle === handle || focusedHandle === handle;
            return (
              <m.div
                aria-describedby={hintId}
                aria-label={`Range ${handle}`}
                aria-orientation="horizontal"
                aria-valuemax={handle === 'start' ? end - 1 : last}
                aria-valuemin={handle === 'start' ? 0 : start + 1}
                aria-valuenow={index}
                aria-valuetext={snapshot.formatX(rows[index].x)}
                className="lilt-chart__brush-handle"
                data-brush-handle={handle}
                data-edge={percent < 8 ? 'start' : percent > 92 ? 'end' : undefined}
                key={handle}
                animate={{ left: `${percent}%` }}
                initial={false}
                transition={positionTransition}
                onBlur={() => setFocusedHandle(null)}
                onFocus={() => setFocusedHandle(handle)}
                onKeyDown={(event) => onHandleKeyDown(event, handle)}
                onPointerEnter={() => setHoveredHandle(handle)}
                onPointerLeave={() => setHoveredHandle(null)}
                role="slider"
                tabIndex={0}
              >
                <span aria-hidden="true" className="lilt-chart__brush-tooltip-anchor">
                  <AnimatePresence>
                    {showTooltip ? (
                      <m.span
                        className="lilt-chart__brush-tooltip"
                        initial={reducedMotion ? false : { opacity: 0, y: 5, filter: 'blur(4px)' }}
                        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                        exit={
                          reducedMotion ? { opacity: 0 } : { opacity: 0, y: 3, filter: 'blur(3px)' }
                        }
                        transition={{
                          duration: reducedMotion ? 0 : 0.16,
                          ease: [0.22, 1, 0.36, 1],
                        }}
                      >
                        {snapshot.formatX(rows[index].x)}
                      </m.span>
                    ) : null}
                  </AnimatePresence>
                </span>
              </m.div>
            );
          })}
        </div>
      </div>
      <div aria-hidden="true" className="lilt-chart__brush-endpoints">
        <span>{snapshot.formatX(firstX)}</span>
        <span>{snapshot.formatX(lastX)}</span>
      </div>
    </div>
  );
}
