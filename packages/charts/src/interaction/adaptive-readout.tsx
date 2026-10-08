import type { ReactElement, ReactNode } from 'react';
import type { ChartSnapshot } from '../chart-context';
import type { ChartSelection, ChartSeries, ChartTooltipContext } from '../types';
import { BoundedText } from '../motion/bounded-text';
import { tooltipContext } from './tooltip-context';

export interface AdaptiveReadoutProps<T> {
  snapshot: ChartSnapshot<T>;
  series: readonly ChartSeries<T>[];
  selection: ChartSelection<T> | null;
  sharedX?: number;
  peer: boolean;
  pinned: boolean;
  onRelease: () => void;
  onCompareFromHere?: () => void;
  renderContent?: (context: ChartTooltipContext) => ReactNode;
  reducedMotion: boolean;
}

export function AdaptiveReadout<T>({
  snapshot,
  series,
  selection,
  sharedX,
  peer,
  pinned,
  onRelease,
  onCompareFromHere,
  renderContent,
  reducedMotion,
}: AdaptiveReadoutProps<T>): ReactElement {
  const selected = selection ? snapshot.data.rows.find((row) => row.x === selection.x) : null;
  const latest = snapshot.data.rows.at(-1);
  const row = sharedX !== undefined ? selected : (selected ?? latest);
  const labelX = sharedX ?? row?.x;
  const title = labelX === undefined ? 'No observation' : snapshot.formatX(labelX);
  const actualDate = sharedX !== undefined && row && row.x !== sharedX;
  const stackIds = snapshot.stack?.series ?? [];
  const stacked = stackIds.length > 0;
  const values = series
    .filter((item) => stackIds.includes(item.id))
    .map((item) => row?.values[item.id] ?? null);
  const total =
    stacked && values.length > 0 && values.every((value) => value !== null)
      ? values.reduce<number>((sum, value) => sum + (value ?? 0), 0)
      : null;
  const duration = reducedMotion ? 0 : 150;

  return (
    <div className="lilt-chart__adaptive-readout" data-peer={peer || undefined}>
      <div className="lilt-chart__adaptive-heading">
        <span>
          <BoundedText duration={duration} offset={3} value={title} />
        </span>
        {pinned && !peer ? (
          <div className="lilt-chart__adaptive-actions">
            {onCompareFromHere ? (
              <button onClick={onCompareFromHere} type="button">
                Compare from here
              </button>
            ) : null}
            <button className="lilt-chart__adaptive-release" onClick={onRelease} type="button">
              Release pin
            </button>
          </div>
        ) : null}
      </div>
      {renderContent && selection && selected ? (
        <div className="lilt-chart__adaptive-custom" inert={!pinned}>
          {renderContent(tooltipContext(snapshot, selected, series, pinned))}
        </div>
      ) : !row && sharedX !== undefined ? (
        <span className="lilt-chart__adaptive-missing">No observation at this date</span>
      ) : !series.length ? (
        <span className="lilt-chart__adaptive-missing">No series selected</span>
      ) : (
        <>
          {actualDate ? <small>Nearest sample: {snapshot.formatX(row.x)}</small> : null}
          <div className="lilt-chart__adaptive-values">
            {series.map((item) => {
              const value = row?.values[item.id] ?? null;
              return (
                <div className="lilt-chart__adaptive-value" key={item.id}>
                  <span
                    className="lilt-chart__adaptive-swatch"
                    style={{ background: item.color ?? 'var(--lilt-series-1)' }}
                  />
                  <span>{item.label}</span>
                  <strong>
                    <BoundedText
                      duration={duration}
                      offset={3}
                      value={
                        value === null
                          ? 'No data'
                          : (item.formatValue?.(value) ?? snapshot.formatValue(value))
                      }
                    />
                  </strong>
                </div>
              );
            })}
            {stacked ? (
              <div className="lilt-chart__adaptive-value lilt-chart__adaptive-total">
                <span>Total</span>
                <strong>
                  <BoundedText
                    duration={duration}
                    offset={3}
                    value={total === null ? 'Incomplete' : snapshot.formatValue(total)}
                  />
                </strong>
              </div>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
