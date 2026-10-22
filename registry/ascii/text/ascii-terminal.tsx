'use client';

import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { VISUALLY_HIDDEN, frame, rand, useReducedMotion, useSeen } from './text-kit';

export interface AsciiTerminalProps {
  /**
   * The session, a line each. Lines starting with `$ ` are commands, typed out at `speed`; the
   * rest are their output and appear at once. An empty string is a blank line.
   */
  lines?: readonly string[];
  /** Characters typed per second. Default 32. */
  speed?: number;
  /** Start over a few seconds after the last line. Default false. */
  loop?: boolean;
  /** What the prompt shows before each command. Default '$'. */
  prompt?: string;
  /** Colour of the prompt and of ticks in the output. Default '#7c5cff'. */
  accent?: string;
  /** Text in the window's title bar. Default 'zsh'. */
  title?: string;
  className?: string;
  style?: CSSProperties;
}

export const DEFAULT_TERMINAL_LINES: readonly string[] = [
  '$ pnpm dlx shadcn@latest add https://liltui.vercel.app/r/terminal.json',
  '✔ Checking registry.',
  '✔ Created 2 files:',
  '  - components/lilt/ascii/text/ascii-terminal.tsx',
  '  - components/lilt/ascii/text/text-kit.ts',
  '',
  '$ pnpm dev',
  '✓ Ready in 812ms on http://localhost:3000',
];

const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace';
/** Pauses in the session, in seconds. */
const THINK = 0.45;
const ENTER = 0.35;
const OUTPUT_GAP = 0.06;
const HOLD = 3.5;
const BLINK = 0.53;

interface Step {
  command: boolean;
  /** What is shown: a command without its `$ ` marker, or the output line. */
  body: string;
  /** When the line appears, and for commands when typing starts and ends. */
  show: number;
  typeStart: number;
  /** Seconds at which each character lands, for commands. */
  keys: number[];
  done: number;
}

/** The session as a timeline: when each line shows, and each keystroke of each command. */
function plan(lines: readonly string[], speed: number) {
  const steps: Step[] = [];
  let t = 0.3;
  lines.forEach((line, i) => {
    const command = line.startsWith('$ ');
    const body = command ? line.slice(2) : line;
    if (!command) {
      t += i > 0 && steps[i - 1]?.command ? ENTER : OUTPUT_GAP;
      steps.push({ command, body, show: t, typeStart: t, keys: [], done: t });
      return;
    }
    // The prompt shows as soon as the last output is in; a beat later, typing starts.
    const show = i > 0 ? t + OUTPUT_GAP : t;
    const typeStart = show + THINK;
    let at = typeStart;
    const keys = Array.from(body).map((ch, k) => {
      // People type unevenly: a little faster mid-word, slower after a space.
      const gap = (1 / speed) * (0.55 + rand(i, k, 5) * 0.9) * (ch === ' ' ? 1.6 : 1);
      at += gap;
      return at;
    });
    t = at;
    steps.push({ command, body, show, typeStart, keys, done: at });
  });
  return { steps, end: t + 0.2 };
}

/** How much of each line shows at a moment: -1 not yet, else the characters typed. */
function progress(steps: Step[], time: number) {
  return steps.map((step) => {
    if (time < step.show) return -1;
    if (!step.command) return step.body.length;
    let typed = 0;
    while (typed < step.keys.length && step.keys[typed]! <= time) typed++;
    return typed;
  });
}

/**
 * A terminal window that types out a session: commands key by key behind a blinking block cursor,
 * their output at once. The window keeps the size of the finished session from the start, so the
 * page never shifts. Screen readers get the whole session as text.
 */
export function AsciiTerminal({
  lines = DEFAULT_TERMINAL_LINES,
  speed = 32,
  loop = false,
  prompt = '$',
  accent = '#7c5cff',
  title = 'zsh',
  className,
  style,
}: AsciiTerminalProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const seen = useSeen(ref, !reduced);
  // Keyed by content, so a new array with the same lines on each render does not start over.
  const session = JSON.stringify(lines);
  const { steps, end } = useMemo(
    () => plan(JSON.parse(session) as string[], Math.max(1, speed)),
    [session, speed],
  );
  const [time, setTime] = useState(0);
  const finished = reduced || time >= end;

  // The session's clock, from when it is first seen. Re-renders only when something visible
  // changes: a keystroke, a new line, or the cursor's blink.
  useEffect(() => {
    if (reduced || !seen) return;
    let start = -1;
    let last = '';
    let cancel = () => undefined as void;
    const tick = (nowMs: number) => {
      const now = nowMs / 1000;
      if (start < 0) start = now;
      let t = now - start;
      if (loop && t > end + HOLD) {
        start = now;
        t = 0;
      }
      const key = `${progress(steps, t).join()}|${Math.floor(t / BLINK) % 2}|${t >= end}`;
      if (key !== last) {
        last = key;
        setTime(t);
      }
      cancel = frame(tick);
    };
    cancel = frame(tick);
    return () => cancel();
  }, [reduced, seen, steps, end, loop]);

  const shown = reduced ? steps.map((s) => s.body.length) : progress(steps, time);
  // The cursor sits on the line being typed, else on a fresh prompt after the last line.
  let cursorLine = steps.length;
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i]!;
    if (
      step.command &&
      shown[i]! >= 0 &&
      (shown[i]! < step.body.length || time < step.done + ENTER)
    ) {
      cursorLine = i;
    }
  }
  if (finished) cursorLine = steps.length;
  // Steady while keys are going in, blinking while it waits.
  const typing =
    !finished &&
    cursorLine < steps.length &&
    time >= steps[cursorLine]!.typeStart &&
    shown[cursorLine]! < steps[cursorLine]!.body.length;
  const cursorOn = reduced || typing || Math.floor(time / BLINK) % 2 === 0;

  const cursor = (
    <span
      style={{
        display: 'inline-block',
        width: '0.62em',
        height: '1.2em',
        marginLeft: 1,
        verticalAlign: '-0.22em',
        background: 'currentColor',
        opacity: cursorOn ? 0.85 : 0,
      }}
    />
  );
  const promptMark = (
    <span style={{ color: accent, fontWeight: 600, marginRight: '1ch' }}>{prompt}</span>
  );

  return (
    <div
      ref={ref}
      className={className}
      role="group"
      aria-label={title ? `Terminal: ${title}` : 'Terminal'}
      style={{
        boxSizing: 'border-box',
        width: 'min(100%, 44em)',
        fontFamily: MONO,
        fontSize: '0.875em',
        lineHeight: 1.6,
        textAlign: 'left',
        borderRadius: 12,
        border: '1px solid color-mix(in srgb, currentColor 14%, transparent)',
        background: 'color-mix(in srgb, currentColor 4%, transparent)',
        boxShadow: '0 24px 56px -36px rgba(0, 0, 0, 0.45)',
        overflow: 'hidden',
        ...style,
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          height: '2.4em',
          padding: '0 14px',
          borderBottom: '1px solid color-mix(in srgb, currentColor 10%, transparent)',
        }}
      >
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            style={{
              width: 11,
              height: 11,
              borderRadius: '50%',
              background: 'color-mix(in srgb, currentColor 18%, transparent)',
            }}
          />
        ))}
        <span
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            textAlign: 'center',
            fontSize: '0.92em',
            opacity: 0.5,
          }}
        >
          {title}
        </span>
      </div>
      <pre style={VISUALLY_HIDDEN}>{lines.join('\n')}</pre>
      <div aria-hidden="true" style={{ padding: '14px 18px 16px', margin: 0 }}>
        {steps.map((step, i) => {
          const count = shown[i]!;
          const visible = count >= 0;
          const typed = step.body.slice(0, Math.max(0, count));
          const rest = step.body.slice(Math.max(0, count));
          return (
            <div
              key={i}
              style={{
                whiteSpace: 'pre-wrap',
                overflowWrap: 'anywhere',
                minHeight: '1.6em',
                visibility: visible ? 'visible' : 'hidden',
                color: step.command
                  ? undefined
                  : 'color-mix(in srgb, currentColor 62%, transparent)',
              }}
            >
              {step.command && promptMark}
              {step.command ? typed : <Output text={step.body} accent={accent} />}
              {i === cursorLine && cursor}
              {/* The rest of the line holds its space, so wrapping never jumps. */}
              {step.command && rest && <span style={{ visibility: 'hidden' }}>{rest}</span>}
            </div>
          );
        })}
        <div
          style={{
            minHeight: '1.6em',
            visibility: cursorLine === steps.length ? 'visible' : 'hidden',
          }}
        >
          {promptMark}
          {cursorLine === steps.length && cursor}
        </div>
      </div>
    </div>
  );
}

/** An output line; a leading tick or plus takes the accent, as tools colour them. */
function Output({ text, accent }: { text: string; accent: string }) {
  const mark = text.match(/^(✓|✔|\+)(?= )/)?.[0];
  if (!mark) return <>{text}</>;
  return (
    <>
      <span style={{ color: accent }}>{mark}</span>
      {text.slice(mark.length)}
    </>
  );
}
