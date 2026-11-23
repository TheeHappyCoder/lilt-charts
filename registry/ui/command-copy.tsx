'use client';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useId, useRef, useState, type CSSProperties } from 'react';

export interface CommandCopyProps {
  /** One command per tool, keyed by the tab's name. Default installing a package four ways. */
  commands?: Record<string, string>;
  /** The tab open at first. Default the first key of `commands`. */
  defaultTool?: string;
  className?: string;
  style?: CSSProperties;
}

const DEFAULT_COMMANDS = {
  pnpm: 'pnpm add @lilt-ui/charts',
  npm: 'npm install @lilt-ui/charts',
  yarn: 'yarn add @lilt-ui/charts',
  bun: 'bun add @lilt-ui/charts',
};

const EASE = [0.22, 1, 0.36, 1] as const;
const SPRING = { type: 'spring', stiffness: 520, damping: 40 } as const;

/**
 * A machined install command bar you can copy. Pick your package manager inside the recessed tab
 * well and the elevated keycap glides to it while the command rolls over inside the recessed code
 * well; copy it and a soft emerald light pool wakes while the copy glyph blurs into a tick.
 */
export function CommandCopy({
  commands = DEFAULT_COMMANDS,
  defaultTool,
  className,
  style,
}: CommandCopyProps) {
  const tools = Object.keys(commands);
  const [tool, setTool] = useState(defaultTool ?? tools[0]!);
  const current = commands[tool] ?? commands[tools[0]!] ?? '';
  const reduced = useReducedMotion();
  const id = useId();
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(current);
    } catch {
      return;
    }
    setCopied(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1600);
  };

  return (
    <>
      <style href="lilt-ui-command-copy" precedence="default">
        {css}
      </style>
      <div
        className={['lilt-cmd', className].filter(Boolean).join(' ')}
        data-copied={copied || undefined}
        style={style}
      >
        <span className="lilt-cmd-pool" aria-hidden="true" />
        <div className="lilt-cmd-head">
          <div role="tablist" aria-label="Package manager" className="lilt-cmd-tabs">
            {tools.map((name) => {
              const selected = name === tool;
              return (
                <button
                  key={name}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setTool(name)}
                  className="lilt-cmd-tab"
                  data-selected={selected || undefined}
                >
                  {selected ? (
                    <motion.span
                      layoutId={`${id}-tab`}
                      transition={reduced ? { duration: 0 } : SPRING}
                      className="lilt-cmd-pill"
                    />
                  ) : null}
                  <span style={{ position: 'relative', zIndex: 1 }}>{name}</span>
                </button>
              );
            })}
          </div>
          <span className="lilt-cmd-led" aria-hidden="true" />
        </div>

        <div className="lilt-cmd-well">
          <span className="lilt-cmd-glint" aria-hidden="true" />
          <span aria-hidden="true" className="lilt-cmd-prompt">
            $
          </span>
          <div className="lilt-cmd-scroll">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.code
                key={tool}
                initial={{ opacity: 0, y: reduced ? 0 : 10, filter: 'blur(4px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: reduced ? 0 : -10, filter: 'blur(4px)' }}
                transition={{ duration: 0.22, ease: EASE }}
                className="lilt-cmd-code"
              >
                {current}
              </motion.code>
            </AnimatePresence>
          </div>
          <button
            type="button"
            onClick={copy}
            aria-label={copied ? 'Copied' : 'Copy command'}
            className="lilt-cmd-copy"
            data-copied={copied || undefined}
          >
            <CopyGlyph copied={copied} />
          </button>
        </div>
      </div>
    </>
  );
}

/** The copy glyph that turns into a tick: one blurs away as the other pops in on a spring. */
function CopyGlyph({ copied }: { copied: boolean }) {
  const icon = {
    width: 14,
    height: 14,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  } as const;
  return (
    <span
      style={{ position: 'relative', display: 'grid', placeItems: 'center', width: 15, height: 15 }}
    >
      <AnimatePresence initial={false} mode="popLayout">
        {copied ? (
          <motion.span
            key="tick"
            initial={{ scale: 0.4, opacity: 0, filter: 'blur(3px)' }}
            animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
            exit={{ scale: 0.6, opacity: 0, filter: 'blur(3px)', transition: { duration: 0.12 } }}
            transition={{ type: 'spring', stiffness: 420, damping: 22 }}
            style={{ display: 'grid', color: '#2ec282' }}
          >
            <svg aria-hidden="true" {...icon} strokeWidth={2.5}>
              <path d="M5 12.5l4.5 4.5L19 7.5" />
            </svg>
          </motion.span>
        ) : (
          <motion.span
            key="copy"
            initial={{ scale: 0.7, opacity: 0, filter: 'blur(3px)' }}
            animate={{ scale: 1, opacity: 0.72, filter: 'blur(0px)' }}
            exit={{ scale: 0.7, opacity: 0, filter: 'blur(3px)', transition: { duration: 0.12 } }}
            transition={{ type: 'spring', stiffness: 520, damping: 32 }}
            style={{ display: 'grid' }}
          >
            <svg aria-hidden="true" {...icon}>
              <rect x="8" y="8" width="12" height="12" rx="2.5" />
              <path d="M16 8V6.5A2.5 2.5 0 0 0 13.5 4h-7A2.5 2.5 0 0 0 4 6.5v7A2.5 2.5 0 0 0 6.5 16H8" />
            </svg>
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}

const css = /* css */ `
.lilt-cmd {
  --cmd-a: #ffffff;
  --cmd-b: #f0f2f6;
  --cmd-ring: rgba(15, 20, 40, 0.085);
  --cmd-top: #ffffff;
  --cmd-lip: #dde0e8;
  --cmd-drop: 0 20px 36px -18px rgba(15, 20, 40, 0.24), 0 3px 8px rgba(15, 20, 40, 0.06);
  --cmd-tray-a: #e6e8ee;
  --cmd-tray-b: #f0f2f6;
  --cmd-tray-in: inset 0 1.5px 3px rgba(15, 20, 40, 0.11), inset 0 0 0 1px rgba(15, 20, 40, 0.045);
  --cmd-pill-a: #ffffff;
  --cmd-pill-b: #f6f7fa;
  --cmd-pill-shadow: 0 2px 5px -1px rgba(15, 20, 40, 0.16), 0 0 0 1px rgba(15, 20, 40, 0.06), inset 0 1px 0 #ffffff;
  --cmd-well-a: #e7e9ef;
  --cmd-well-b: #f3f4f8;
  --cmd-well-in: inset 0 2px 5px rgba(15, 20, 40, 0.12), inset 0 0 0 1px rgba(15, 20, 40, 0.055);
  --cmd-well-out: 0 1px 0 rgba(255, 255, 255, 0.92);
  --cmd-btn-a: #ffffff;
  --cmd-btn-b: #f1f3f7;
  --cmd-btn-shadow: 0 2px 5px -1px rgba(15, 20, 40, 0.15), 0 0 0 1px rgba(15, 20, 40, 0.08), inset 0 1px 0 #ffffff;
  --cmd-prompt: #7b88e8;
  --cmd-led-off: #cfd4de;
  --cmd-glint: rgba(255, 255, 255, 0.75);
  position: relative;
  width: min(468px, 100%);
  padding: 8px;
  border-radius: 18px;
  background: linear-gradient(180deg, var(--cmd-a), var(--cmd-b));
  box-shadow:
    0 0 0 1px var(--cmd-ring),
    inset 0 1.5px 0 var(--cmd-top),
    inset 0 -2.5px 0 var(--cmd-lip),
    var(--cmd-drop);
  isolation: isolate;
  -webkit-font-smoothing: antialiased;
}
:where(.dark, [data-theme="dark"]) .lilt-cmd {
  --cmd-a: #22242c;
  --cmd-b: #16181f;
  --cmd-ring: rgba(255, 255, 255, 0.1);
  --cmd-top: rgba(255, 255, 255, 0.11);
  --cmd-lip: rgba(0, 0, 0, 0.78);
  --cmd-drop: 0 24px 44px -18px rgba(0, 0, 0, 0.78), 0 3px 10px rgba(0, 0, 0, 0.42);
  --cmd-tray-a: #0f1015;
  --cmd-tray-b: #15171e;
  --cmd-tray-in: inset 0 1.5px 4px rgba(0, 0, 0, 0.65), inset 0 0 0 1px rgba(255, 255, 255, 0.05);
  --cmd-pill-a: #292c36;
  --cmd-pill-b: #1e2028;
  --cmd-pill-shadow: 0 2px 6px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.11);
  --cmd-well-a: #0d0e13;
  --cmd-well-b: #13151b;
  --cmd-well-in: inset 0 2px 6px rgba(0, 0, 0, 0.72), inset 0 0 0 1px rgba(255, 255, 255, 0.06);
  --cmd-well-out: 0 1px 0 rgba(255, 255, 255, 0.06);
  --cmd-btn-a: #272a34;
  --cmd-btn-b: #1b1d25;
  --cmd-btn-shadow: 0 2px 6px rgba(0, 0, 0, 0.48), 0 0 0 1px rgba(255, 255, 255, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.1);
  --cmd-prompt: #9ca9ff;
  --cmd-led-off: #323542;
  --cmd-glint: rgba(255, 255, 255, 0.12);
}
[data-theme="light"] .lilt-cmd {
  --cmd-a: #ffffff;
  --cmd-b: #f0f2f6;
  --cmd-ring: rgba(15, 20, 40, 0.085);
  --cmd-top: #ffffff;
  --cmd-lip: #dde0e8;
  --cmd-drop: 0 20px 36px -18px rgba(15, 20, 40, 0.24), 0 3px 8px rgba(15, 20, 40, 0.06);
  --cmd-tray-a: #e6e8ee;
  --cmd-tray-b: #f0f2f6;
  --cmd-tray-in: inset 0 1.5px 3px rgba(15, 20, 40, 0.11), inset 0 0 0 1px rgba(15, 20, 40, 0.045);
  --cmd-pill-a: #ffffff;
  --cmd-pill-b: #f6f7fa;
  --cmd-pill-shadow: 0 2px 5px -1px rgba(15, 20, 40, 0.16), 0 0 0 1px rgba(15, 20, 40, 0.06), inset 0 1px 0 #ffffff;
  --cmd-well-a: #e7e9ef;
  --cmd-well-b: #f3f4f8;
  --cmd-well-in: inset 0 2px 5px rgba(15, 20, 40, 0.12), inset 0 0 0 1px rgba(15, 20, 40, 0.055);
  --cmd-well-out: 0 1px 0 rgba(255, 255, 255, 0.92);
  --cmd-btn-a: #ffffff;
  --cmd-btn-b: #f1f3f7;
  --cmd-btn-shadow: 0 2px 5px -1px rgba(15, 20, 40, 0.15), 0 0 0 1px rgba(15, 20, 40, 0.08), inset 0 1px 0 #ffffff;
  --cmd-prompt: #7b88e8;
  --cmd-led-off: #cfd4de;
  --cmd-glint: rgba(255, 255, 255, 0.75);
}

.lilt-cmd-pool {
  position: absolute;
  left: 12%;
  right: 12%;
  bottom: -12px;
  height: 28px;
  border-radius: 50%;
  background: linear-gradient(90deg, #9fadff, #c8a8e8 50%, #ffb89e);
  filter: blur(18px);
  opacity: 0.22;
  pointer-events: none;
  z-index: -1;
  transition: background 420ms ease, opacity 420ms ease;
}
.lilt-cmd[data-copied] .lilt-cmd-pool {
  background: linear-gradient(90deg, #32c484, #7dd8c2 55%, #a8b5ff);
  opacity: 0.52;
}

.lilt-cmd-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}
.lilt-cmd-tabs {
  display: inline-flex;
  gap: 2px;
  padding: 3px;
  border-radius: 10px;
  background: linear-gradient(180deg, var(--cmd-tray-a), var(--cmd-tray-b));
  box-shadow: var(--cmd-tray-in), var(--cmd-well-out);
}
.lilt-cmd-tab {
  position: relative;
  height: 26px;
  padding: 0 11px;
  border: 0;
  border-radius: 7px;
  background: none;
  color: inherit;
  font: inherit;
  font-size: 12px;
  font-weight: 550;
  letter-spacing: -0.005em;
  opacity: 0.56;
  cursor: pointer;
  transition: opacity 160ms ease;
}
.lilt-cmd-tab:hover,
.lilt-cmd-tab[data-selected] {
  opacity: 1;
}
.lilt-cmd-pill {
  position: absolute;
  inset: 0;
  border-radius: 7px;
  background: linear-gradient(180deg, var(--cmd-pill-a), var(--cmd-pill-b));
  box-shadow: var(--cmd-pill-shadow);
}

.lilt-cmd-led {
  width: 7px;
  height: 7px;
  margin-right: 6px;
  border-radius: 50%;
  background: var(--cmd-led-off);
  transition: background-color 280ms ease, box-shadow 280ms ease;
}
.lilt-cmd[data-copied] .lilt-cmd-led {
  background: #2ec282;
  box-shadow: 0 0 8px rgba(46, 194, 130, 0.72);
}

.lilt-cmd-well {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 6px 6px 14px;
  border-radius: 11px;
  overflow: hidden;
  background: linear-gradient(180deg, var(--cmd-well-a), var(--cmd-well-b));
  box-shadow: var(--cmd-well-in), var(--cmd-well-out);
}
.lilt-cmd-glint {
  position: absolute;
  inset: -40% auto -40% -50%;
  width: 40%;
  background: linear-gradient(90deg, transparent, var(--cmd-glint), transparent);
  transform: skewX(-22deg);
  opacity: 0;
  pointer-events: none;
}
.lilt-cmd[data-copied] .lilt-cmd-glint {
  animation: lilt-cmd-glint 760ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
}

.lilt-cmd-prompt {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 13px;
  font-weight: 600;
  color: var(--cmd-prompt);
  user-select: none;
  flex-shrink: 0;
}
.lilt-cmd-scroll {
  position: relative;
  flex: 1;
  min-width: 0;
  overflow-x: auto;
  scrollbar-width: none;
  -webkit-mask-image: linear-gradient(90deg, #000 88%, transparent 100%);
  mask-image: linear-gradient(90deg, #000 88%, transparent 100%);
}
.lilt-cmd-code {
  display: block;
  padding: 0 14px 0 0;
  border: 0;
  background: none;
  color: inherit;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 13px;
  letter-spacing: -0.01em;
  white-space: pre;
}

.lilt-cmd-copy {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border: 0;
  border-radius: 8px;
  background: linear-gradient(180deg, var(--cmd-btn-a), var(--cmd-btn-b));
  box-shadow: var(--cmd-btn-shadow);
  color: inherit;
  cursor: pointer;
  flex-shrink: 0;
  transition: transform 160ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 200ms ease;
}
.lilt-cmd-copy:hover {
  transform: translateY(-0.5px);
}
.lilt-cmd-copy:active {
  transform: translateY(1px) scale(0.95);
}

@keyframes lilt-cmd-glint {
  0% { opacity: 0; transform: skewX(-22deg) translateX(0); }
  25% { opacity: 1; }
  100% { opacity: 0; transform: skewX(-22deg) translateX(480%); }
}
@media (prefers-reduced-motion: reduce) {
  .lilt-cmd[data-copied] .lilt-cmd-glint { animation: none; }
}
`;
