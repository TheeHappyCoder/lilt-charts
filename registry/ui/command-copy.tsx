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
 * An install command you can copy. Pick your package manager and the highlight glides to it while
 * the command rolls over to the new one; copy it and the copy glyph blurs into a tick for a
 * moment. The command scrolls sideways rather than wrapping.
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
      <div className={['lilt-cmd', className].filter(Boolean).join(' ')} style={style}>
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

        <div className="lilt-cmd-well">
          <span aria-hidden="true" className="lilt-cmd-prompt">
            $
          </span>
          <div className="lilt-cmd-scroll">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.code
                key={tool}
                initial={{ opacity: 0, y: reduced ? 0 : 9, filter: 'blur(4px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: reduced ? 0 : -9, filter: 'blur(4px)' }}
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
    strokeWidth: 1.9,
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
            style={{ display: 'grid', color: 'var(--cmd-ok)' }}
          >
            <svg aria-hidden="true" {...icon} strokeWidth={2.3}>
              <path d="M5 12.5l4.5 4.5L19 7.5" />
            </svg>
          </motion.span>
        ) : (
          <motion.span
            key="copy"
            initial={{ scale: 0.7, opacity: 0, filter: 'blur(3px)' }}
            animate={{ scale: 1, opacity: 0.65, filter: 'blur(0px)' }}
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
  --cmd-panel: #f4f4f2;
  --cmd-surface: #ffffff;
  --cmd-hover: #ededea;
  --cmd-line: rgb(26 26 24 / 0.08);
  --cmd-muted: #6b6b66;
  --cmd-faint: #8c8c87;
  --cmd-ok: #2d8a4e;
  --cmd-pill-shadow: 0 1px 2px rgb(26 26 24 / 0.06);
  width: min(460px, 100%);
  padding: 6px;
  border: 1px solid var(--cmd-line);
  border-radius: 14px;
  background: var(--cmd-panel);
  -webkit-font-smoothing: antialiased;
}
:where(.dark, [data-theme="dark"]) .lilt-cmd {
  --cmd-panel: #151514;
  --cmd-surface: #1e1e1c;
  --cmd-hover: #242422;
  --cmd-line: rgb(244 244 242 / 0.08);
  --cmd-muted: #a3a39d;
  --cmd-faint: #73736e;
  --cmd-ok: #5cc485;
  --cmd-pill-shadow: 0 1px 2px rgb(0 0 0 / 0.35);
}
[data-theme="light"] .lilt-cmd {
  --cmd-panel: #f4f4f2;
  --cmd-surface: #ffffff;
  --cmd-hover: #ededea;
  --cmd-line: rgb(26 26 24 / 0.08);
  --cmd-muted: #6b6b66;
  --cmd-faint: #8c8c87;
  --cmd-ok: #2d8a4e;
  --cmd-pill-shadow: 0 1px 2px rgb(26 26 24 / 0.06);
}

.lilt-cmd-tabs {
  display: flex;
  gap: 2px;
  padding: 0 0 6px;
}
.lilt-cmd-tab {
  position: relative;
  height: 28px;
  padding: 0 11px;
  border: 0;
  border-radius: 8px;
  background: none;
  color: var(--cmd-muted);
  font: inherit;
  font-size: 12.5px;
  font-weight: 500;
  letter-spacing: -0.005em;
  cursor: pointer;
  transition: color 160ms ease;
}
.lilt-cmd-tab:hover,
.lilt-cmd-tab[data-selected] {
  color: inherit;
}
.lilt-cmd-pill {
  position: absolute;
  inset: 0;
  border-radius: 8px;
  background: var(--cmd-surface);
  box-shadow: var(--cmd-pill-shadow);
}

.lilt-cmd-well {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 6px 6px 14px;
  border: 1px solid var(--cmd-line);
  border-radius: 10px;
  background: var(--cmd-surface);
}
.lilt-cmd-prompt {
  color: var(--cmd-faint);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 13px;
  user-select: none;
  flex-shrink: 0;
}
.lilt-cmd-scroll {
  position: relative;
  flex: 1;
  min-width: 0;
  overflow-x: auto;
  scrollbar-width: none;
  -webkit-mask-image: linear-gradient(90deg, #000 90%, transparent 100%);
  mask-image: linear-gradient(90deg, #000 90%, transparent 100%);
}
.lilt-cmd-code {
  display: block;
  padding: 0 12px 0 0;
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
  width: 30px;
  height: 30px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: inherit;
  cursor: pointer;
  flex-shrink: 0;
  transition: background-color 150ms ease, transform 140ms ease;
}
.lilt-cmd-copy:hover {
  background: var(--cmd-hover);
}
.lilt-cmd-copy:active {
  transform: scale(0.94);
}
`;
