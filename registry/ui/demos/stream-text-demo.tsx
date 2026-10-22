'use client';

import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState, type CSSProperties } from 'react';
import { StreamText } from '../stream-text';

const QUESTION = 'Why does the island wait before it shrinks?';
const ANSWER = `Because shrinking first would squeeze the words still inside it. The old content blurs away in about a sixth of a second, and only then does the shape spring to its new size.

Growing is the other way round: the shape leads, so the new content always has room to land.`;

// Real tokens arrive in uneven bursts of a few characters.
function tokensOf(text: string) {
  const tokens: string[] = [];
  let at = 0;
  let seed = 7;
  while (at < text.length) {
    seed = (seed * 9301 + 49297) % 233280;
    const size = 2 + Math.floor((seed / 233280) * 5);
    tokens.push(text.slice(at, at + size));
    at += size;
  }
  return tokens;
}
const TOKENS = tokensOf(ANSWER);

/** The docs stage's answer: streams in token by token, rests, then starts again. */
export function StreamTextDemo({
  speed = 1,
  duration,
  blur,
  caret,
  style,
}: {
  speed?: number;
  duration?: number;
  blur?: number;
  caret?: boolean;
  style?: CSSProperties;
}) {
  const [round, setRound] = useState(0);
  const [count, setCount] = useState(0);
  const streaming = count < TOKENS.length;
  useEffect(() => {
    const timer = streaming
      ? setTimeout(() => setCount((c) => c + 1), (28 + ((count * 37) % 50)) / speed)
      : setTimeout(() => {
          setRound((r) => r + 1);
          setCount(0);
        }, 3200);
    return () => clearTimeout(timer);
  }, [count, streaming, speed]);

  return (
    <div
      style={{
        display: 'grid',
        gap: 18,
        width: 'min(460px, 100%)',
        minHeight: 230,
        alignContent: 'start',
        fontSize: 15,
        lineHeight: 1.65,
        ...style,
      }}
    >
      <span
        style={{
          justifySelf: 'end',
          maxWidth: '80%',
          padding: '7px 13px',
          borderRadius: 12,
          fontSize: 14,
          background: 'color-mix(in srgb, currentColor 8%, transparent)',
          border: '1px solid color-mix(in srgb, currentColor 9%, transparent)',
        }}
      >
        {QUESTION}
      </span>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={round}
          exit={{ opacity: 0, filter: 'blur(6px)' }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        >
          <StreamText
            text={TOKENS.slice(0, count).join('')}
            streaming={streaming}
            duration={duration}
            blur={blur}
            caret={caret}
          />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
