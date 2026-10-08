import { useState, type ReactElement } from 'react';
import { m } from 'motion/react';
import { useChartContext } from '../chart-context';
import type { AnnotationsProps, ReferenceBandProps } from '../types';

function numeric(value: number | Date): number {
  return value instanceof Date ? value.getTime() : value;
}

export function Annotations({
  items,
  onSelectionChange,
  className,
}: AnnotationsProps): ReactElement {
  const { snapshot, reducedMotion } = useChartContext<unknown>();
  const [active, setActive] = useState<string | null>(null);
  const [pinned, setPinned] = useState<string | null>(null);
  return (
    <g className={['lilt-chart__annotations', className].filter(Boolean).join(' ')}>
      {items.map((item, index) => {
        const value = numeric(item.x);
        if (value < snapshot.xDomain[0] || value > snapshot.xDomain[1]) return null;
        const x = snapshot.xToPixel(value);
        const open = active === item.id || pinned === item.id;
        return (
          <g
            className="lilt-chart__annotation"
            key={item.id}
            onPointerEnter={() => setActive(item.id)}
            onPointerLeave={() => setActive(null)}
          >
            <m.line
              animate={{ opacity: open ? 0.7 : 0.34, y2: snapshot.plot.bottom }}
              initial={false}
              stroke={item.color ?? 'var(--lilt-annotation)'}
              style={{ stroke: item.color ?? 'var(--lilt-annotation)' }}
              strokeDasharray="2 4"
              transition={{ duration: reducedMotion ? 0 : 0.16 }}
              x1={x}
              x2={x}
              y1={snapshot.plot.top + 14}
              y2={open ? snapshot.plot.top + 28 : snapshot.plot.bottom}
            />
            <circle
              cx={x}
              cy={snapshot.plot.top + 10}
              fill={item.color ?? 'var(--lilt-annotation)'}
              style={{ fill: item.color ?? 'var(--lilt-annotation)' }}
              r={3}
            />
            <foreignObject height={20} width={20} x={x - 10} y={snapshot.plot.top}>
              <button
                aria-label={`${item.label}${item.description ? `: ${item.description}` : ''}`}
                className="lilt-chart__annotation-trigger"
                onBlur={() => setActive(null)}
                onClick={(event) => {
                  event.stopPropagation();
                  const next = pinned === item.id ? null : item.id;
                  setPinned(next);
                  onSelectionChange?.(next ? item : null);
                }}
                onFocus={() => setActive(item.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Escape' && pinned === item.id) {
                    event.stopPropagation();
                    setPinned(null);
                    setActive(null);
                    onSelectionChange?.(null);
                  }
                }}
                type="button"
              />
            </foreignObject>
            <m.g
              animate={{ opacity: open ? 1 : 0, y: open ? 0 : -4 }}
              initial={false}
              transition={{ duration: reducedMotion ? 0 : 0.18 }}
            >
              <rect
                className="lilt-chart__annotation-label-bg"
                height={item.description ? 38 : 24}
                rx={6}
                width={Math.min(190, Math.max(74, item.label.length * 7 + 18))}
                x={Math.min(x + 7, snapshot.plot.right - 194)}
                y={snapshot.plot.top + 25 + index * 2}
              />
              <text
                className="lilt-chart__annotation-label"
                x={Math.min(x + 16, snapshot.plot.right - 185)}
                y={snapshot.plot.top + 41 + index * 2}
              >
                {item.label}
              </text>
              {item.description ? (
                <text
                  className="lilt-chart__annotation-description"
                  x={Math.min(x + 16, snapshot.plot.right - 185)}
                  y={snapshot.plot.top + 56 + index * 2}
                >
                  {item.description}
                </text>
              ) : null}
            </m.g>
          </g>
        );
      })}
    </g>
  );
}

export function ReferenceBand({
  from,
  to,
  label,
  color = 'var(--lilt-series-1)',
  axis = 'x',
  className,
}: ReferenceBandProps): ReactElement {
  const { snapshot } = useChartContext<unknown>();
  if (axis === 'y') {
    const domain = snapshot.yDomain;
    const low = Math.max(domain?.[0] ?? 0, Math.min(numeric(from), numeric(to)));
    const high = Math.min(domain?.[1] ?? 0, Math.max(numeric(from), numeric(to)));
    if (!domain || low > high) return <g />;
    const top = snapshot.yToPixel(high);
    const bottom = snapshot.yToPixel(low);
    return (
      <g
        className={['lilt-chart__reference-band', className].filter(Boolean).join(' ')}
        data-axis="y"
      >
        <rect
          fill={color}
          style={{ fill: color }}
          fillOpacity={0.07}
          height={Math.max(1, bottom - top)}
          width={snapshot.plot.width}
          x={snapshot.plot.left}
          y={top}
        />
        {label ? (
          <text
            className="lilt-chart__reference-band-label"
            x={snapshot.plot.left + 7}
            y={Math.min(bottom - 6, top + 14)}
          >
            {label}
          </text>
        ) : null}
      </g>
    );
  }
  const low = Math.min(numeric(from), numeric(to));
  const high = Math.max(numeric(from), numeric(to));
  const start = Math.max(snapshot.xDomain[0], low);
  const end = Math.min(snapshot.xDomain[1], high);
  if (start > end) return <g />;
  // An open end runs to the plot's edge, past the last point into bar slots and edge runoff.
  const left = low === Number.NEGATIVE_INFINITY ? snapshot.plot.left : snapshot.xToPixel(start);
  const right = high === Number.POSITIVE_INFINITY ? snapshot.plot.right : snapshot.xToPixel(end);
  return (
    <g className={['lilt-chart__reference-band', className].filter(Boolean).join(' ')}>
      <rect
        fill={color}
        style={{ fill: color }}
        fillOpacity={0.07}
        height={snapshot.plot.height}
        width={Math.max(1, right - left)}
        x={left}
        y={snapshot.plot.top}
      />
      {label ? (
        <text className="lilt-chart__reference-band-label" x={left + 7} y={snapshot.plot.top + 16}>
          {label}
        </text>
      ) : null}
    </g>
  );
}
