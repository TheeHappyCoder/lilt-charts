'use client';

import {
  AnimatePresence,
  motion,
  useReducedMotion,
  useSpring,
  useTransform,
  useVelocity,
} from 'motion/react';
import { useEffect, useMemo, useRef, type CSSProperties } from 'react';

export interface NumberRollProps {
  /** The number to show. Change it and only the digits that differ roll. */
  value: number;
  /** How to write it, as `Intl.NumberFormat` options, such as `{ style: 'currency', currency: 'USD' }`. */
  format?: Intl.NumberFormatOptions;
  /** The locale to write it in. Default the reader's. */
  locales?: Intl.LocalesArgument;
  className?: string;
  style?: CSSProperties;
}

/** A digit's cell, and the soft edge inside it that rolling digits fade through, in em. */
const CELL = 1.3;
const EDGE = 0.14;
const SPRING = { stiffness: 210, damping: 28, mass: 0.9 } as const;
const FADE = { duration: 0.32, ease: [0.22, 1, 0.36, 1] } as const;

interface Char {
  key: string;
  char: string;
  digit: number | null;
}

/**
 * Splits the formatted number into characters keyed by place, so the units digit stays the units
 * digit when the number grows a column, and a comma that appears is a new character.
 */
function charsOf(parts: Intl.NumberFormatPart[]): Char[] {
  const whole = parts
    .filter((part) => part.type === 'integer' || part.type === 'group')
    .map((part) => part.value)
    .join('');
  const chars: Char[] = [];
  const seen: Record<string, number> = {};
  let wholeAt = 0;
  let fractionAt = 0;
  for (const part of parts) {
    for (const char of part.value) {
      let key: string;
      if (part.type === 'integer' || part.type === 'group') key = `i${whole.length - wholeAt++}`;
      else if (part.type === 'fraction') key = `f${fractionAt++}`;
      else key = `${part.type}${(seen[part.type] = (seen[part.type] ?? 0) + 1)}`;
      const numeric = (part.type === 'integer' || part.type === 'fraction') && /\d/.test(char);
      chars.push({ key, char, digit: numeric ? Number(char) : null });
    }
  }
  return chars;
}

/**
 * A number that rolls. Each digit is its own wheel on a spring, so going from 1,284 to 1,302 turns
 * only the last three, and a digit blurs in proportion to how fast it is turning. Columns that
 * appear, such as a new thousands digit and its comma, widen in from nothing out of a blur, and
 * a new digit rolls up from zero. Screen readers get the plain number.
 */
export function NumberRoll({ value, format, locales, className, style }: NumberRollProps) {
  const reduced = Boolean(useReducedMotion());
  const formatter = useMemo(() => new Intl.NumberFormat(locales, format), [locales, format]);
  const chars = charsOf(formatter.formatToParts(value));
  // Columns there from the start sit still; ones that arrive later roll up from zero.
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
  }, []);

  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'baseline',
        whiteSpace: 'nowrap',
        fontVariantNumeric: 'tabular-nums',
        lineHeight: CELL,
        ...style,
      }}
    >
      <span
        style={{
          position: 'absolute',
          width: 1,
          height: 1,
          overflow: 'hidden',
          clipPath: 'inset(50%)',
          whiteSpace: 'nowrap',
        }}
      >
        {formatter.format(value)}
      </span>
      <AnimatePresence initial={false}>
        {chars.map((char) => (
          <motion.span
            key={char.key}
            aria-hidden="true"
            initial={reduced ? { opacity: 0 } : { width: 0, opacity: 0, filter: 'blur(6px)' }}
            animate={{ width: 'auto', opacity: 1, filter: 'blur(0px)' }}
            exit={reduced ? { opacity: 0 } : { width: 0, opacity: 0, filter: 'blur(6px)' }}
            transition={{ width: { type: 'spring', ...SPRING }, default: FADE }}
            style={{
              position: 'relative',
              display: 'inline-block',
              height: `${CELL}em`,
              // Clips without hiding the cell's text baseline, as overflow would, so the number
              // sits on the line with the words around it.
              clipPath: 'inset(0)',
              // Digits fade as they roll out of the cell rather than being cut off at its edge, and the
              // cell is tall enough that the digits either side never show at rest.
              maskImage: `linear-gradient(to bottom, transparent, #000 ${EDGE}em, #000 calc(100% - ${EDGE}em), transparent)`,
              WebkitMaskImage: `linear-gradient(to bottom, transparent, #000 ${EDGE}em, #000 calc(100% - ${EDGE}em), transparent)`,
            }}
          >
            {char.digit === null ? (
              <span style={{ display: 'block', whiteSpace: 'pre' }}>{char.char}</span>
            ) : (
              <Wheel digit={char.digit} from={mounted.current ? 0 : char.digit} reduced={reduced} />
            )}
          </motion.span>
        ))}
      </AnimatePresence>
    </span>
  );
}

/** One digit: a column of 0 to 9 that springs to its digit, blurred by its own speed. */
function Wheel({ digit, from, reduced }: { digit: number; from: number; reduced: boolean }) {
  const position = useSpring(reduced ? digit : from, SPRING);
  useEffect(() => {
    if (reduced) position.jump(digit);
    else position.set(digit);
  }, [digit, reduced, position]);
  const y = useTransform(position, (p) => `${-p * 10}%`);
  const speed = useVelocity(position);
  const filter = useTransform(
    speed,
    (v) => `blur(${Math.min(Math.abs(v) * 0.07, 2.4).toFixed(2)}px)`,
  );
  return (
    <>
      {/* Holds the column's width; every digit is as wide as this one. */}
      <span style={{ display: 'block', visibility: 'hidden' }}>0</span>
      <motion.span
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          y,
          filter,
        }}
      >
        {DIGITS.map((n) => (
          <span key={n} style={{ height: `${CELL}em` }}>
            {n}
          </span>
        ))}
      </motion.span>
    </>
  );
}

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] as const;
