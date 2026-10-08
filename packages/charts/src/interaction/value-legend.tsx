import type { CSSProperties, ReactNode } from 'react';
import type { CardLegend, ChartLegendSwatch, ChartLegendVariant } from '../types';
import { LegendMeter, legendMeterScale } from './legend-meter';

export interface ValueLegendEntry {
  id: string;
  label: string;
  color: string;
  value: number | null;
  formattedValue: string;
}

/** The legend layout a card's `legend` prop names: its value tiles are the `cards` layout. */
export const cardLegendVariant = (legend: CardLegend): ChartLegendVariant =>
  legend === 'tiles' ? 'cards' : legend;

export interface ValueLegendProps<Entries extends readonly ValueLegendEntry[]> {
  items: Entries;
  /** `cards` (default), `inline`, `list`, `pills`, or `bars`. */
  variant?: ChartLegendVariant;
  /** The mark beside each label: `square` (default), `dot`, or `line`. */
  swatch?: ChartLegendSwatch;
  activeId?: NoInfer<Entries[number]['id']> | null;
  selectedId?: NoInfer<Entries[number]['id']> | null;
  onHoverIdChange?: (id: NoInfer<Entries[number]['id']> | null) => void;
  onSelectedIdChange?: (id: NoInfer<Entries[number]['id']> | null) => void;
  /** Series currently hidden from the chart. */
  hiddenIds?: readonly NoInfer<Entries[number]['id']>[];
  /**
   * Makes the legend a visibility control: clicking a tile hides or shows its series, and each
   * tile offers "Only" and "Show all". The last visible series can't be hidden.
   */
  onHiddenIdsChange?: (ids: NoInfer<Entries[number]['id']>[]) => void;
  renderLabel?: (entry: Entries[number]) => ReactNode;
  renderValue?: (entry: Entries[number]) => ReactNode;
  renderSwatch?: (entry: Entries[number]) => ReactNode;
  renderItem?: (entry: Entries[number]) => ReactNode;
  'aria-label'?: string;
  className?: string;
  style?: CSSProperties;
}

/** Family-neutral values and layout. The consumer supplies measurements and interaction ownership. */
export function ValueLegend<const Entries extends readonly ValueLegendEntry[]>({
  items,
  variant = 'cards',
  swatch = 'square',
  activeId,
  selectedId,
  onHoverIdChange,
  onSelectedIdChange,
  hiddenIds = [],
  onHiddenIdsChange,
  renderLabel,
  renderValue,
  renderSwatch,
  renderItem,
  'aria-label': ariaLabel = 'Values',
  className,
  style,
}: ValueLegendProps<Entries>) {
  type Id = Entries[number]['id'];
  const toggles = Boolean(onHiddenIdsChange) && items.length > 1;
  const interactive = Boolean(onHoverIdChange || onSelectedIdChange || toggles);
  const hidden = new Set<string>(hiddenIds);
  const visibleCount = items.filter((entry) => !hidden.has(entry.id)).length;
  const setHidden = (ids: Id[]) => onHiddenIdsChange?.(ids);
  const toggle = (id: Id) => {
    if (hidden.has(id)) setHidden(hiddenIds.filter((other) => other !== id) as Id[]);
    // The chart always keeps at least one series.
    else if (visibleCount > 1) setHidden([...(hiddenIds as Id[]), id]);
  };
  const meter = legendMeterScale(
    items.filter((entry) => !hidden.has(entry.id)).map((entry) => entry.value),
  );
  const only = (id: Id) =>
    setHidden(items.map((entry) => entry.id as Id).filter((other) => other !== id));
  return (
    <div
      data-lilt-chart=""
      role="group"
      aria-label={ariaLabel}
      className={['lilt-chart__legend', className].filter(Boolean).join(' ')}
      data-variant={variant}
      data-swatch={swatch === 'square' ? undefined : swatch}
      data-toggles={toggles || undefined}
      style={style}
    >
      {items.map((entry) => {
        const content = (
          <>
            <span className="lilt-chart__legend-name">
              {renderSwatch?.(entry) ?? (
                <span className="lilt-chart__legend-swatch" aria-hidden="true" />
              )}
              <span className="lilt-chart__legend-label">
                {renderLabel?.(entry) ?? entry.label}
              </span>
            </span>
            {variant === 'inline' ? (
              renderValue ? (
                <span className="lilt-chart__legend-inline-value">{renderValue(entry)}</span>
              ) : null
            ) : (
              <strong className="lilt-chart__legend-value">
                {renderValue?.(entry) ?? entry.formattedValue}
              </strong>
            )}
            {variant === 'bars' ? <LegendMeter value={entry.value} scale={meter} /> : null}
          </>
        );
        return (
          <span
            key={entry.id}
            className="lilt-chart__legend-item"
            data-interactive={interactive || undefined}
            data-visible={!hidden.has(entry.id)}
            data-active={activeId === entry.id || undefined}
            data-pinned={selectedId === entry.id || undefined}
            onPointerEnter={
              onHoverIdChange && !hidden.has(entry.id) ? () => onHoverIdChange(entry.id) : undefined
            }
            onPointerLeave={onHoverIdChange ? () => onHoverIdChange(null) : undefined}
            onFocus={
              onHoverIdChange && !hidden.has(entry.id) ? () => onHoverIdChange(entry.id) : undefined
            }
            onBlur={onHoverIdChange ? () => onHoverIdChange(null) : undefined}
            style={{ '--lilt-legend-color': entry.color } as CSSProperties}
          >
            {renderItem ? (
              renderItem(entry)
            ) : interactive ? (
              <button
                type="button"
                className="lilt-chart__legend-toggle"
                aria-pressed={toggles ? !hidden.has(entry.id) : selectedId === entry.id}
                aria-label={
                  toggles
                    ? `${entry.label}: ${entry.formattedValue}. ${
                        hidden.has(entry.id)
                          ? 'Hidden; press to show'
                          : visibleCount > 1
                            ? 'Shown; press to hide'
                            : 'The only series shown'
                      }`
                    : `${entry.label}: ${entry.formattedValue}`
                }
                onClick={
                  toggles
                    ? () => toggle(entry.id)
                    : onSelectedIdChange
                      ? () => onSelectedIdChange(selectedId === entry.id ? null : entry.id)
                      : undefined
                }
                onKeyDown={(event) => {
                  if (event.key === 'Escape' && onSelectedIdChange) {
                    event.preventDefault();
                    onSelectedIdChange(null);
                    return;
                  }
                  if (
                    !['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End'].includes(
                      event.key,
                    )
                  )
                    return;
                  const buttons = Array.from(
                    event.currentTarget
                      .closest('[role="group"]')
                      ?.querySelectorAll<HTMLButtonElement>('.lilt-chart__legend-toggle') ?? [],
                  );
                  const current = buttons.indexOf(event.currentTarget);
                  if (current < 0) return;
                  event.preventDefault();
                  const next =
                    event.key === 'Home'
                      ? 0
                      : event.key === 'End'
                        ? buttons.length - 1
                        : event.key === 'ArrowRight' || event.key === 'ArrowDown'
                          ? Math.min(buttons.length - 1, current + 1)
                          : Math.max(0, current - 1);
                  buttons[next]?.focus();
                }}
              >
                {content}
              </button>
            ) : (
              <span className="lilt-chart__legend-static">{content}</span>
            )}
            {toggles && !renderItem ? (
              <span className="lilt-chart__legend-actions">
                {visibleCount > 1 || hidden.has(entry.id) ? (
                  <button
                    type="button"
                    className="lilt-chart__legend-action"
                    aria-label={`Show only ${entry.label}`}
                    onClick={() => only(entry.id)}
                  >
                    Only
                  </button>
                ) : null}
                {hidden.size ? (
                  <button
                    type="button"
                    className="lilt-chart__legend-action"
                    aria-label="Show all series"
                    onClick={() => setHidden([])}
                  >
                    Show all
                  </button>
                ) : null}
              </span>
            ) : null}
          </span>
        );
      })}
    </div>
  );
}
