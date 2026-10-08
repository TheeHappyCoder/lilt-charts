import {
  createContext,
  useContext,
  type CSSProperties,
  type KeyboardEventHandler,
  type ReactElement,
  type ReactNode,
} from 'react';
import { AnimatedNumber, type AnimatedNumberVariant } from '../motion/animated-number';
import { MotionScope } from '../motion/motion-scope';
import { RangeSelect, useCustomRangeSelect } from './range-select';

const NumberStyleContext = createContext<AnimatedNumberVariant>('count');
import type { ChartMotion, ChartPalette, ChartStyle, ChartSurface } from '../types';

function cx(...names: (string | false | null | undefined)[]): string {
  return names.filter(Boolean).join(' ');
}

export interface ChartCardProps {
  children?: ReactNode;
  /** `elevated` (default) lifts the card; `outline` is border-only; `ghost` drops the frame. */
  surface?: ChartSurface;
  /** Series colors for everything inside the card. */
  palette?: ChartPalette;
  /** `none` stops decorative motion inside the card, such as loading shimmer. */
  motion?: ChartMotion;
  /** How the headline animates: `count` (default), `pop`, `slide`, `roll`, `flow`, or `scramble`. */
  numberStyle?: AnimatedNumberVariant;
  /**
   * A glass tab tucked behind the card's top edge, e.g. a caption, a command, or actions. With a
   * badge, `className` and `style` apply to the frame that holds the tab and the card.
   */
  badge?: ReactNode;
  className?: string;
  style?: CSSProperties | ChartStyle;
  'aria-label'?: string;
  onKeyDown?: KeyboardEventHandler<HTMLElement>;
}

/** The card surface every Lilt card shares: padding, radius, border, and theme tokens. */
export function ChartCard({
  children,
  surface = 'elevated',
  palette,
  motion,
  numberStyle = 'count',
  badge,
  className,
  style,
  'aria-label': ariaLabel,
  onKeyDown,
}: ChartCardProps): ReactElement {
  const tabbed = badge !== undefined && badge !== null && badge !== false;
  const framed = tabbed;
  const root = {
    'data-lilt-chart': '',
    'data-lilt-palette': palette,
    'data-motion': motion === 'none' ? ('none' as const) : undefined,
    style: style as CSSProperties,
  };
  const card = (
    <section
      {...(framed ? { 'data-lilt-chart': '' } : root)}
      data-surface={surface}
      className={cx('lilt-card', !framed && className)}
      aria-label={ariaLabel}
      onKeyDown={onKeyDown}
    >
      {children}
    </section>
  );
  return (
    <NumberStyleContext.Provider value={numberStyle}>
      <MotionScope>
        {framed ? (
          <div
            {...root}
            className={cx('lilt-card-frame', className)}
            data-tabbed={tabbed || undefined}
            data-surface={surface}
          >
            {tabbed ? <CardBadge>{badge}</CardBadge> : null}
            {card}
          </div>
        ) : (
          card
        )}
      </MotionScope>
    </NumberStyleContext.Provider>
  );
}

export interface CardBadgeProps {
  children?: ReactNode;
  className?: string;
}

/**
 * The glass tab a card's `badge` renders. On its own above another panel, tuck the tab's lower
 * edge behind that panel: `position: relative; z-index: 1; margin-top: -12px`.
 */
export function CardBadge({ children, className }: CardBadgeProps): ReactElement {
  return (
    <div data-lilt-chart="" className={cx('lilt-card-badge', className)}>
      {children}
    </div>
  );
}

export interface ChartCardHeaderProps {
  children?: ReactNode;
  /** Right-aligned content such as a period select or legend. */
  aside?: ReactNode;
  className?: string;
}

export function ChartCardHeader({ children, aside, className }: ChartCardHeaderProps) {
  return (
    <header className={cx('lilt-card__header', className)}>
      <div className="lilt-card__heading">{children}</div>
      {aside ? <div className="lilt-card__aside">{aside}</div> : null}
    </header>
  );
}

export function ChartCardTitle({ children }: { children?: ReactNode }) {
  return <p className="lilt-card__title">{children}</p>;
}

export interface ChartCardValueProps {
  value: number | null;
  format?: (value: number) => string;
  /** Shown beside the value, e.g. a delta chip or the hovered x label. */
  children?: ReactNode;
  loading?: boolean;
  motion?: 'auto' | 'none';
}

export function ChartCardValue({
  value,
  format,
  children,
  loading = false,
  motion,
}: ChartCardValueProps) {
  const variant = useContext(NumberStyleContext);
  return (
    <div className="lilt-card__value-row">
      <strong className="lilt-card__value" data-loading={loading || undefined}>
        {loading ? (
          <span className="lilt-card__skeleton" aria-label="Loading" />
        ) : value === null ? (
          '—'
        ) : (
          <AnimatedNumber value={value} format={format} variant={variant} motion={motion} />
        )}
      </strong>
      {children}
    </div>
  );
}

export interface ChartCardDeltaProps {
  /** Fractional change: 0.082 renders as +8.2%. */
  value: number;
  /** Direction is not desirability. Use `inverse` when a decrease is good, `neutral` for neither. */
  tone?: 'default' | 'inverse' | 'neutral';
  format?: (value: number) => string;
}

const percent = (value: number) => `${value >= 0 ? '+' : ''}${(value * 100).toFixed(1)}%`;

export function ChartCardDelta({ value, tone = 'default', format = percent }: ChartCardDeltaProps) {
  const direction = value > 0 ? 'up' : value < 0 ? 'down' : 'flat';
  const good =
    tone === 'neutral' || direction === 'flat'
      ? 'neutral'
      : (direction === 'up') === (tone === 'default')
        ? 'positive'
        : 'negative';
  return (
    <span className="lilt-card__delta" data-tone={good}>
      {format(value)}
    </span>
  );
}

/** Quiet secondary text beside the value, e.g. the hovered x label. */
export function ChartCardCaption({ children }: { children?: ReactNode }) {
  return <span className="lilt-card__caption">{children}</span>;
}

export interface ChartCardRangeOption {
  id: string;
  label: string;
}

export interface ChartCardRangeProps<Option extends ChartCardRangeOption> {
  /** A single static label, or options for a period select. */
  label?: string;
  options?: readonly Option[];
  value?: NoInfer<Option['id']>;
  onValueChange?: (id: NoInfer<Option['id']>) => void;
}

/**
 * Period pill. With options it becomes Lilt's period select, or the select supplied through
 * `ChartComponentsProvider`.
 */
export function ChartCardRange<const Option extends ChartCardRangeOption>({
  label,
  options,
  value,
  onValueChange,
}: ChartCardRangeProps<Option>) {
  const Custom = useCustomRangeSelect();
  if (!options || options.length < 2)
    return <span className="lilt-card__range">{label ?? options?.[0]?.label}</span>;
  const props = {
    value: value ?? options[0]!.id,
    options,
    onValueChange: (id: string) => onValueChange?.(id as Option['id']),
    'aria-label': 'Period',
  };
  return Custom ? (
    <span className="lilt-card__range-slot">
      <Custom {...props} />
    </span>
  ) : (
    <RangeSelect {...props} />
  );
}
