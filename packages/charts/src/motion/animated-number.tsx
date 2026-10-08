import {
  animate,
  AnimatePresence,
  m,
  useMotionValue,
  useMotionValueEvent,
  useIsPresent,
  useReducedMotion,
  useTransform,
  type Transition,
  type MotionStyle,
} from 'motion/react';
import NumberFlow, { type Format } from '@number-flow/react';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactElement,
} from 'react';
import { formatterOf } from './number-format';
import { MotionScope } from './motion-scope';

const subscribeHydration = () => () => {};
const clientHydrated = () => true;
const serverHydrated = () => false;

/**
 * How a number animates when it changes:
 * - `count` (default): the value itself counts to its new total.
 * - `pop`: the number lifts away and the new one pops in, character by character.
 * - `slide`: changed digits travel in the direction of change, ones place first.
 * - `roll`: every digit turns like an odometer, carrying through 9 → 0.
 * - `flow`: NumberFlow's spinning digits, which need an `Intl.NumberFormat` (cards provide one).
 * - `scramble`: changed digits cycle through figures before they land.
 *
 * Symbols such as a currency sign stay put while the digits beside them change. While values
 * arrive quickly, as they do when a pointer scrubs a chart, every variant keeps its character
 * but moves in a short, interruptible form: new digits start part-visible, old ones clear
 * within a tenth of a second, and each change carries on from wherever the last one was.
 */
export type AnimatedNumberVariant = 'slide' | 'roll' | 'flow' | 'pop' | 'scramble' | 'count';

export interface AnimatedNumberProps {
  value: number;
  /**
   * A format function or an `Intl.NumberFormat`. An `Intl.NumberFormat` lets every variant tell
   * symbols from digits exactly; `flow` needs one and slides with a plain function.
   */
  format?: ((value: number) => string) | Intl.NumberFormat;
  className?: string;
  motion?: 'auto' | 'none';
  /** `count` (default), `pop`, `slide`, `roll`, `flow`, or `scramble`. */
  variant?: AnimatedNumberVariant;
}

/** One character of the formatted number. */
export interface NumberCell {
  /** Stable across values: symbols by kind, digits by place value from the decimal point. */
  key: string;
  char: string;
  digit: boolean;
  /** Symbols before and after the number stay in place while its digits change. */
  role: 'prefix' | 'number' | 'suffix';
  /** Distance from the last character, for the ones-first cascade. */
  place: number;
}

const DIGIT = /\p{Decimal_Number}/u;
const NUMERIC_PARTS = new Set(['integer', 'group', 'decimal', 'fraction', 'nan', 'infinity']);

/**
 * Splits a formatted number into keyed cells. Keys follow meaning rather than position, so the
 * currency sign keeps its key when a digit is added, and the ones digit is always `i0`.
 */
export function numberCells(text: string, parts?: readonly Intl.NumberFormatPart[]): NumberCell[] {
  const cells: Omit<NumberCell, 'place'>[] = [];
  if (parts?.length && parts.map((part) => part.value).join('') === text) {
    const first = parts.findIndex((part) => NUMERIC_PARTS.has(part.type));
    const last =
      parts.length - 1 - [...parts].reverse().findIndex((part) => NUMERIC_PARTS.has(part.type));
    let integers = parts
      .filter((part) => part.type === 'integer')
      .reduce((count, part) => count + Array.from(part.value).length, 0);
    let fraction = 0;
    const seen = new Map<string, number>();
    parts.forEach((part, index) => {
      const role = first < 0 || index < first ? 'prefix' : index > last ? 'suffix' : 'number';
      for (const char of Array.from(part.value)) {
        let key: string;
        if (part.type === 'integer') key = `i${(integers -= 1)}`;
        else if (part.type === 'group') key = `g${integers}`;
        else if (part.type === 'decimal') key = 'dec';
        else if (part.type === 'fraction') key = `f${fraction++}`;
        else {
          const name = `${role}-${part.type}`;
          const count = seen.get(name) ?? 0;
          seen.set(name, count + 1);
          key = `${name}-${count}`;
        }
        cells.push({ key, char, digit: DIGIT.test(char), role });
      }
    });
  } else {
    // A plain string: symbols before the first digit and after the last stay put; the digits
    // between are keyed from the end, which keeps place value for most formats.
    const chars = Array.from(text);
    const first = chars.findIndex((char) => DIGIT.test(char));
    const last = chars.length - 1 - [...chars].reverse().findIndex((char) => DIGIT.test(char));
    chars.forEach((char, index) => {
      const digit = DIGIT.test(char);
      if (first < 0 || index < first)
        cells.push({ key: `prefix-${index}`, char, digit, role: 'prefix' });
      else if (index > last)
        cells.push({ key: `suffix-${chars.length - 1 - index}`, char, digit, role: 'suffix' });
      else cells.push({ key: `n${last - index}${digit ? 'd' : 's'}`, char, digit, role: 'number' });
    });
  }
  return cells.map((cell, index) => ({ ...cell, place: cells.length - 1 - index }));
}

/** Keep interpolation frames at the precision of the accepted measurement. */
export function interpolationFrameValue(frame: number, target: number): number {
  const [mantissa, exponentText] = String(target).toLowerCase().split('e');
  const fractionalDigits = mantissa.split('.')[1]?.length ?? 0;
  const exponent = Number(exponentText ?? 0);
  const precision = Math.min(10, Math.max(0, fractionalDigits - exponent));
  const rounded = Number(frame.toFixed(precision));
  return Object.is(rounded, -0) ? 0 : rounded;
}

/** The next stop on a digit reel that shows `digit`, turning from `from` in the direction of change. */
export function reelTarget(from: number, digit: number, direction: 1 | -1): number {
  const ahead = (((digit - from) % 10) + 10) % 10;
  if (ahead === 0) return from;
  return direction > 0 ? from + ahead : from - (10 - ahead);
}

/** Changes closer together than this are a live reading, such as a pointer scrubbing a chart. */
const LIVE_GAP_MS = 240;
/** How long a live change takes: short enough to keep up with the pointer, long enough to see. */
const LIVE_DURATION = 0.16;
const LIVE_EXIT: Transition = { duration: 0.1, ease: 'easeOut' };
const EASE_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1];
const SETTLE: Transition = { type: 'spring', stiffness: 420, damping: 34, mass: 0.7 };
/** Changes ripple from the ones place outward, like a carry. */
const cascade = (place: number) => Math.min(place, 6) * 0.024;

type Direction = 1 | -1;
/** What an exiting glyph needs to know about the change that replaced it. */
interface Change {
  direction: Direction;
  live: boolean;
}

/** A glyph that is replaced by the next: `slide` travels, `fade` swaps in place. */
function SwapCell({
  cell,
  change,
  style,
}: {
  cell: NumberCell;
  change: Change;
  style: 'slide' | 'fade';
}) {
  return (
    <span className="lilt-number__cell" data-digit={cell.digit || undefined}>
      <AnimatePresence initial={false} custom={change}>
        <SwapGlyph key={cell.char} cell={cell} change={change} style={style} />
      </AnimatePresence>
    </span>
  );
}

function SwapGlyph({
  cell,
  change,
  style,
}: {
  cell: NumberCell;
  change: Change;
  style: 'slide' | 'fade';
}) {
  const present = useIsPresent();
  const opacity = useMotionValue(1);
  // A digit can return while its previous instance is still leaving. Preserve its movement,
  // but restore the live-reading visibility floor immediately when it becomes current again.
  const visibleOpacity = useTransform(() =>
    present && change.live ? Math.max(0.35, opacity.get()) : opacity.get(),
  );
  const travel = style === 'slide' ? 0.72 : 0;
  const variants = {
    enter: ({ direction, live }: Change) =>
      live
        ? {
            y: `${direction * travel * 55}%`,
            '--lilt-glyph-opacity': 0.35,
            scale: 1,
            filter: 'blur(0px)',
          }
        : {
            y: `${direction * travel * 100}%`,
            '--lilt-glyph-opacity': 0,
            scale: style === 'fade' ? 1.06 : 0.96,
            filter: `blur(${style === 'fade' ? 1.5 : 2.5}px)`,
          },
    rest: { y: '0%', '--lilt-glyph-opacity': 1, scale: 1, filter: 'blur(0px)' },
    leave: ({ direction, live }: Change) =>
      live
        ? { y: `${-direction * travel * 55}%`, '--lilt-glyph-opacity': 0, transition: LIVE_EXIT }
        : {
            y: `${-direction * travel * 100}%`,
            '--lilt-glyph-opacity': 0,
            scale: style === 'fade' ? 0.94 : 0.96,
            filter: `blur(${style === 'fade' ? 1.5 : 2.5}px)`,
          },
  };
  return (
    <m.span
      className="lilt-number__glyph"
      data-present={present || undefined}
      style={{ '--lilt-glyph-opacity': opacity, opacity: visibleOpacity } as MotionStyle}
      custom={change}
      variants={variants}
      initial="enter"
      animate="rest"
      exit="leave"
      transition={
        change.live
          ? { duration: LIVE_DURATION, ease: EASE_OUT }
          : {
              delay: cascade(cell.place),
              y: SETTLE,
              default: { duration: 0.26, ease: EASE_OUT },
            }
      }
    >
      {cell.char}
    </m.span>
  );
}

const REEL = Array.from({ length: 30 }, (_, index) => String(index % 10));

/** A 0–9 reel, repeated three times so it can always turn the short way round in either direction. */
function RollCell({ cell, change }: { cell: NumberCell; change: Change }) {
  const digit = Number(cell.char);
  const position = useMotionValue(10 + digit);
  const changeRef = useRef(change);
  changeRef.current = change;
  useEffect(() => {
    let from = position.get();
    // Recentre on the middle copy, which looks identical, so repeated turns never run off the reel.
    if (from < 5 || from >= 25) {
      from = 10 + (((from % 10) + 10) % 10);
      position.jump(from);
    }
    const { direction, live } = changeRef.current;
    const to = reelTarget(from, digit, direction);
    if (to === from) return;
    // A live reading turns straight away and a little quicker, carrying on from wherever the
    // reel is, so it never waits for the pointer to stop.
    const controls = animate(position, to, {
      type: 'spring',
      stiffness: live ? 320 : 190,
      damping: live ? 32 : 26,
      mass: 0.9,
      delay: live ? 0 : cascade(cell.place),
      onComplete: () => position.jump(10 + digit),
    });
    return () => controls.stop();
  }, [cell.place, digit, position]);
  const y = useTransform(position, (stop) => `${(-stop / REEL.length) * 100}%`);
  return (
    <span className="lilt-number__cell lilt-number__cell--reel" data-digit>
      <span className="lilt-number__glyph lilt-number__sizer" aria-hidden="true">
        {cell.char}
      </span>
      <m.span className="lilt-number__reel" style={{ y }}>
        {REEL.map((figure, index) => (
          <span key={index}>{figure}</span>
        ))}
      </m.span>
    </span>
  );
}

const FIGURES = '0123456789';

/** Cycles through figures for a moment, then lands. Farther places land a beat later. */
function ScrambleCell({ cell, live }: { cell: NumberCell; live: boolean }) {
  const [noise, setNoise] = useState<string | null>(null);
  const settled = useRef(cell.char);
  const liveRef = useRef(live);
  liveRef.current = live;
  useEffect(() => {
    if (settled.current === cell.char) return;
    settled.current = cell.char;
    let ticks = 0;
    // Live readings flicker just long enough to register; settled ones take their time.
    const total = liveRef.current ? 2 : 5 + Math.min(cell.place, 6);
    const timer = window.setInterval(() => {
      ticks += 1;
      setNoise(ticks >= total ? null : FIGURES[Math.floor(Math.random() * 10)]!);
      if (ticks >= total) window.clearInterval(timer);
    }, 36);
    return () => {
      window.clearInterval(timer);
      setNoise(null);
    };
  }, [cell.char, cell.place]);
  return (
    <span
      className="lilt-number__cell"
      data-digit={cell.digit || undefined}
      data-scrambling={noise !== null || undefined}
    >
      <span className="lilt-number__glyph">{noise ?? cell.char}</span>
    </span>
  );
}

function StillCell({ cell }: { cell: NumberCell }) {
  return (
    <span className="lilt-number__cell" data-digit={cell.digit || undefined}>
      <span className="lilt-number__glyph">{cell.char}</span>
    </span>
  );
}

/** A slight overshoot, so each character lands with a small bounce. */
const POP_EASE: [number, number, number, number] = [0.34, 1.45, 0.64, 1];
const popCharacter = {
  enter: (live: boolean) =>
    live
      ? { y: '16%', opacity: 0.4, filter: 'blur(0px)' }
      : { y: '32%', opacity: 0, filter: 'blur(2px)' },
  visible: { y: '0%', opacity: 1, filter: 'blur(0px)' },
};
/** The outgoing number lifts away as one piece; behind a live reading it clears quickly. */
const popNumber = {
  leave: (live: boolean) =>
    live
      ? { y: '-16%', opacity: 0, transition: LIVE_EXIT }
      : {
          y: '-32%',
          opacity: 0,
          filter: 'blur(2px)',
          transition: { duration: 0.3, ease: EASE_OUT },
        },
};

/**
 * Swaps the digits as one piece: the old number lifts out of the flow while the new characters
 * pop in from below, left to right, with the stagger capped so long numbers land together.
 * Symbols around the number are not part of it, so they never move or overlap.
 */
function PopNumber({ cells, live }: { cells: readonly NumberCell[]; live: boolean }) {
  const text = cells.map((cell) => cell.char).join('');
  return (
    <span className="lilt-number__pop-host">
      <AnimatePresence mode="popLayout" initial={false} custom={live}>
        <m.span
          key={text}
          className="lilt-number__pop"
          variants={popNumber}
          initial="enter"
          animate="visible"
          exit="leave"
        >
          {cells.map((cell, index) => (
            <m.span
              key={index}
              className="lilt-number__pop-char"
              custom={live}
              variants={popCharacter}
              transition={
                live
                  ? { duration: 0.22, ease: POP_EASE }
                  : { duration: 0.5, delay: Math.min(index, 2) * 0.07, ease: POP_EASE }
              }
            >
              {cell.char}
            </m.span>
          ))}
        </m.span>
      </AnimatePresence>
    </span>
  );
}

/** Counts from the last value to the new one at the precision of the value it lands on. */
function useCount(value: number, enabled: boolean, live: boolean): number {
  const shown = useMotionValue(value);
  const liveRef = useRef(live);
  liveRef.current = live;
  const [frame, setFrame] = useState(value);
  useMotionValueEvent(shown, 'change', setFrame);
  useEffect(() => {
    if (!enabled) {
      shown.jump(value);
      return;
    }
    // Each change carries on from the value on screen, so a scrub reads as one smooth count.
    const controls = animate(shown, value, {
      duration: liveRef.current ? 0.24 : 0.62,
      ease: EASE_OUT,
    });
    return () => controls.stop();
  }, [enabled, shown, value]);
  return enabled ? interpolationFrameValue(frame, value) : value;
}

/** Where the latest change came from, and whether it arrived as part of a live reading. */
function useChange(value: number): Change {
  const [track, setTrack] = useState({ value, at: 0, direction: 1 as Direction, live: false });
  if (track.value !== value) {
    const at = Date.now();
    setTrack({
      value,
      at,
      direction: value >= track.value ? 1 : -1,
      live: at - track.at < LIVE_GAP_MS,
    });
  }
  return { direction: track.direction, live: track.live };
}

/**
 * A number that animates between values. Characters sit in slots keyed by meaning, so only the
 * places that change move, symbols hold still, and places that appear or leave ease the width
 * open or shut. Screen readers get the settled value once; the moving glyphs are hidden.
 */
function AnimatedNumberContent({
  value,
  format = String,
  className,
  motion: motionMode = 'auto',
  variant: requested = 'count',
}: AnimatedNumberProps): ReactElement {
  const reduced = useReducedMotion();
  // The server cannot know the reader's motion preference. Hydrate the same still glyphs first.
  const hydrated = useSyncExternalStore(subscribeHydration, clientHydrated, serverHydrated);
  const animated = hydrated && !reduced && motionMode !== 'none';
  const intl = formatterOf(format);
  const text = (number: number) =>
    format instanceof Intl.NumberFormat ? format.format(number) : format(number);
  const cellsOf = (number: number) => numberCells(text(number), intl?.formatToParts(number));
  // Flow reads the parts of an Intl format; a plain function slides instead.
  const variant = requested === 'flow' && !intl ? 'slide' : requested;
  const flowFormat = useMemo(() => {
    if (!intl) return undefined;
    const { locale, ...options } = intl.resolvedOptions();
    return { locale, options: options as Format };
  }, [intl]);
  const label = text(value);
  const change = useChange(value);
  const counted = useCount(value, animated && variant === 'count', change.live);
  const classes = ['lilt-number', className].filter(Boolean).join(' ');

  if (variant === 'flow' && flowFormat)
    return (
      <span className={classes} data-variant="flow">
        <span className="lilt-chart__sr-only">{label}</span>
        <span aria-hidden="true" className="lilt-number__flow">
          <NumberFlow
            value={value}
            locales={flowFormat.locale}
            format={flowFormat.options}
            animated={animated}
            willChange
          />
        </span>
      </span>
    );

  const cells = cellsOf(variant === 'count' ? counted : value);
  const cellFor = (cell: NumberCell) => {
    if (!animated) return <StillCell cell={cell} />;
    // Symbols only change when they must, such as a sign flipping, and then they simply fade.
    if (cell.role !== 'number') return <SwapCell cell={cell} change={change} style="fade" />;
    if (variant === 'count') return <StillCell cell={cell} />;
    if (variant === 'roll')
      return /[0-9]/.test(cell.char) ? (
        <RollCell cell={cell} change={change} />
      ) : (
        <SwapCell cell={cell} change={change} style="fade" />
      );
    if (variant === 'scramble')
      return /[0-9]/.test(cell.char) ? (
        <ScrambleCell cell={cell} live={change.live} />
      ) : (
        <SwapCell cell={cell} change={change} style="fade" />
      );
    return <SwapCell cell={cell} change={change} style="slide" />;
  };
  const place = (cell: NumberCell) => (
    <m.span
      key={cell.key}
      className="lilt-number__place"
      custom={change.live}
      initial={animated ? { width: 0, opacity: 0 } : false}
      animate={{ width: 'auto', opacity: 1 }}
      exit={animated ? { width: 0, opacity: 0 } : undefined}
      transition={{ duration: change.live ? LIVE_DURATION : 0.32, ease: EASE_OUT }}
    >
      {cellFor(cell)}
    </m.span>
  );

  const popped = variant === 'pop' && animated;
  const prefix = cells.filter((cell) => cell.role === 'prefix');
  const digits = cells.filter((cell) => cell.role === 'number');
  const suffix = cells.filter((cell) => cell.role === 'suffix');

  return (
    <span className={classes} data-variant={requested}>
      <span className="lilt-chart__sr-only">{label}</span>
      <span aria-hidden="true" className="lilt-number__characters">
        {popped ? (
          <>
            <AnimatePresence initial={false}>{prefix.map(place)}</AnimatePresence>
            <PopNumber cells={digits} live={change.live} />
            <AnimatePresence initial={false}>{suffix.map(place)}</AnimatePresence>
          </>
        ) : (
          <AnimatePresence initial={false}>{cells.map(place)}</AnimatePresence>
        )}
      </span>
    </span>
  );
}

/** AnimatedNumber with its own MotionScope, so it animates wherever it is rendered. */
export function AnimatedNumber(props: AnimatedNumberProps): ReactElement {
  return (
    <MotionScope>
      <AnimatedNumberContent {...props} />
    </MotionScope>
  );
}
