'use client';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useState, type CSSProperties } from 'react';

export interface Person {
  name: string;
  /** A photo. Without one the avatar shows initials on a gradient picked from the name. */
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

const GRADIENTS = [
  ['#8b6cff', '#e5489c'],
  ['#2fb8ff', '#6c5cff'],
  ['#ff8a4c', '#ff4c7d'],
  ['#3ecf8e', '#2fb8ff'],
  ['#f5b544', '#ff6a3d'],
  ['#c86cff', '#5c8bff'],
] as const;

/** The ring's width, and the gap between it and the face. */
const RING = 1.5;
const GAP = 1.5;
const SPRING = { type: 'spring', stiffness: 380, damping: 30 } as const;

/** The same colours for the same name, every time. */
function coloursOf(name: string) {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return GRADIENTS[hash % GRADIENTS.length]!;
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
 * and while they are busy that ring becomes a spinner, a faint track with an arc running round
 * it. The rest fold into a count. Each face is a focusable button, so the names are there for
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
    <div
      role="group"
      aria-label={`${people.length} people, ${live} here now`}
      className={className}
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
      style={{ display: 'inline-flex', alignItems: 'center', padding: 4, ...style }}
    >
      {shown.map((person, index) => (
        <motion.button
          key={person.name}
          type="button"
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
            position: 'relative',
            zIndex: active === index ? shown.length + 1 : shown.length - index,
            display: 'grid',
            placeItems: 'center',
            width: outer,
            height: outer,
            padding: 0,
            border: 0,
            borderRadius: '50%',
            // The surface behind each face cuts it out of the one beneath.
            background: surface,
            boxShadow: `0 0 0 1.5px ${surface}`,
            color: 'inherit',
            font: 'inherit',
            cursor: 'default',
            flexShrink: 0,
          }}
        >
          <Face person={person} size={size} />
          {person.live ? (
            <Ring
              size={outer}
              colour={coloursOf(person.name)[0]}
              busy={Boolean(person.busy)}
              reduced={Boolean(reduced)}
            />
          ) : null}
          <AnimatePresence>
            {active === index ? (
              <motion.span
                aria-hidden="true"
                initial={{ opacity: 0, y: 4, filter: 'blur(4px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: 2, filter: 'blur(3px)', transition: { duration: 0.12 } }}
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                style={{
                  position: 'absolute',
                  bottom: 'calc(100% + 10px)',
                  left: '50%',
                  translate: '-50% 0',
                  display: 'grid',
                  gap: 1,
                  padding: '6px 10px',
                  borderRadius: 8,
                  whiteSpace: 'nowrap',
                  textAlign: 'left',
                  pointerEvents: 'none',
                  background: `color-mix(in srgb, ${surface} 90%, currentColor)`,
                  border: '1px solid color-mix(in srgb, currentColor 12%, transparent)',
                  boxShadow: '0 12px 32px -14px rgb(0 0 0 / 0.5)',
                }}
              >
                <span style={{ fontSize: 12.5, fontWeight: 600 }}>{person.name}</span>
                {person.note ? (
                  <span style={{ fontSize: 11.5, opacity: 0.6 }}>{person.note}</span>
                ) : null}
              </motion.span>
            ) : null}
          </AnimatePresence>
        </motion.button>
      ))}
      {rest > 0 ? (
        <motion.span
          aria-hidden="true"
          initial={false}
          animate={{ marginLeft: open && !reduced ? 4 : -overlap }}
          transition={SPRING}
          style={{
            display: 'grid',
            placeItems: 'center',
            minWidth: outer,
            height: outer,
            padding: '0 8px',
            borderRadius: 999,
            fontSize: Math.round(size * 0.34),
            fontWeight: 600,
            fontVariantNumeric: 'tabular-nums',
            background: `color-mix(in srgb, ${surface} 88%, currentColor)`,
            boxShadow: `0 0 0 1.5px ${surface}`,
            flexShrink: 0,
          }}
        >
          +{rest}
        </motion.span>
      ) : null}
    </div>
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
      transition={spinning ? { duration: 0.8, ease: 'linear', repeat: Infinity } : { duration: 0 }}
    >
      <circle cx={size / 2} cy={size / 2} r={r} opacity={spinning ? 0.25 : 1} />
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
  const away = person.live ? 1 : 0.62;
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
        background: `linear-gradient(135deg, ${from}, ${to})`,
        color: '#fff',
        fontSize: Math.round(size * 0.34),
        fontWeight: 600,
        letterSpacing: '0.01em',
        opacity: away,
        boxShadow: 'inset 0 1px 0 rgb(255 255 255 / 0.22)',
      }}
    >
      {initialsOf(person.name)}
    </span>
  );
}
