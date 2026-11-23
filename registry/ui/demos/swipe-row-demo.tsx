'use client';

import { AnimatePresence, motion } from 'motion/react';
import { useState, type CSSProperties } from 'react';
import { SwipeRow } from '../swipe-row';

interface Mail {
  id: string;
  from: string;
  subject: string;
  preview: string;
  time: string;
}

const INBOX: readonly Mail[] = [
  {
    id: 'a',
    from: 'Ada Okafor',
    subject: 'The island, again',
    preview: 'Shrinking waits for the words now. Want to see it before Friday?',
    time: '9:41',
  },
  {
    id: 'b',
    from: 'Mika Tanaka',
    subject: 'Numbers that roll',
    preview: 'Only the digits that change move. It feels like a real counter.',
    time: '8:12',
  },
  {
    id: 'c',
    from: 'Noor Haddad',
    subject: 'Release notes',
    preview: 'New warm neutral surfaces across every component. Draft attached.',
    time: 'Tue',
  },
  {
    id: 'd',
    from: 'Sam Rivera',
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
  strokeWidth: 1.9,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
} as const;

/** The docs stage's rows: an inbox you can swipe clear, then bring back. */
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
                tone: '#2f7cf6',
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
                tone: '#7c5cff',
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
                  <span style={{ fontSize: 13.5, fontWeight: 500 }}>All clear</span>
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
      <motion.span
        aria-hidden="true"
        initial={false}
        animate={{ scale: unread ? 1 : 0, opacity: unread ? 1 : 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 26 }}
        className="lilt-swd-dot"
      />
      <span className="lilt-swd-from" style={{ fontWeight: unread ? 550 : 450 }}>
        {mail.from}
      </span>
      <span className="lilt-swd-time">{mail.time}</span>
      <span className="lilt-swd-sub">
        {mail.subject}
        <span className="lilt-swd-preview"> — {mail.preview}</span>
      </span>
    </div>
  );
}

const css = /* css */ `
.lilt-swd {
  --swd-panel: #f4f4f2;
  --swd-row: #ffffff;
  --swd-line: rgb(26 26 24 / 0.08);
  --swd-muted: #6b6b66;
  --swd-faint: #8c8c87;
  width: min(448px, 100%);
  padding: 6px;
  border: 1px solid var(--swd-line);
  border-radius: 14px;
  background: var(--swd-panel);
  -webkit-font-smoothing: antialiased;
}
:where(.dark, [data-theme="dark"]) .lilt-swd {
  --swd-panel: #151514;
  --swd-row: #1b1b19;
  --swd-line: rgb(244 244 242 / 0.08);
  --swd-muted: #a3a39d;
  --swd-faint: #73736e;
}
[data-theme="light"] .lilt-swd {
  --swd-panel: #f4f4f2;
  --swd-row: #ffffff;
  --swd-line: rgb(26 26 24 / 0.08);
  --swd-muted: #6b6b66;
  --swd-faint: #8c8c87;
}

.lilt-swd-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 8px 8px;
}
.lilt-swd-title {
  font-size: 13px;
  font-weight: 500;
  letter-spacing: -0.01em;
}
.lilt-swd-badge {
  color: var(--swd-faint);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}
.lilt-swd-list {
  border: 1px solid var(--swd-line);
  border-radius: 10px;
  overflow: hidden;
  background: var(--swd-row);
}
.lilt-swd-row {
  display: grid;
  grid-template-columns: 7px minmax(0, 1fr) auto;
  column-gap: 10px;
  row-gap: 2px;
  padding: 12px 16px 13px 12px;
  user-select: none;
}
.lilt-swd-dot {
  align-self: center;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #2f7cf6;
}
.lilt-swd-from {
  font-size: 13.5px;
  letter-spacing: -0.01em;
}
.lilt-swd-time {
  color: var(--swd-faint);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}
.lilt-swd-sub {
  grid-column: 2 / 4;
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.lilt-swd-preview {
  color: var(--swd-muted);
}
.lilt-swd-empty {
  display: grid;
  justify-items: center;
  gap: 10px;
  padding: 34px 0;
}
.lilt-swd-reset {
  height: 30px;
  padding: 0 12px;
  border: 1px solid var(--swd-line);
  border-radius: 8px;
  background: var(--swd-panel);
  color: inherit;
  font: inherit;
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;
}
`;
