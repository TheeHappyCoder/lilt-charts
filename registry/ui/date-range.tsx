'use client';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from 'react';

export interface DateRangeValue {
  /** The first day, inclusive. */
  start: Date;
  /** The last day, inclusive. */
  end: Date;
}

export interface DateRangePreset {
  label: string;
  /** The range it stands for, worked out from today. */
  range: (today: Date) => DateRangeValue;
}

export interface DateRangeProps {
  /** The applied range, when you hold it yourself. */
  value?: DateRangeValue;
  /** The range to start with. Default the last 7 days. */
  defaultValue?: DateRangeValue;
  /** Called whenever a whole range is picked: a preset, or two days in either order. */
  onChange?: (value: DateRangeValue) => void;
  /** Called with the range, and the period before it when comparing, when Apply is pressed. */
  onApply?: (value: DateRangeValue, compare: DateRangeValue | null) => void;
  /** Called when Cancel is pressed. The picker also goes back to the applied range. */
  onCancel?: () => void;
  /** Start with the previous period drawn as a dashed ghost. Default false. */
  defaultCompare?: boolean;
  /** The presets beside the month. Pass [] to hide them. */
  presets?: readonly DateRangePreset[];
  /** The earliest day that can be picked. Default none. */
  min?: Date;
  /** The latest day that can be picked. Default today; null for no limit. */
  max?: Date | null;
  /** Today, for tests and server rendering. Default the reader's today. */
  today?: Date;
  /** 1 starts weeks on Monday, 0 on Sunday. Default 1. */
  weekStartsOn?: 0 | 1;
  /** The locale dates are written in. Default the reader's. */
  locales?: Intl.LocalesArgument;
  /** The heading. Default 'Date range'. */
  title?: string;
  /** A quiet line beside the buttons, such as the time zone. */
  note?: string;
  className?: string;
  style?: CSSProperties;
}

// Lilt's blur fade: in on the site's ease-out, out faster on an ease-in.
const EASE = [0.22, 1, 0.36, 1] as const;
const EASE_IN = [0.4, 0, 1, 1] as const;
const DAY = 86_400_000;
const ROW = 36; // a week's height plus the gap under it

/** A calendar day as a whole number, so ranges never trip over clocks or time zones. */
type Day = number;
interface Span {
  start: Day;
  end: Day;
}

const dayOf = (date: Date): Day =>
  Math.round(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY);
const dateOf = (day: Day) => {
  const utc = new Date(day * DAY);
  return new Date(utc.getUTCFullYear(), utc.getUTCMonth(), utc.getUTCDate());
};
const utcOf = (day: Day) => new Date(day * DAY);
const partsOf = (day: Day) => {
  const utc = new Date(day * DAY);
  return { year: utc.getUTCFullYear(), month: utc.getUTCMonth(), weekday: utc.getUTCDay() };
};
const monthStart = (year: number, month: number): Day => Math.round(Date.UTC(year, month, 1) / DAY);
const addDays = (date: Date, days: number) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
/** Either order in, earliest first out. */
const spanOf = (a: Day, b: Day): Span => (a <= b ? { start: a, end: b } : { start: b, end: a });
const spanOfValue = (value: DateRangeValue) => spanOf(dayOf(value.start), dayOf(value.end));
const lengthOf = (span: Span) => span.end - span.start + 1;
const daysLabel = (count: number) => (count === 1 ? '1 day' : `${count} days`);
/** The period just before, the same length, ending the day before this one starts. */
const previousOf = (span: Span): Span => ({
  start: span.start - lengthOf(span),
  end: span.start - 1,
});

const DEFAULT_PRESETS: readonly DateRangePreset[] = [
  { label: 'Today', range: (today) => ({ start: today, end: today }) },
  {
    label: 'Yesterday',
    range: (today) => ({ start: addDays(today, -1), end: addDays(today, -1) }),
  },
  { label: 'Last 7 days', range: (today) => ({ start: addDays(today, -6), end: today }) },
  { label: 'Last 30 days', range: (today) => ({ start: addDays(today, -29), end: today }) },
  {
    label: 'This month',
    range: (today) => ({ start: new Date(today.getFullYear(), today.getMonth(), 1), end: today }),
  },
  {
    label: 'Last month',
    range: (today) => ({
      start: new Date(today.getFullYear(), today.getMonth() - 1, 1),
      end: new Date(today.getFullYear(), today.getMonth(), 0),
    }),
  },
  {
    label: 'Last quarter',
    range: (today) => {
      const quarter = Math.floor(today.getMonth() / 3);
      return {
        start: new Date(today.getFullYear(), (quarter - 1) * 3, 1),
        end: new Date(today.getFullYear(), quarter * 3, 0),
      };
    },
  },
];

function useFormats(locales: Intl.LocalesArgument) {
  return useMemo(() => {
    const month = new Intl.DateTimeFormat(locales, {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    });
    const weekday = new Intl.DateTimeFormat(locales, { weekday: 'short', timeZone: 'UTC' });
    const full = new Intl.DateTimeFormat(locales, { dateStyle: 'full', timeZone: 'UTC' });
    const short = new Intl.DateTimeFormat(locales, {
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    });
    const long = new Intl.DateTimeFormat(locales, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    });
    const range = (span: Span, withYear: boolean) => {
      const format = withYear ? long : short;
      return span.start === span.end
        ? format.format(utcOf(span.start))
        : format.formatRange(utcOf(span.start), utcOf(span.end));
    };
    return { month, weekday, full, short, range };
  }, [locales]);
}

/** Where a span crosses one week: which columns, and whether it carries on past either edge. */
function crossing(span: Span | null, weekStart: Day) {
  if (!span) return null;
  const weekEnd = weekStart + 6;
  if (span.end < weekStart || span.start > weekEnd) return null;
  return {
    from: Math.max(span.start, weekStart) - weekStart,
    to: Math.min(span.end, weekEnd) - weekStart,
    opensLeft: span.start < weekStart,
    opensRight: span.end > weekEnd,
  };
}

const percent = (columns: number) => `${(columns / 7) * 100}%`;

/**
 * A date range picker for the top of a report. Presets sit beside the month, the range is one band
 * with ink at both ends, and two days can be picked in either order: the earlier one becomes the
 * start. While you look for the second day the band follows the pointer and a label counts the
 * days. Compare draws the period before as a dashed ghost.
 */
export function DateRange({
  value,
  defaultValue,
  onChange,
  onApply,
  onCancel,
  defaultCompare = false,
  presets = DEFAULT_PRESETS,
  min,
  max,
  today,
  weekStartsOn = 1,
  locales,
  title = 'Date range',
  note,
  className,
  style,
}: DateRangeProps) {
  const reduced = Boolean(useReducedMotion());
  const formats = useFormats(locales);
  const [mountedToday] = useState(() => dayOf(new Date()));
  const todayDay = today ? dayOf(today) : mountedToday;
  const minDay = min ? dayOf(min) : -Infinity;
  const maxDay = max === null ? Infinity : max ? dayOf(max) : todayDay;
  const presetSpans = presets.map((preset) => spanOfValue(preset.range(dateOf(todayDay))));

  const [ownApplied, setOwnApplied] = useState<Span>(() =>
    spanOfValue(value ?? defaultValue ?? DEFAULT_PRESETS[2]!.range(dateOf(todayDay))),
  );
  const applied = value ? spanOfValue(value) : ownApplied;
  const [draft, setDraft] = useState<Span>(applied);
  const appliedKey = `${applied.start}:${applied.end}`;
  const [seenKey, setSeenKey] = useState(appliedKey);
  if (appliedKey !== seenKey) {
    setSeenKey(appliedKey);
    setDraft(applied);
  }

  const [compare, setCompare] = useState(defaultCompare);
  const [appliedCompare, setAppliedCompare] = useState(defaultCompare);
  const [anchor, setAnchor] = useState<Day | null>(null);
  const [hover, setHover] = useState<Day | null>(null);
  const [view, setView] = useState(() => partsOf(draft.end));
  const [direction, setDirection] = useState(0);
  const [focusDay, setFocusDay] = useState<Day>(draft.end);
  const [applyFlash, setApplyFlash] = useState(0);
  const [spoken, setSpoken] = useState('');
  const viewport = useRef<HTMLDivElement>(null);
  const focusNext = useRef<Day | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const pending = anchor !== null;
  const preview = pending ? spanOf(anchor, hover ?? anchor) : null;
  const shown = preview ?? draft;
  const ghost = compare ? previousOf(shown) : null;
  const active = pending
    ? -1
    : presetSpans.findIndex((span) => span.start === draft.start && span.end === draft.end);

  // Six weeks from the start of the week holding the 1st, so the grid never changes height.
  const first = monthStart(view.year, view.month);
  const gridStart = first - ((partsOf(first).weekday - weekStartsOn + 7) % 7);
  const weeks = Array.from({ length: 6 }, (_, week) =>
    Array.from({ length: 7 }, (_, column) => gridStart + week * 7 + column),
  );
  const selectable = (day: Day) => day >= minDay && day <= maxDay;
  const prevDisabled = first - 1 < minDay;
  const nextDisabled = monthStart(view.year, view.month + 1) > maxDay;
  const tabbable =
    focusDay >= gridStart && focusDay < gridStart + 42 && partsOf(focusDay).month === view.month
      ? focusDay
      : (weeks.flat().find((day) => partsOf(day).month === view.month && selectable(day)) ?? first);

  useEffect(() => {
    if (applyFlash === 0) return;
    const timer = window.setTimeout(() => setApplyFlash(0), 1500);
    return () => window.clearTimeout(timer);
  }, [applyFlash]);

  // Keyboard moves land on their day after the render that shows it, in the month now showing
  // rather than the one still sliding away.
  const monthKey = `${view.year}-${view.month}`;
  useEffect(() => {
    const day = focusNext.current;
    if (day === null) return;
    focusNext.current = null;
    viewport.current
      ?.querySelector<HTMLButtonElement>(`[data-month="${monthKey}"] [data-day="${day}"]`)
      ?.focus();
  });

  const slide = {
    enter: (dir: number) =>
      reduced ? { opacity: 0 } : { opacity: 0, x: dir * 18, filter: 'blur(4px)' },
    center: {
      opacity: 1,
      x: 0,
      filter: 'blur(0px)',
      transition: { duration: reduced ? 0.12 : 0.32, ease: EASE },
    },
    exit: (dir: number) =>
      reduced
        ? { opacity: 0, transition: { duration: 0.1 } }
        : {
            opacity: 0,
            x: dir * -18,
            filter: 'blur(4px)',
            transition: { duration: 0.17, ease: EASE_IN },
          },
  };

  const showMonthOf = (day: Day) => {
    const target = partsOf(day);
    if (target.year === view.year && target.month === view.month) return;
    setDirection(target.year * 12 + target.month > view.year * 12 + view.month ? 1 : -1);
    setView(target);
  };

  const commit = (span: Span) => {
    setDraft(span);
    setAnchor(null);
    setHover(null);
    onChangeRef.current?.({ start: dateOf(span.start), end: dateOf(span.end) });
    setSpoken(`${formats.range(span, true)}, ${daysLabel(lengthOf(span))}.`);
  };

  const pick = (day: Day, event?: MouseEvent) => {
    if (!selectable(day)) return;
    setFocusDay(day);
    if (anchor === null && event?.shiftKey) {
      // Shift moves whichever end of the range is nearer.
      const moveStart = Math.abs(day - draft.start) < Math.abs(day - draft.end);
      commit(spanOf(moveStart ? day : draft.start, moveStart ? draft.end : day));
      return;
    }
    if (anchor === null) {
      setAnchor(day);
      setHover(day);
      setSpoken(
        `Starts ${formats.full.format(utcOf(day))}. Now pick the other end, before or after.`,
      );
      return;
    }
    commit(spanOf(anchor, day));
  };

  const choose = (index: number) => {
    const span = presetSpans[index]!;
    commit(span);
    setFocusDay(span.end);
    showMonthOf(span.end);
  };

  const startCustom = () => {
    setAnchor(null);
    setHover(null);
    setSpoken('Pick a start day.');
    focusNext.current = tabbable;
    setFocusDay(tabbable);
  };

  const go = (delta: number) => {
    setDirection(delta);
    const next = new Date(Date.UTC(view.year, view.month + delta, 1));
    setView({ year: next.getUTCFullYear(), month: next.getUTCMonth(), weekday: next.getUTCDay() });
  };

  const onDayKey = (event: KeyboardEvent<HTMLButtonElement>, day: Day) => {
    const column = (partsOf(day).weekday - weekStartsOn + 7) % 7;
    const steps: Partial<Record<string, number>> = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -7,
      ArrowDown: 7,
      Home: -column,
      End: 6 - column,
    };
    let next: Day | null = null;
    const step = steps[event.key];
    if (step !== undefined) next = day + step;
    else if (event.key === 'PageUp' || event.key === 'PageDown') {
      const months = (event.key === 'PageUp' ? -1 : 1) * (event.shiftKey ? 12 : 1);
      const from = dateOf(day);
      next = dayOf(new Date(from.getFullYear(), from.getMonth() + months, from.getDate()));
    } else if (event.key === 'Escape' && anchor !== null) {
      event.preventDefault();
      event.stopPropagation();
      setAnchor(null);
      setHover(null);
      setSpoken('Cleared. The range is as it was.');
      return;
    } else return;
    event.preventDefault();
    next = Math.min(Math.max(next, Number.isFinite(minDay) ? minDay : next), maxDay);
    setFocusDay(next);
    if (anchor !== null) setHover(next);
    showMonthOf(next);
    focusNext.current = next;
  };

  const cancel = () => {
    setDraft(applied);
    setCompare(appliedCompare);
    setAnchor(null);
    setHover(null);
    showMonthOf(applied.end);
    onCancel?.();
  };

  const apply = () => {
    if (pending) return;
    if (!value) setOwnApplied(draft);
    setAppliedCompare(compare);
    const before = compare ? previousOf(draft) : null;
    onApply?.(
      { start: dateOf(draft.start), end: dateOf(draft.end) },
      before ? { start: dateOf(before.start), end: dateOf(before.end) } : null,
    );
    setApplyFlash((n) => n + 1);
    setSpoken(`Applied ${formats.range(draft, true)}.`);
  };

  // The day count floats over the day you are on while you choose the other end.
  const target = pending ? (hover ?? anchor) : null;
  const targetIndex = target === null ? -1 : target - gridStart;
  const counting = target !== null && targetIndex >= 0 && targetIndex < 42;

  const summary: { key: string; node: ReactNode } = pending
    ? hover !== null && hover !== anchor
      ? {
          key: 'previewing',
          node: (
            <>
              <span className="lilt-drp-preview">{formats.range(preview!, true)}</span>
              {` · ${daysLabel(lengthOf(preview!))}`}
            </>
          ),
        }
      : {
          key: 'anchored',
          node: (
            <>
              <span className="lilt-drp-preview">From {formats.short.format(utcOf(anchor!))}</span>
              {' · pick the other end'}
            </>
          ),
        }
    : compare && ghost
      ? {
          key: `compare-${draft.start}-${draft.end}`,
          node: (
            <>
              <strong>{formats.range(draft, false)}</strong>
              {` vs ${formats.range(ghost, false)}`}
            </>
          ),
        }
      : {
          key: `range-${draft.start}-${draft.end}`,
          node: (
            <>
              <strong>{formats.range(draft, true)}</strong>
              {` · ${daysLabel(lengthOf(draft))}`}
            </>
          ),
        };

  return (
    <>
      <style href="lilt-ui-date-range" precedence="default">
        {css}
      </style>
      <div className={['lilt-drp', className].filter(Boolean).join(' ')} style={style}>
        <div className="lilt-drp-head">
          <span className="lilt-drp-title">{title}</span>
          <Swap id={summary.key} reduced={reduced} className="lilt-drp-summary">
            {summary.node}
          </Swap>
        </div>

        <div className="lilt-drp-card">
          {presets.length > 0 ? (
            <div className="lilt-drp-presets" role="group" aria-label="Presets">
              {presets.map((preset, index) => (
                <button
                  key={preset.label}
                  type="button"
                  className="lilt-drp-preset"
                  aria-pressed={active === index}
                  onClick={() => choose(index)}
                >
                  {preset.label}
                </button>
              ))}
              <button
                type="button"
                className="lilt-drp-preset"
                aria-pressed={active === -1}
                onClick={startCustom}
              >
                Custom
              </button>
            </div>
          ) : null}

          <div className="lilt-drp-calendar">
            <div className="lilt-drp-month">
              <Swap id={monthKey} reduced={reduced} className="lilt-drp-month-name">
                {formats.month.format(utcOf(first))}
              </Swap>
              <div className="lilt-drp-nav">
                <button
                  type="button"
                  className="lilt-drp-step"
                  aria-label="Previous month"
                  disabled={prevDisabled}
                  onClick={() => go(-1)}
                >
                  <Chevron flip />
                </button>
                <button
                  type="button"
                  className="lilt-drp-step"
                  aria-label="Next month"
                  disabled={nextDisabled}
                  onClick={() => go(1)}
                >
                  <Chevron />
                </button>
              </div>
            </div>

            <div className="lilt-drp-weekdays" aria-hidden="true">
              {weeks[0]!.map((day) => (
                <span key={day}>{formats.weekday.format(utcOf(day))}</span>
              ))}
            </div>

            <div className="lilt-drp-viewport" ref={viewport}>
              <AnimatePresence mode="popLayout" initial={false} custom={direction}>
                <motion.div
                  key={monthKey}
                  data-month={monthKey}
                  className="lilt-drp-weeks"
                  role="grid"
                  aria-label={formats.month.format(utcOf(first))}
                  onPointerLeave={() => {
                    if (pending) setHover(null);
                  }}
                  custom={direction}
                  variants={slide}
                  initial="enter"
                  animate="center"
                  exit="exit"
                >
                  {weeks.map((week) => {
                    const band = crossing(shown, week[0]!);
                    const shadow = crossing(ghost, week[0]!);
                    const bandLeft = band ? (band.opensLeft ? 0 : band.from + 0.5) : 0;
                    const bandRight = band ? (band.opensRight ? 7 : band.to + 0.5) : 0;
                    return (
                      <div key={week[0]} className="lilt-drp-week" role="row">
                        {shadow ? (
                          <span
                            aria-hidden="true"
                            className="lilt-drp-ghost"
                            data-open-left={shadow.opensLeft ? '' : undefined}
                            data-open-right={shadow.opensRight ? '' : undefined}
                            style={{
                              left: shadow.opensLeft ? 0 : `calc(${percent(shadow.from)} + 3px)`,
                              right: shadow.opensRight
                                ? 0
                                : `calc(${percent(6 - shadow.to)} + 3px)`,
                            }}
                          />
                        ) : null}
                        <AnimatePresence initial={false}>
                          {band && bandRight > bandLeft ? (
                            <motion.span
                              key="band"
                              aria-hidden="true"
                              className="lilt-drp-band"
                              data-open-left={band.opensLeft ? '' : undefined}
                              data-open-right={band.opensRight ? '' : undefined}
                              initial={{
                                opacity: 0,
                                left: percent(bandLeft),
                                width: percent(bandRight - bandLeft),
                              }}
                              animate={{
                                opacity: 1,
                                left: percent(bandLeft),
                                width: percent(bandRight - bandLeft),
                              }}
                              exit={{ opacity: 0, transition: { duration: 0.12 } }}
                              transition={{
                                duration: reduced ? 0 : pending ? 0.12 : 0.32,
                                ease: EASE,
                              }}
                            />
                          ) : null}
                        </AnimatePresence>
                        {week.map((day) => {
                          const outside = partsOf(day).month !== view.month;
                          const inside = day >= shown.start && day <= shown.end;
                          const isStart = day === shown.start;
                          const isEnd = day === shown.end;
                          const isTarget = pending && day === hover && day !== anchor;
                          const solidEnd = pending ? day === anchor : isStart || isEnd;
                          const inGhost = ghost ? day >= ghost.start && day <= ghost.end : false;
                          return (
                            <div key={day} role="gridcell" className="lilt-drp-cell">
                              <button
                                type="button"
                                data-day={day}
                                className="lilt-drp-day"
                                tabIndex={day === tabbable ? 0 : -1}
                                disabled={!selectable(day)}
                                aria-label={formats.full.format(utcOf(day))}
                                aria-pressed={inside}
                                aria-current={day === todayDay ? 'date' : undefined}
                                data-outside={outside ? '' : undefined}
                                data-in={inside ? '' : undefined}
                                data-end={solidEnd ? '' : undefined}
                                data-target={isTarget ? '' : undefined}
                                data-ghost={inGhost && !inside ? '' : undefined}
                                data-today={day === todayDay ? '' : undefined}
                                onClick={(event) => pick(day, event)}
                                onKeyDown={(event) => onDayKey(event, day)}
                                onPointerEnter={() => {
                                  if (pending && selectable(day)) setHover(day);
                                }}
                                onFocus={() => {
                                  setFocusDay(day);
                                  if (pending && selectable(day)) setHover(day);
                                }}
                              >
                                <span className="lilt-drp-cap">{utcOf(day).getUTCDate()}</span>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}

                  <AnimatePresence>
                    {counting ? (
                      <motion.span
                        key="count"
                        aria-hidden="true"
                        className="lilt-drp-count"
                        initial={
                          reduced
                            ? { opacity: 0 }
                            : {
                                opacity: 0,
                                filter: 'blur(4px)',
                                left: percent((targetIndex % 7) + 0.5),
                                top: Math.floor(targetIndex / 7) * ROW,
                              }
                        }
                        animate={{
                          opacity: 1,
                          filter: 'blur(0px)',
                          left: percent((targetIndex % 7) + 0.5),
                          top: Math.floor(targetIndex / 7) * ROW,
                        }}
                        exit={{ opacity: 0, filter: 'blur(4px)', transition: { duration: 0.14 } }}
                        transition={{ duration: reduced ? 0 : 0.16, ease: EASE }}
                      >
                        {daysLabel(lengthOf(preview!))}
                      </motion.span>
                    ) : null}
                  </AnimatePresence>
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="lilt-drp-compare">
              <button
                type="button"
                role="switch"
                aria-checked={compare}
                className="lilt-drp-switch"
                onClick={() => setCompare((on) => !on)}
              >
                <span className="lilt-drp-knob" />
                <span className="lilt-drp-sr">Compare to the previous period</span>
              </button>
              <span className="lilt-drp-compare-text" data-on={compare ? '' : undefined}>
                Compare to the previous {daysLabel(lengthOf(shown))}
                {compare && ghost ? (
                  <span className="lilt-drp-compare-dates"> · {formats.range(ghost, false)}</span>
                ) : null}
              </span>
            </div>
          </div>
        </div>

        <div className="lilt-drp-foot">
          <span className="lilt-drp-note">{note}</span>
          <div className="lilt-drp-actions">
            <button type="button" className="lilt-drp-btn" onClick={cancel}>
              Cancel
            </button>
            <button
              type="button"
              className="lilt-drp-btn lilt-drp-btn--ink"
              onClick={apply}
              disabled={pending}
            >
              <Swap
                id={applyFlash ? `applied-${applyFlash}` : 'apply'}
                reduced={reduced}
                className="lilt-drp-apply"
              >
                {applyFlash ? (
                  <>
                    <Tick />
                    Applied
                  </>
                ) : (
                  'Apply'
                )}
              </Swap>
            </button>
          </div>
        </div>

        <span className="lilt-drp-sr" aria-live="polite">
          {spoken}
        </span>
      </div>
    </>
  );
}

/** Text that rolls up out of a blur when it changes. */
function Swap({
  id,
  reduced,
  className,
  children,
}: {
  id: string;
  reduced: boolean;
  className: string;
  children: ReactNode;
}) {
  return (
    <span className={className}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={id}
          className={`${className}-line`}
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: 6, filter: 'blur(4px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          exit={reduced ? { opacity: 0 } : { opacity: 0, y: -6, filter: 'blur(4px)' }}
          transition={{ duration: reduced ? 0.1 : 0.22, ease: EASE }}
        >
          {children}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

function Chevron({ flip = false }: { flip?: boolean }) {
  return (
    <svg
      aria-hidden="true"
      width={14}
      height={14}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={flip ? 'M14.5 6.5 9 12l5.5 5.5' : 'M9.5 6.5 15 12l-5.5 5.5'} />
    </svg>
  );
}

function Tick() {
  return (
    <svg
      aria-hidden="true"
      width={13}
      height={13}
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 7.2 5.8 10 11 4.2" />
    </svg>
  );
}

const css = /* css */ `
.lilt-drp {
  --drp-plinth: #f4f4f2;
  --drp-edge: rgb(26 26 24 / 0.08);
  --drp-card: #ffffff;
  --drp-line: rgb(26 26 24 / 0.08);
  --drp-ink: #1a1a18;
  --drp-on-ink: #ffffff;
  --drp-muted: #6b6b66;
  --drp-faint: #8c8c87;
  --drp-chip: #44443f;
  --drp-well: #f4f4f2;
  --drp-hover: rgb(26 26 24 / 0.045);
  --drp-band: #ededea;
  --drp-off: rgb(26 26 24 / 0.28);
  --drp-ghost: rgb(26 26 24 / 0.34);
  --drp-track: #e9e9e6;
  --drp-knob: #ffffff;
  --drp-knob-on: #ffffff;
  --drp-accent: #7c5cff;
  --drp-ease: cubic-bezier(0.22, 1, 0.36, 1);
  position: relative;
  box-sizing: border-box;
  /* A real width, so a parent that sizes to its content gets 560px rather than nothing: the
     container query below would otherwise make the picker's own width ignore what is inside it. */
  width: 560px;
  max-width: 100%;
  padding: 6px;
  border: 1px solid var(--drp-edge);
  border-radius: 16px;
  background: var(--drp-plinth);
  color: var(--drp-ink);
  container-type: inline-size;
  contain-intrinsic-inline-size: 560px;
  -webkit-font-smoothing: antialiased;
}
:where(.dark, [data-theme="dark"]) .lilt-drp {
  --drp-plinth: #1c1c1a;
  --drp-edge: rgb(244 244 242 / 0.11);
  --drp-card: #111110;
  --drp-line: rgb(244 244 242 / 0.08);
  --drp-ink: #f4f4f2;
  --drp-on-ink: #0b0b0c;
  --drp-muted: #a3a39d;
  --drp-faint: #73736e;
  --drp-chip: #c9c9c4;
  --drp-well: #1f1f1d;
  --drp-hover: rgb(244 244 242 / 0.05);
  --drp-band: #262624;
  --drp-off: rgb(244 244 242 / 0.24);
  --drp-ghost: rgb(244 244 242 / 0.3);
  --drp-track: #2c2c2a;
  --drp-knob: #a3a39d;
  --drp-knob-on: #0b0b0c;
  --drp-accent: #9a82ff;
}
[data-theme="light"] .lilt-drp {
  --drp-plinth: #f4f4f2;
  --drp-edge: rgb(26 26 24 / 0.08);
  --drp-card: #ffffff;
  --drp-line: rgb(26 26 24 / 0.08);
  --drp-ink: #1a1a18;
  --drp-on-ink: #ffffff;
  --drp-muted: #6b6b66;
  --drp-faint: #8c8c87;
  --drp-chip: #44443f;
  --drp-well: #f4f4f2;
  --drp-hover: rgb(26 26 24 / 0.045);
  --drp-band: #ededea;
  --drp-off: rgb(26 26 24 / 0.28);
  --drp-ghost: rgb(26 26 24 / 0.34);
  --drp-track: #e9e9e6;
  --drp-knob: #ffffff;
  --drp-knob-on: #ffffff;
  --drp-accent: #7c5cff;
}
.lilt-drp *, .lilt-drp *::before, .lilt-drp *::after { box-sizing: border-box; }
.lilt-drp button { font: inherit; }

/* ---------- head ---------- */
.lilt-drp-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  min-height: 34px;
  padding: 6px 8px 8px 10px;
}
.lilt-drp-title {
  flex: none;
  font-size: 13.5px;
  font-weight: 500;
  line-height: 20px;
  letter-spacing: -0.015em;
}
.lilt-drp-summary {
  position: relative;
  display: grid;
  justify-items: end;
  min-width: 0;
  overflow: hidden;
  color: var(--drp-faint);
  font-size: 12px;
  line-height: 16px;
  font-variant-numeric: tabular-nums;
}
.lilt-drp-summary-line { grid-area: 1 / 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
.lilt-drp-summary strong { color: var(--drp-ink); font-weight: 500; }
.lilt-drp-preview { color: var(--drp-muted); }

/* ---------- card ---------- */
.lilt-drp-card {
  display: flex;
  overflow: hidden;
  border: 1px solid var(--drp-line);
  border-radius: 11px;
  background: var(--drp-card);
}
.lilt-drp-presets {
  display: flex;
  flex: none;
  flex-direction: column;
  gap: 2px;
  width: 150px;
  padding: 8px;
  border-right: 1px solid var(--drp-line);
}
.lilt-drp-preset {
  display: flex;
  align-items: center;
  height: 32px;
  padding: 0 10px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--drp-muted);
  font-size: 13px;
  font-weight: 450;
  line-height: 18px;
  text-align: left;
  white-space: nowrap;
  cursor: pointer;
  transition: background-color 160ms, color 160ms;
}
.lilt-drp-preset:hover { background: var(--drp-hover); color: var(--drp-ink); }
.lilt-drp-preset[aria-pressed="true"] { background: var(--drp-well); color: var(--drp-ink); font-weight: 500; }
.lilt-drp-preset:focus-visible { outline: 2px solid var(--drp-accent); outline-offset: -2px; }

/* ---------- calendar ---------- */
.lilt-drp-calendar {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
  padding: 12px 14px 12px;
}
.lilt-drp-month {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 30px;
  padding-left: 6px;
}
.lilt-drp-month-name {
  position: relative;
  display: grid;
  overflow: hidden;
  font-size: 13.5px;
  font-weight: 500;
  line-height: 20px;
  letter-spacing: -0.015em;
}
.lilt-drp-month-name-line { grid-area: 1 / 1; white-space: nowrap; }
.lilt-drp-nav { display: flex; gap: 2px; }
.lilt-drp-step {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--drp-muted);
  cursor: pointer;
  transition: background-color 160ms, color 160ms;
}
.lilt-drp-step:hover:not(:disabled) { background: var(--drp-well); color: var(--drp-ink); }
.lilt-drp-step:disabled { color: var(--drp-off); cursor: default; }
.lilt-drp-step:focus-visible { outline: 2px solid var(--drp-accent); outline-offset: 1px; }
.lilt-drp-weekdays {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  height: 22px;
  align-items: center;
  color: var(--drp-faint);
  font-size: 11px;
  font-weight: 500;
  line-height: 14px;
  text-align: center;
}
.lilt-drp-viewport { position: relative; }
.lilt-drp-weeks {
  position: relative;
  display: grid;
  gap: 2px;
}
.lilt-drp-week {
  position: relative;
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  height: 34px;
}
.lilt-drp-band {
  position: absolute;
  top: 0;
  bottom: 0;
  background: var(--drp-band);
  pointer-events: none;
}
.lilt-drp-band[data-open-left] { border-top-left-radius: 10px; border-bottom-left-radius: 10px; }
.lilt-drp-band[data-open-right] { border-top-right-radius: 10px; border-bottom-right-radius: 10px; }
.lilt-drp-ghost {
  position: absolute;
  top: 0;
  bottom: 0;
  border: 1px dashed var(--drp-ghost);
  border-radius: 10px;
  pointer-events: none;
}
.lilt-drp-ghost[data-open-left] { border-left: 0; border-top-left-radius: 0; border-bottom-left-radius: 0; }
.lilt-drp-ghost[data-open-right] { border-right: 0; border-top-right-radius: 0; border-bottom-right-radius: 0; }
.lilt-drp-cell { position: relative; display: grid; }
.lilt-drp-day {
  position: relative;
  z-index: 1;
  display: grid;
  place-items: center;
  height: 34px;
  padding: 0;
  border: 0;
  background: none;
  color: var(--drp-ink);
  font-size: 13px;
  font-weight: 450;
  line-height: 18px;
  font-variant-numeric: tabular-nums;
  cursor: pointer;
  outline: none;
}
.lilt-drp-cap {
  position: relative;
  display: grid;
  place-items: center;
  width: min(40px, 100%);
  height: 34px;
  border-radius: 10px;
  transition: background-color 160ms, color 160ms, box-shadow 160ms;
}
.lilt-drp-day:hover:not(:disabled):not([data-end]):not([data-target]) .lilt-drp-cap { background: var(--drp-hover); }
.lilt-drp-day[data-in] { font-weight: 500; }
.lilt-drp-day[data-ghost] { color: var(--drp-muted); }
.lilt-drp-day[data-outside]:not([data-in]) { color: var(--drp-off); }
.lilt-drp-day:disabled { color: var(--drp-off); cursor: default; }
.lilt-drp-day[data-end] .lilt-drp-cap { background: var(--drp-ink); color: var(--drp-on-ink); font-weight: 500; }
.lilt-drp-day[data-target] .lilt-drp-cap { background: var(--drp-card); box-shadow: inset 0 0 0 1.5px var(--drp-ink); font-weight: 500; }
.lilt-drp-day:focus-visible .lilt-drp-cap { box-shadow: 0 0 0 2px var(--drp-card), 0 0 0 4px var(--drp-accent); }
.lilt-drp-day[data-today] .lilt-drp-cap::after {
  content: "";
  position: absolute;
  left: 50%;
  bottom: 5px;
  width: 10px;
  height: 1.5px;
  margin-left: -5px;
  border-radius: 1px;
  background: currentColor;
  opacity: 0.55;
}
.lilt-drp-count {
  position: absolute;
  z-index: 3;
  display: inline-flex;
  align-items: center;
  height: 22px;
  margin-top: -5px;
  padding: 0 8px;
  border-radius: 7px;
  background: var(--drp-ink);
  color: var(--drp-on-ink);
  box-shadow: 0 6px 16px rgb(26 26 24 / 0.16);
  font-size: 11.5px;
  font-weight: 500;
  line-height: 16px;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  pointer-events: none;
  translate: -50% -100%;
}

/* ---------- compare ---------- */
.lilt-drp-compare {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 36px;
  margin-top: 4px;
  padding: 8px 6px 0;
  border-top: 1px solid var(--drp-line);
}
.lilt-drp-switch {
  position: relative;
  flex: none;
  width: 30px;
  height: 18px;
  padding: 2px;
  border: 0;
  border-radius: 9px;
  background: var(--drp-track);
  cursor: pointer;
  transition: background-color 200ms var(--drp-ease);
}
.lilt-drp-switch[aria-checked="true"] { background: var(--drp-ink); }
.lilt-drp-switch:focus-visible { outline: 2px solid var(--drp-accent); outline-offset: 2px; }
.lilt-drp-knob {
  display: block;
  width: 14px;
  height: 14px;
  border-radius: 7px;
  background: var(--drp-knob);
  box-shadow: 0 1px 2px rgb(26 26 24 / 0.16);
  transition: transform 240ms var(--drp-ease), background-color 200ms;
}
.lilt-drp-switch[aria-checked="true"] .lilt-drp-knob { transform: translateX(12px); background: var(--drp-knob-on); }
.lilt-drp-compare-text {
  min-width: 0;
  color: var(--drp-muted);
  font-size: 12.5px;
  line-height: 16px;
}
.lilt-drp-compare-text[data-on] { color: var(--drp-ink); }
.lilt-drp-compare-dates { color: var(--drp-faint); }

/* ---------- foot ---------- */
.lilt-drp-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 2px 2px 10px;
}
.lilt-drp-note { min-width: 0; color: var(--drp-faint); font-size: 12px; line-height: 16px; }
.lilt-drp-actions { display: flex; flex: none; gap: 6px; }
.lilt-drp-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 34px;
  padding: 0 13px;
  border: 0;
  border-radius: 10px;
  background: var(--drp-card);
  box-shadow: inset 0 0 0 1px var(--drp-line);
  color: var(--drp-chip);
  font-size: 13px;
  font-weight: 500;
  line-height: 18px;
  cursor: pointer;
  transition: background-color 160ms, transform 160ms var(--drp-ease), opacity 160ms;
}
.lilt-drp-btn:hover { background: var(--drp-well); }
.lilt-drp-btn:active { transform: scale(0.97); }
.lilt-drp-btn:focus-visible { outline: 2px solid var(--drp-accent); outline-offset: 2px; }
.lilt-drp-btn:disabled { cursor: default; opacity: 0.4; }
.lilt-drp-btn--ink { min-width: 84px; background: var(--drp-ink); box-shadow: none; color: var(--drp-on-ink); }
.lilt-drp-btn--ink:hover { background: color-mix(in srgb, var(--drp-ink) 86%, var(--drp-card)); }
.lilt-drp-apply { position: relative; display: grid; justify-items: center; overflow: hidden; }
.lilt-drp-apply-line { grid-area: 1 / 1; display: inline-flex; align-items: center; gap: 6px; white-space: nowrap; }

.lilt-drp-sr {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

/* Narrow: presets become a row of their own above the month. */
@container (max-width: 470px) {
  .lilt-drp-card { flex-direction: column; }
  .lilt-drp-presets {
    flex-direction: row;
    width: auto;
    overflow-x: auto;
    border-right: 0;
    border-bottom: 1px solid var(--drp-line);
    scrollbar-width: none;
  }
  .lilt-drp-preset { flex: none; }
}

@media (prefers-reduced-motion: reduce) {
  .lilt-drp-cap, .lilt-drp-preset, .lilt-drp-step, .lilt-drp-switch, .lilt-drp-knob, .lilt-drp-btn { transition: none; }
}
`;
