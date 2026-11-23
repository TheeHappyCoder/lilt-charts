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
    <>
      <style href="lilt-ui-stream-text-demo" precedence="default">
        {css}
      </style>
      <div className="lilt-std" style={style}>
        <div className="lilt-std-head">
          <span className="lilt-std-prompt">{QUESTION}</span>
        </div>
        <div className="lilt-std-body">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={round}
              exit={{ opacity: 0, filter: 'blur(6px)' }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="lilt-std-copy"
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
      </div>
    </>
  );
}

const css = /* css */ `
.lilt-std {
  --std-panel: #f4f4f2;
  --std-surface: #ffffff;
  --std-line: rgb(26 26 24 / 0.08);
  display: grid;
  gap: 8px;
  width: min(464px, 100%);
  padding: 8px;
  border: 1px solid var(--std-line);
  border-radius: 14px;
  background: var(--std-panel);
  -webkit-font-smoothing: antialiased;
}
:where(.dark, [data-theme="dark"]) .lilt-std {
  --std-panel: #151514;
  --std-surface: #1b1b19;
  --std-line: rgb(244 244 242 / 0.08);
}
[data-theme="light"] .lilt-std {
  --std-panel: #f4f4f2;
  --std-surface: #ffffff;
  --std-line: rgb(26 26 24 / 0.08);
}

.lilt-std-head {
  display: flex;
  justify-content: flex-end;
}
.lilt-std-prompt {
  max-width: 86%;
  padding: 7px 12px;
  border: 1px solid var(--std-line);
  border-radius: 10px;
  background: var(--std-surface);
  font-size: 13px;
  font-weight: 500;
  letter-spacing: -0.01em;
}
.lilt-std-body {
  min-height: 174px;
  padding: 14px 16px;
  border: 1px solid var(--std-line);
  border-radius: 10px;
  background: var(--std-surface);
}
.lilt-std-copy {
  font-size: 14px;
  line-height: 1.62;
  letter-spacing: -0.005em;
}
`;
