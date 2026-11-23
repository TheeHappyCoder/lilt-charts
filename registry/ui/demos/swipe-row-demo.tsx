'use client';

import { AnimatePresence, motion } from 'motion/react';
import { useState, type CSSProperties } from 'react';
import { SwipeRow } from '../swipe-row';

interface Mail {
  id: string;
  from: string;
  initials: string;
  tint: readonly [string, string];
  subject: string;
  preview: string;
  time: string;
}

const INBOX: readonly Mail[] = [
  {
    id: 'a',
    from: 'Ada Okafor',
    initials: 'AO',
    tint: ['#8e9eff', '#c8a8e8'],
    subject: 'The island, again',
    preview: 'Shrinking waits for the words now. Want to see it before Friday?',
    time: '9:41',
  },
  {
    id: 'b',
    from: 'Mika Tanaka',
    initials: 'MT',
    tint: ['#78b8ff', '#8e9eff'],
    subject: 'Numbers that roll',
    preview: 'Only the digits that change move. It feels like a real counter.',
    time: '8:12',
  },
  {
    id: 'c',
    from: 'Noor Haddad',
    initials: 'NH',
    tint: ['#ffb496', '#ff8fa3'],
    subject: 'Release notes',
    preview: 'New machined finishes across every component. Draft attached.',
    time: 'Tue',
  },
  {
    id: 'd',
    from: 'Sam Rivera',
    initials: 'SR',
    tint: ['#5ad4a4', '#6eb8ff'],
    subject: 'Hold to delete',
    preview: 'The fill starts at the edge now. Thanks for catching it.',
    time: 'Mon',
  },
];

const icon = {
  width: 17,
  height: 17,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
} as const;

/** The docs stage's rows: a machined inbox you can swipe clear, then bring back. */
export function SwipeRowDemo({
  threshold,
  surface = 'Canvas',
  style,
}: {
  threshold?: number;
  surface?: string;
  style?: CSSProperties;
}) {
  const [mail, setMail] = useState(INBOX);
  const [unread, setUnread] = useState<ReadonlySet<string>>(new Set(['a', 'b']));
  const unreadCount = mail.filter((m) => unread.has(m.id)).length;
  const rowBg = 'var(--swd-row)';

  return (
    <>
      <style href="lilt-ui-swipe-row-demo" precedence="default">
        {css}
      </style>
      <div className="lilt-swd" style={{ '--swd-fallback': surface, ...style } as CSSProperties}>
        <span className="lilt-swd-pool" aria-hidden="true" />
        <div className="lilt-swd-head">
          <span className="lilt-swd-title">Inbox</span>
          <span className="lilt-swd-badge">{unreadCount} unread</span>
        </div>
        <div className="lilt-swd-list">
          {mail.map((item, index) => (
            <SwipeRow
              key={item.id}
              threshold={threshold}
              surface={rowBg}
              start={{
                label: unread.has(item.id) ? 'Read' : 'Unread',
                tone: '#4e8eff',
                dismiss: false,
                icon: (
                  <svg {...icon}>
                    <rect x="3" y="5" width="18" height="14" rx="2.5" />
                    <path d="M3.5 7l8.5 6 8.5-6" />
                  </svg>
                ),
                onAction: () =>
                  setUnread((current) => {
                    const next = new Set(current);
                    if (!next.delete(item.id)) next.add(item.id);
                    return next;
                  }),
              }}
              end={{
                label: 'Archive',
                tone: '#8e7dff',
                icon: (
                  <svg {...icon}>
                    <rect x="3" y="4" width="18" height="5" rx="1.5" />
                    <path d="M5 9v9a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9M10 13h4" />
                  </svg>
                ),
                onAction: () => setMail((current) => current.filter((m) => m.id !== item.id)),
              }}
              style={{
                borderTop: index === 0 ? undefined : '1px solid var(--swd-line)',
              }}
            >
              <Row mail={item} unread={unread.has(item.id)} />
            </SwipeRow>
          ))}
          <AnimatePresence>
            {mail.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, height: 0, filter: 'blur(6px)' }}
                animate={{ opacity: 1, height: 'auto', filter: 'blur(0px)' }}
                exit={{ opacity: 0, height: 0, filter: 'blur(6px)' }}
                transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
                style={{ overflow: 'hidden' }}
              >
                <div className="lilt-swd-empty">
                  <span style={{ fontSize: 14, fontWeight: 600 }}>All clear</span>
                  <button
                    type="button"
                    onClick={() => {
                      setMail(INBOX);
                      setUnread(new Set(['a', 'b']));
                    }}
                    className="lilt-swd-reset"
                  >
                    Bring them back
                  </button>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </>
  );
}

function Row({ mail, unread }: { mail: Mail; unread: boolean }) {
  return (
    <div className="lilt-swd-row">
      <span
        aria-hidden="true"
        className="lilt-swd-avatar"
        style={{ background: `linear-gradient(145deg, ${mail.tint[0]}, ${mail.tint[1]})` }}
      >
        {mail.initials}
        <motion.span
          initial={false}
          animate={{ scale: unread ? 1 : 0, opacity: unread ? 1 : 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 26 }}
          className="lilt-swd-unread"
        />
      </span>
      <span className="lilt-swd-copy">
        <span className="lilt-swd-top">
          <span style={{ fontSize: 13.5, fontWeight: unread ? 600 : 500 }}>{mail.from}</span>
          <span className="lilt-swd-time">{mail.time}</span>
        </span>
        <span className="lilt-swd-sub">
          {mail.subject}
          <span style={{ opacity: 0.52 }}> — {mail.preview}</span>
        </span>
      </span>
    </div>
  );
}

const css = /* css */ `
.lilt-swd {
  --swd-a: #ffffff;
  --swd-b: #f1f2f6;
  --swd-ring: rgba(15, 20, 40, 0.085);
  --swd-top: #ffffff;
  --swd-lip: #dde0e8;
  --swd-drop: 0 22px 40px -18px rgba(15, 20, 40, 0.24), 0 3px 8px rgba(15, 20, 40, 0.06);
  --swd-row: #ffffff;
  --swd-line: rgba(15, 20, 40, 0.07);
  --swd-badge-bg: rgba(15, 20, 40, 0.05);
  --swd-list-ring: rgba(15, 20, 40, 0.06);
  position: relative;
  width: min(456px, 100%);
  padding: 8px;
  border-radius: 18px;
  background: linear-gradient(180deg, var(--swd-a), var(--swd-b));
  box-shadow:
    0 0 0 1px var(--swd-ring),
    inset 0 1.5px 0 var(--swd-top),
    inset 0 -2.5px 0 var(--swd-lip),
    var(--swd-drop);
  isolation: isolate;
  -webkit-font-smoothing: antialiased;
}
:where(.dark, [data-theme="dark"]) .lilt-swd {
  --swd-a: #22242c;
  --swd-b: #16181f;
  --swd-ring: rgba(255, 255, 255, 0.1);
  --swd-top: rgba(255, 255, 255, 0.11);
  --swd-lip: rgba(0, 0, 0, 0.78);
  --swd-drop: 0 24px 46px -18px rgba(0, 0, 0, 0.78), 0 3px 10px rgba(0, 0, 0, 0.42);
  --swd-row: #181a21;
  --swd-line: rgba(255, 255, 255, 0.07);
  --swd-badge-bg: rgba(255, 255, 255, 0.07);
  --swd-list-ring: rgba(255, 255, 255, 0.07);
}
[data-theme="light"] .lilt-swd {
  --swd-a: #ffffff;
  --swd-b: #f1f2f6;
  --swd-ring: rgba(15, 20, 40, 0.085);
  --swd-top: #ffffff;
  --swd-lip: #dde0e8;
  --swd-drop: 0 22px 40px -18px rgba(15, 20, 40, 0.24), 0 3px 8px rgba(15, 20, 40, 0.06);
  --swd-row: #ffffff;
  --swd-line: rgba(15, 20, 40, 0.07);
  --swd-badge-bg: rgba(15, 20, 40, 0.05);
  --swd-list-ring: rgba(15, 20, 40, 0.06);
}

.lilt-swd-pool {
  position: absolute;
  left: 14%;
  right: 14%;
  bottom: -14px;
  height: 30px;
  border-radius: 50%;
  background: linear-gradient(90deg, #78b8ff, #8e7dff 55%, #c8a8e8);
  filter: blur(20px);
  opacity: 0.28;
  pointer-events: none;
  z-index: -1;
}
.lilt-swd-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 8px 9px;
}
.lilt-swd-title {
  font-size: 12.5px;
  font-weight: 600;
  letter-spacing: -0.01em;
}
.lilt-swd-badge {
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--swd-badge-bg);
  font-size: 11px;
  font-weight: 550;
  font-variant-numeric: tabular-nums;
  opacity: 0.68;
}
.lilt-swd-list {
  border-radius: 12px;
  overflow: hidden;
  background: var(--swd-row);
  box-shadow: 0 0 0 1px var(--swd-list-ring);
}
.lilt-swd-row {
  display: grid;
  grid-template-columns: 32px minmax(0, 1fr);
  align-items: center;
  column-gap: 11px;
  padding: 12px 14px;
  user-select: none;
}
.lilt-swd-avatar {
  position: relative;
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  color: #ffffff;
  font-size: 11px;
  font-weight: 650;
  box-shadow: inset 0 1.5px 0 rgba(255, 255, 255, 0.4), 0 2px 6px -2px rgba(15, 20, 40, 0.24);
  text-shadow: 0 1px 2px rgba(15, 20, 40, 0.2);
}
.lilt-swd-unread {
  position: absolute;
  top: -1px;
  right: -1px;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #4e8eff;
  box-shadow: 0 0 0 2px var(--swd-row), 0 0 8px rgba(78, 142, 255, 0.7);
}
.lilt-swd-copy {
  display: grid;
  gap: 2px;
  min-width: 0;
}
.lilt-swd-top {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}
.lilt-swd-time {
  font-size: 11.5px;
  opacity: 0.46;
  font-variant-numeric: tabular-nums;
}
.lilt-swd-sub {
  font-size: 12.5px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.lilt-swd-empty {
  display: grid;
  justify-items: center;
  gap: 10px;
  padding: 36px 0;
}
.lilt-swd-reset {
  height: 32px;
  padding: 0 14px;
  border: 0;
  border-radius: 9px;
  background: linear-gradient(180deg, var(--swd-a), var(--swd-b));
  box-shadow:
    0 0 0 1px var(--swd-ring),
    inset 0 1px 0 var(--swd-top),
    0 4px 10px -4px rgba(15, 20, 40, 0.2);
  color: inherit;
  font: inherit;
  font-size: 12.5px;
  font-weight: 550;
  cursor: pointer;
}
`;
