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
  ['#8e9eff', '#c8a8e8'],
  ['#78b8ff', '#8e9eff'],
  ['#ffb496', '#ff8fa3'],
  ['#5ad4a4', '#6eb8ff'],
  ['#f7bd63', '#f58b6f'],
  ['#c89bff', '#7aa4ff'],
] as const;

/** The ring's width, and the gap between it and the face. */
const RING = 1.75;
const GAP = 2;
const SPRING = { type: 'spring', stiffness: 380, damping: 28 } as const;

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
 * Who else is here. Faces overlap inside a subtle machined tray at rest; point at the stack and
 * they fan apart on a spring, and pointing at one lifts it and reveals a floating glass callout
 * card. Whoever is here now wears a luminous ring in their colour, and while they are busy that
 * ring becomes a spinner. The rest fold into a machined count pill. Each face is a focusable
 * button, so the names are there for keyboards too.
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
  const overlap = Math.round(outer * 0.3);
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
        data-open={open || undefined}
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
        style={{ '--prs-surface': surface, ...style } as CSSProperties}
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
                marginLeft: index === 0 ? 0 : open && !reduced ? 5 : -overlap,
                y: active === index && !reduced ? -4 : 0,
                scale: active === index && !reduced ? 1.05 : 1,
              }}
              transition={SPRING}
              style={{
                zIndex: active === index ? shown.length + 2 : shown.length - index,
                width: outer,
                height: outer,
                background: 'var(--prs-cut)',
                boxShadow: '0 0 0 2px var(--prs-cut), 0 6px 14px -6px rgba(15, 20, 40, 0.28)',
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
                    initial={{ opacity: 0, y: 6, scale: 0.94, filter: 'blur(4px)' }}
                    animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
                    exit={{
                      opacity: 0,
                      y: 3,
                      scale: 0.96,
                      filter: 'blur(3px)',
                      transition: { duration: 0.12 },
                    }}
                    transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <span className="lilt-prs-tip-head">
                      <span
                        className="lilt-prs-dot"
                        style={{
                          background: person.live ? accent : 'currentColor',
                          opacity: person.live ? 1 : 0.28,
                          boxShadow: person.live ? `0 0 8px ${accent}` : undefined,
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
            animate={{ marginLeft: open && !reduced ? 5 : -overlap }}
            transition={SPRING}
            style={{
              minWidth: outer,
              height: outer,
              fontSize: Math.round(size * 0.34),
              boxShadow:
                '0 0 0 2px var(--prs-cut), inset 0 1px 0 var(--prs-top), 0 6px 14px -6px rgba(15, 20, 40, 0.2)',
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
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        filter: `drop-shadow(0 0 3px color-mix(in srgb, ${colour} 45%, transparent))`,
      }}
      animate={{ rotate: spinning ? 360 : 0 }}
      transition={spinning ? { duration: 0.9, ease: 'linear', repeat: Infinity } : { duration: 0 }}
    >
      <circle cx={size / 2} cy={size / 2} r={r} opacity={spinning ? 0.24 : 0.92} />
      {spinning ? (
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeLinecap="round"
          strokeDasharray={`${around * 0.3} ${around}`}
        />
      ) : null}
    </motion.svg>
  );
}

function Face({ person, size }: { person: Person; size: number }) {
  // Whoever is not here sits back a little, so the live faces read first.
  const away = person.live ? 1 : 0.58;
  const [from, to] = coloursOf(person.name);
  return person.src ? (
    <img
      src={person.src}
      alt=""
      width={size}
      height={size}
      style={{
        display: 'block',
        borderRadius: '50%',
        objectFit: 'cover',
        opacity: away,
        boxShadow: 'inset 0 1px 0 rgb(255 255 255 / 0.3)',
      }}
    />
  ) : (
    <span
      aria-hidden="true"
      style={{
        position: 'relative',
        display: 'grid',
        placeItems: 'center',
        width: size,
        height: size,
        borderRadius: '50%',
        background: `linear-gradient(145deg, ${from}, ${to})`,
        color: '#fff',
        fontSize: Math.round(size * 0.33),
        fontWeight: 650,
        letterSpacing: '0.01em',
        opacity: away,
        boxShadow:
          'inset 0 1.5px 0 rgb(255 255 255 / 0.42), inset 0 -1.5px 2px rgb(15 20 40 / 0.16)',
        textShadow: '0 1px 2px rgb(15 20 40 / 0.18)',
      }}
    >
      {initialsOf(person.name)}
    </span>
  );
}

const css = /* css */ `
.lilt-prs {
  --prs-tray-a: rgba(255, 255, 255, 0.94);
  --prs-tray-b: rgba(240, 242, 247, 0.94);
  --prs-cut: #f6f7fa;
  --prs-ring: rgba(15, 20, 40, 0.08);
  --prs-top: rgba(255, 255, 255, 0.96);
  --prs-lip: #dfe2ea;
  --prs-drop: 0 14px 28px -14px rgba(15, 20, 40, 0.2), 0 2px 5px rgba(15, 20, 40, 0.05);
  --prs-rest-a: #ffffff;
  --prs-rest-b: #eceef4;
  --prs-tip-a: #ffffff;
  --prs-tip-b: #f3f4f8;
  --prs-tip-shadow: 0 18px 34px -12px rgba(15, 20, 40, 0.28), 0 3px 8px rgba(15, 20, 40, 0.08);
  --prs-focus: rgba(23, 23, 23, 0.28);
  display: inline-flex;
  align-items: center;
  padding: 6px 8px;
  border-radius: 999px;
  background: linear-gradient(180deg, var(--prs-tray-a), var(--prs-tray-b));
  box-shadow:
    0 0 0 1px var(--prs-ring),
    inset 0 1.5px 0 var(--prs-top),
    inset 0 -2px 0 var(--prs-lip),
    var(--prs-drop);
  -webkit-font-smoothing: antialiased;
}
:where(.dark, [data-theme="dark"]) .lilt-prs {
  --prs-tray-a: #22242c;
  --prs-tray-b: #16181e;
  --prs-cut: #1c1e25;
  --prs-ring: rgba(255, 255, 255, 0.1);
  --prs-top: rgba(255, 255, 255, 0.11);
  --prs-lip: rgba(0, 0, 0, 0.72);
  --prs-drop: 0 16px 30px -12px rgba(0, 0, 0, 0.7), 0 2px 6px rgba(0, 0, 0, 0.36);
  --prs-rest-a: #282b34;
  --prs-rest-b: #1b1d24;
  --prs-tip-a: #262933;
  --prs-tip-b: #191b22;
  --prs-tip-shadow: 0 20px 38px -12px rgba(0, 0, 0, 0.78), 0 3px 10px rgba(0, 0, 0, 0.45);
  --prs-focus: rgba(255, 255, 255, 0.32);
}
[data-theme="light"] .lilt-prs {
  --prs-tray-a: rgba(255, 255, 255, 0.94);
  --prs-tray-b: rgba(240, 242, 247, 0.94);
  --prs-cut: #f6f7fa;
  --prs-ring: rgba(15, 20, 40, 0.08);
  --prs-top: rgba(255, 255, 255, 0.96);
  --prs-lip: #dfe2ea;
  --prs-drop: 0 14px 28px -14px rgba(15, 20, 40, 0.2), 0 2px 5px rgba(15, 20, 40, 0.05);
  --prs-rest-a: #ffffff;
  --prs-rest-b: #eceef4;
  --prs-tip-a: #ffffff;
  --prs-tip-b: #f3f4f8;
  --prs-tip-shadow: 0 18px 34px -12px rgba(15, 20, 40, 0.28), 0 3px 8px rgba(15, 20, 40, 0.08);
  --prs-focus: rgba(23, 23, 23, 0.28);
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
  outline: 2px solid var(--prs-focus);
  outline-offset: 2px;
}

.lilt-prs-tip {
  position: absolute;
  bottom: calc(100% + 12px);
  left: 50%;
  translate: -50% 0;
  display: grid;
  gap: 2px;
  padding: 8px 12px;
  border-radius: 11px;
  white-space: nowrap;
  text-align: left;
  pointer-events: none;
  background: linear-gradient(180deg, var(--prs-tip-a), var(--prs-tip-b));
  box-shadow:
    0 0 0 1px var(--prs-ring),
    inset 0 1px 0 var(--prs-top),
    var(--prs-tip-shadow);
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
  font-weight: 600;
  letter-spacing: -0.01em;
}
.lilt-prs-note {
  font-size: 11.5px;
  opacity: 0.58;
  padding-left: 12px;
}
.lilt-prs-rest {
  position: relative;
  z-index: 0;
  display: grid;
  place-items: center;
  padding: 0 9px;
  border-radius: 999px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  background: linear-gradient(180deg, var(--prs-rest-a), var(--prs-rest-b));
  flex-shrink: 0;
}
`;
