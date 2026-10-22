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
const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';

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
    <div
      className={className}
      style={{
        width: 'min(460px, 100%)',
        borderRadius: 12,
        border: '1px solid color-mix(in srgb, currentColor 12%, transparent)',
        background: 'color-mix(in srgb, currentColor 4%, transparent)',
        boxShadow:
          'inset 0 1px 0 color-mix(in srgb, currentColor 6%, transparent), 0 1px 2px rgb(0 0 0 / 0.16)',
        overflow: 'hidden',
        ...style,
      }}
    >
      <div
        role="tablist"
        aria-label="Package manager"
        style={{
          display: 'flex',
          gap: 2,
          padding: 5,
          borderBottom: '1px solid color-mix(in srgb, currentColor 9%, transparent)',
        }}
      >
        {tools.map((name) => {
          const selected = name === tool;
          return (
            <button
              key={name}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setTool(name)}
              style={{
                position: 'relative',
                height: 28,
                padding: '0 11px',
                border: 0,
                borderRadius: 6,
                background: 'none',
                color: 'inherit',
                font: 'inherit',
                fontSize: 12.5,
                fontWeight: 500,
                opacity: selected ? 1 : 0.55,
                cursor: 'pointer',
                transition: 'opacity 150ms ease',
              }}
            >
              {selected ? (
                <motion.span
                  layoutId={`${id}-tab`}
                  transition={reduced ? { duration: 0 } : SPRING}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: 6,
                    background: 'color-mix(in srgb, currentColor 10%, transparent)',
                  }}
                />
              ) : null}
              <span style={{ position: 'relative' }}>{name}</span>
            </button>
          );
        })}
      </div>
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 8px 12px 16px' }}
      >
        <span aria-hidden="true" style={{ fontFamily: MONO, fontSize: 13.5, opacity: 0.4 }}>
          $
        </span>
        <div
          style={{
            position: 'relative',
            flex: 1,
            minWidth: 0,
            overflowX: 'auto',
            scrollbarWidth: 'none',
          }}
        >
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.code
              key={tool}
              initial={{ opacity: 0, y: reduced ? 0 : 10, filter: 'blur(4px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: reduced ? 0 : -10, filter: 'blur(4px)' }}
              transition={{ duration: 0.22, ease: EASE }}
              // Set in full, so a site's own styles for code cannot tint or box it.
              style={{
                display: 'block',
                padding: 0,
                border: 0,
                background: 'none',
                color: 'inherit',
                fontFamily: MONO,
                fontSize: 13.5,
                whiteSpace: 'pre',
              }}
            >
              {current}
            </motion.code>
          </AnimatePresence>
        </div>
        <button
          type="button"
          onClick={copy}
          aria-label={copied ? 'Copied' : 'Copy command'}
          style={{
            display: 'grid',
            placeItems: 'center',
            width: 32,
            height: 32,
            border: 0,
            borderRadius: 6,
            background: 'none',
            color: 'inherit',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          <CopyGlyph copied={copied} />
        </button>
      </div>
    </div>
  );
}

/** The copy glyph that turns into a tick: one blurs away as the other pops in on a spring. */
function CopyGlyph({ copied }: { copied: boolean }) {
  const icon = {
    width: 15,
    height: 15,
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
            style={{ display: 'grid', color: '#3ecf8e' }}
          >
            <svg aria-hidden="true" {...icon} strokeWidth={2.4}>
              <path d="M5 12.5l4.5 4.5L19 7.5" />
            </svg>
          </motion.span>
        ) : (
          <motion.span
            key="copy"
            initial={{ scale: 0.7, opacity: 0, filter: 'blur(3px)' }}
            animate={{ scale: 1, opacity: 0.7, filter: 'blur(0px)' }}
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
