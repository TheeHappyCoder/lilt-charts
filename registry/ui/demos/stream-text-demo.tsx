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

/** The docs stage's answer: streams inside a machined glass reply card, rests, then starts again. */
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
      <div className="lilt-std" data-streaming={streaming || undefined} style={style}>
        <span className="lilt-std-pool" aria-hidden="true" />
        <div className="lilt-std-head">
          <span className="lilt-std-prompt">{QUESTION}</span>
        </div>
        <div className="lilt-std-body">
          <span className="lilt-std-meta" aria-hidden="true">
            <span className="lilt-std-dot" />
            <span>{streaming ? 'Streaming reply' : 'Complete'}</span>
          </span>
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
  --std-a: #ffffff;
  --std-b: #f1f2f6;
  --std-ring: rgba(15, 20, 40, 0.085);
  --std-top: #ffffff;
  --std-lip: #dde0e8;
  --std-drop: 0 22px 40px -18px rgba(15, 20, 40, 0.24), 0 3px 8px rgba(15, 20, 40, 0.06);
  --std-well-a: #e9ebf0;
  --std-well-b: #f5f6f9;
  --std-well-in: inset 0 2px 5px rgba(15, 20, 40, 0.09), inset 0 0 0 1px rgba(15, 20, 40, 0.045);
  --std-well-out: 0 1px 0 rgba(255, 255, 255, 0.92);
  --std-q-a: #ffffff;
  --std-q-b: #f3f4f8;
  --std-q-shadow: 0 3px 8px -4px rgba(15, 20, 40, 0.16), 0 0 0 1px rgba(15, 20, 40, 0.07), inset 0 1px 0 #ffffff;
  position: relative;
  display: grid;
  gap: 10px;
  width: min(470px, 100%);
  padding: 12px;
  border-radius: 18px;
  background: linear-gradient(180deg, var(--std-a), var(--std-b));
  box-shadow:
    0 0 0 1px var(--std-ring),
    inset 0 1.5px 0 var(--std-top),
    inset 0 -2.5px 0 var(--std-lip),
    var(--std-drop);
  isolation: isolate;
  -webkit-font-smoothing: antialiased;
}
:where(.dark, [data-theme="dark"]) .lilt-std {
  --std-a: #22242c;
  --std-b: #16181f;
  --std-ring: rgba(255, 255, 255, 0.1);
  --std-top: rgba(255, 255, 255, 0.11);
  --std-lip: rgba(0, 0, 0, 0.78);
  --std-drop: 0 24px 46px -18px rgba(0, 0, 0, 0.78), 0 3px 10px rgba(0, 0, 0, 0.42);
  --std-well-a: #0e0f14;
  --std-well-b: #14161d;
  --std-well-in: inset 0 2px 6px rgba(0, 0, 0, 0.72), inset 0 0 0 1px rgba(255, 255, 255, 0.055);
  --std-well-out: 0 1px 0 rgba(255, 255, 255, 0.06);
  --std-q-a: #2a2d37;
  --std-q-b: #1f212a;
  --std-q-shadow: 0 4px 10px -4px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.09), inset 0 1px 0 rgba(255, 255, 255, 0.1);
}
[data-theme="light"] .lilt-std {
  --std-a: #ffffff;
  --std-b: #f1f2f6;
  --std-ring: rgba(15, 20, 40, 0.085);
  --std-top: #ffffff;
  --std-lip: #dde0e8;
  --std-drop: 0 22px 40px -18px rgba(15, 20, 40, 0.24), 0 3px 8px rgba(15, 20, 40, 0.06);
  --std-well-a: #e9ebf0;
  --std-well-b: #f5f6f9;
  --std-well-in: inset 0 2px 5px rgba(15, 20, 40, 0.09), inset 0 0 0 1px rgba(15, 20, 40, 0.045);
  --std-well-out: 0 1px 0 rgba(255, 255, 255, 0.92);
  --std-q-a: #ffffff;
  --std-q-b: #f3f4f8;
  --std-q-shadow: 0 3px 8px -4px rgba(15, 20, 40, 0.16), 0 0 0 1px rgba(15, 20, 40, 0.07), inset 0 1px 0 #ffffff;
}

.lilt-std-pool {
  position: absolute;
  left: 14%;
  right: 14%;
  bottom: -14px;
  height: 30px;
  border-radius: 50%;
  background: linear-gradient(90deg, #9fadff, #c8a8e8 52%, #ffb89e);
  filter: blur(20px);
  opacity: 0.24;
  pointer-events: none;
  z-index: -1;
  transition: opacity 420ms ease;
}
.lilt-std[data-streaming] .lilt-std-pool {
  opacity: 0.44;
}

.lilt-std-head {
  display: flex;
  justify-content: flex-end;
}
.lilt-std-prompt {
  max-width: 86%;
  padding: 7px 13px;
  border-radius: 11px;
  background: linear-gradient(180deg, var(--std-q-a), var(--std-q-b));
  box-shadow: var(--std-q-shadow);
  font-size: 13px;
  font-weight: 500;
  letter-spacing: -0.01em;
}
.lilt-std-body {
  display: grid;
  gap: 8px;
  min-height: 176px;
  align-content: start;
  padding: 13px 15px 15px;
  border-radius: 12px;
  background: linear-gradient(180deg, var(--std-well-a), var(--std-well-b));
  box-shadow: var(--std-well-in), var(--std-well-out);
}
.lilt-std-meta {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 11.5px;
  font-weight: 550;
  letter-spacing: 0.01em;
  opacity: 0.56;
}
.lilt-std-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #32c484;
  box-shadow: 0 0 8px rgba(50, 196, 132, 0.65);
  transition: background-color 280ms ease, box-shadow 280ms ease;
}
.lilt-std[data-streaming] .lilt-std-dot {
  background: #9ca9ff;
  box-shadow: 0 0 9px rgba(156, 169, 255, 0.8);
}
.lilt-std-copy {
  font-size: 14px;
  line-height: 1.62;
  letter-spacing: -0.005em;
}
`;
