'use client';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useState, type CSSProperties } from 'react';

export interface Person {
  name: string;
  /** A photo. Without one the avatar shows initials on a tone picked from the name. */
  src?: string;
  /** Here right now: a thin ring in their colour. Everyone else sits back a little. */
  live?: boolean;
  /** Working on something, such as typing or uploading: their ring becomes a spinner. */
  busy?: boolean;
  /** A short line under the name, such as 'Editing the intro'. */
  note?: string;
}

export interface PresenceProps {
  /** Who is here, most relevant first. Default six people, three of them live. */
  people?: readonly Person[];
  /** Faces shown before the rest fold into a count. Default 4. */
  max?: number;
  /** Avatar size in pixels. Default 34. */
  size?: number;
  /** The colour behind the stack, which cuts each face out of the one under it. Default 'Canvas'. */
  surface?: string;
  className?: string;
  style?: CSSProperties;
}

const DEFAULT_PEOPLE: readonly Person[] = [
  { name: 'Ada Okafor', live: true, busy: true, note: 'Editing the intro' },
  { name: 'Mika Tanaka', live: true, note: 'Viewing' },
  { name: 'Noor Haddad', live: true, note: 'Commenting' },
  { name: 'Sam Rivera', note: 'Here 5 minutes ago' },
  { name: 'Jonas Berg', note: 'Here yesterday' },
  { name: 'Lea Moreau', note: 'Here last week' },
];

const PALETTE = [
  ['#7c5cff', '#6546e0'],
  ['#2f7cf6', '#2160c9'],
  ['#2d8a4e', '#216e3d'],
  ['#c2701c', '#a35b12'],
  ['#c74277', '#a63260'],
  ['#5b6478', '#424959'],
] as const;

/** The ring's width, and the gap between it and the face. */
const RING = 1.5;
const GAP = 1.5;
const SPRING = { type: 'spring', stiffness: 380, damping: 30 } as const;

/** The same colours for the same name, every time. */
function coloursOf(name: string) {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return PALETTE[hash % PALETTE.length]!;
}

const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

/**
 * Who else is here. Faces overlap at rest; point at the stack and they fan apart on a spring, and
 * pointing at one lifts it and names them. Whoever is here now wears a thin ring in their colour,
 * and while they are busy that ring becomes a spinner, a faint track with an arc running round it.
 * The rest fold into a count. Each face is a focusable button, so the names are there for
 * keyboards too.
 */
export function Presence({
  people = DEFAULT_PEOPLE,
  max = 4,
  size = 34,
  surface = 'Canvas',
  className,
  style,
}: PresenceProps) {
  const reduced = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<number | null>(null);
  const shown = people.slice(0, max);
  const rest = people.length - shown.length;
  const outer = size + (RING + GAP) * 2;
  const overlap = Math.round(outer * 0.32);
  const live = people.filter((person) => person.live).length;

  return (
    <>
      <style href="lilt-ui-presence" precedence="default">
        {css}
      </style>
      <div
        role="group"
        aria-label={`${people.length} people, ${live} here now`}
        className={['lilt-prs', className].filter(Boolean).join(' ')}
        onPointerEnter={() => setOpen(true)}
        onPointerLeave={() => {
          setOpen(false);
          setActive(null);
        }}
        onFocus={() => setOpen(true)}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) {
            setOpen(false);
            setActive(null);
          }
        }}
        style={style}
      >
        {shown.map((person, index) => {
          const [accent] = coloursOf(person.name);
          return (
            <motion.button
              key={person.name}
              type="button"
              className="lilt-prs-btn"
              aria-label={`${person.name}${person.live ? ', here now' : ''}${person.note ? `. ${person.note}` : ''}`}
              onPointerEnter={() => setActive(index)}
              onFocus={() => setActive(index)}
              initial={false}
              animate={{
                marginLeft: index === 0 ? 0 : open && !reduced ? 4 : -overlap,
                y: active === index && !reduced ? -3 : 0,
              }}
              transition={SPRING}
              style={{
                zIndex: active === index ? shown.length + 2 : shown.length - index,
                width: outer,
                height: outer,
                background: surface,
                boxShadow: `0 0 0 2px ${surface}`,
              }}
            >
              <Face person={person} size={size} />
              {person.live ? (
                <Ring
                  size={outer}
                  colour={accent}
                  busy={Boolean(person.busy)}
                  reduced={Boolean(reduced)}
                />
              ) : null}
              <AnimatePresence>
                {active === index ? (
                  <motion.span
                    aria-hidden="true"
                    className="lilt-prs-tip"
                    initial={{ opacity: 0, y: 4, filter: 'blur(3px)' }}
                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, y: 2, filter: 'blur(3px)', transition: { duration: 0.12 } }}
                    transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <span className="lilt-prs-tip-head">
                      <span
                        className="lilt-prs-dot"
                        style={{
                          background: person.live ? accent : 'currentColor',
                          opacity: person.live ? 1 : 0.28,
                        }}
                      />
                      <span className="lilt-prs-name">{person.name}</span>
                    </span>
                    {person.note ? <span className="lilt-prs-note">{person.note}</span> : null}
                  </motion.span>
                ) : null}
              </AnimatePresence>
            </motion.button>
          );
        })}
        {rest > 0 ? (
          <motion.span
            aria-hidden="true"
            className="lilt-prs-rest"
            initial={false}
            animate={{ marginLeft: open && !reduced ? 4 : -overlap }}
            transition={SPRING}
            style={{
              minWidth: outer,
              height: outer,
              fontSize: Math.round(size * 0.34),
              boxShadow: `0 0 0 2px ${surface}`,
            }}
          >
            +{rest}
          </motion.span>
        ) : null}
      </div>
    </>
  );
}

/**
 * A thin ring round the face. While busy it is a spinner instead: a faint track with an arc
 * running round it, in the same place, so nothing shifts when the work starts or stops.
 */
function Ring({
  size,
  colour,
  busy,
  reduced,
}: {
  size: number;
  colour: string;
  busy: boolean;
  reduced: boolean;
}) {
  const r = (size - RING) / 2;
  const around = 2 * Math.PI * r;
  const spinning = busy && !reduced;
  return (
    <motion.svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      fill="none"
      stroke={colour}
      strokeWidth={RING}
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
      animate={{ rotate: spinning ? 360 : 0 }}
      transition={spinning ? { duration: 0.85, ease: 'linear', repeat: Infinity } : { duration: 0 }}
    >
      <circle cx={size / 2} cy={size / 2} r={r} opacity={spinning ? 0.24 : 0.9} />
      {spinning ? (
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeLinecap="round"
          strokeDasharray={`${around * 0.28} ${around}`}
        />
      ) : null}
    </motion.svg>
  );
}

function Face({ person, size }: { person: Person; size: number }) {
  // Whoever is not here sits back a little, so the live faces read first.
  const away = person.live ? 1 : 0.56;
  const [from, to] = coloursOf(person.name);
  return person.src ? (
    <img
      src={person.src}
      alt=""
      width={size}
      height={size}
      style={{ display: 'block', borderRadius: '50%', objectFit: 'cover', opacity: away }}
    />
  ) : (
    <span
      aria-hidden="true"
      style={{
        display: 'grid',
        placeItems: 'center',
        width: size,
        height: size,
        borderRadius: '50%',
        background: `linear-gradient(180deg, ${from}, ${to})`,
        color: '#fff',
        fontSize: Math.round(size * 0.33),
        fontWeight: 550,
        letterSpacing: '0.01em',
        opacity: away,
      }}
    >
      {initialsOf(person.name)}
    </span>
  );
}

const css = /* css */ `
.lilt-prs {
  --prs-rest: #f4f4f2;
  --prs-tip: #ffffff;
  --prs-line: rgb(26 26 24 / 0.1);
  --prs-muted: #6b6b66;
  --prs-pop: 0 12px 32px rgb(26 26 24 / 0.1);
  --prs-ring: #7c5cff;
  display: inline-flex;
  align-items: center;
  padding: 4px;
  -webkit-font-smoothing: antialiased;
}
:where(.dark, [data-theme="dark"]) .lilt-prs {
  --prs-rest: #1e1e1c;
  --prs-tip: #181817;
  --prs-line: rgb(244 244 242 / 0.1);
  --prs-muted: #a3a39d;
  --prs-pop: 0 14px 36px rgb(0 0 0 / 0.45);
  --prs-ring: #9a82ff;
}
[data-theme="light"] .lilt-prs {
  --prs-rest: #f4f4f2;
  --prs-tip: #ffffff;
  --prs-line: rgb(26 26 24 / 0.1);
  --prs-muted: #6b6b66;
  --prs-pop: 0 12px 32px rgb(26 26 24 / 0.1);
  --prs-ring: #7c5cff;
}

.lilt-prs-btn {
  position: relative;
  display: grid;
  place-items: center;
  padding: 0;
  border: 0;
  border-radius: 50%;
  color: inherit;
  font: inherit;
  cursor: pointer;
  flex-shrink: 0;
  outline: none;
}
.lilt-prs-btn:focus-visible {
  outline: 2px solid var(--prs-ring);
  outline-offset: 2px;
}

.lilt-prs-tip {
  position: absolute;
  bottom: calc(100% + 10px);
  left: 50%;
  translate: -50% 0;
  display: grid;
  gap: 2px;
  padding: 7px 11px;
  border: 1px solid var(--prs-line);
  border-radius: 10px;
  white-space: nowrap;
  text-align: left;
  pointer-events: none;
  background: var(--prs-tip);
  box-shadow: var(--prs-pop);
}
.lilt-prs-tip-head {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.lilt-prs-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}
.lilt-prs-name {
  font-size: 12.5px;
  font-weight: 500;
  letter-spacing: -0.01em;
}
.lilt-prs-note {
  padding-left: 12px;
  color: var(--prs-muted);
  font-size: 11.5px;
}
.lilt-prs-rest {
  position: relative;
  z-index: 0;
  display: grid;
  place-items: center;
  padding: 0 8px;
  border: 1px solid var(--prs-line);
  border-radius: 999px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  background: var(--prs-rest);
  flex-shrink: 0;
}
`;
