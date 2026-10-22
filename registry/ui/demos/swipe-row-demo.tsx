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
    preview: 'Six new components, and nothing pulses. Draft attached.',
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
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
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
  const card = `color-mix(in srgb, ${surface} 96%, currentColor)`;

  return (
    <div
      style={{
        width: 'min(440px, 100%)',
        borderRadius: 14,
        border: '1px solid color-mix(in srgb, currentColor 11%, transparent)',
        background: card,
        boxShadow:
          'inset 0 1px 0 color-mix(in srgb, currentColor 6%, transparent), 0 1px 2px rgb(0 0 0 / 0.16)',
        overflow: 'hidden',
        ...style,
      }}
    >
      {mail.map((item, index) => (
        <SwipeRow
          key={item.id}
          threshold={threshold}
          surface={card}
          start={{
            label: unread.has(item.id) ? 'Read' : 'Unread',
            tone: '#2f8bff',
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
            tone: '#8b6cff',
            icon: (
              <svg {...icon}>
                <rect x="3" y="4" width="18" height="5" rx="1.5" />
                <path d="M5 9v9a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9M10 13h4" />
              </svg>
            ),
            onAction: () => setMail((current) => current.filter((m) => m.id !== item.id)),
          }}
          style={{
            borderTop:
              index === 0
                ? undefined
                : '1px solid color-mix(in srgb, currentColor 8%, transparent)',
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
            <div style={{ display: 'grid', justifyItems: 'center', gap: 10, padding: '34px 0' }}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>All clear</span>
              <button
                type="button"
                onClick={() => {
                  setMail(INBOX);
                  setUnread(new Set(['a', 'b']));
                }}
                style={{
                  height: 30,
                  padding: '0 12px',
                  borderRadius: 8,
                  border: '1px solid color-mix(in srgb, currentColor 13%, transparent)',
                  background: 'color-mix(in srgb, currentColor 6%, transparent)',
                  color: 'inherit',
                  font: 'inherit',
                  fontSize: 12.5,
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Bring them back
              </button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function Row({ mail, unread }: { mail: Mail; unread: boolean }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '8px minmax(0, 1fr) auto',
        columnGap: 10,
        rowGap: 2,
        padding: '13px 18px 14px 12px',
        userSelect: 'none',
      }}
    >
      <motion.span
        aria-hidden="true"
        initial={false}
        animate={{ scale: unread ? 1 : 0, opacity: unread ? 1 : 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 26 }}
        style={{
          alignSelf: 'center',
          width: 7,
          height: 7,
          borderRadius: '50%',
          background: '#2f8bff',
        }}
      />
      <span style={{ fontSize: 13.5, fontWeight: unread ? 600 : 500 }}>{mail.from}</span>
      <span style={{ fontSize: 12, opacity: 0.45, fontVariantNumeric: 'tabular-nums' }}>
        {mail.time}
      </span>
      <span
        style={{
          gridColumn: '2 / 4',
          fontSize: 13,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {mail.subject}
        <span style={{ opacity: 0.5 }}> — {mail.preview}</span>
      </span>
    </div>
  );
}
