'use client';

import { useState, type CSSProperties } from 'react';
import { ThemeFlip, type Theme } from '../theme-flip';

const PALETTES = {
  dark: {
    top: '#22242c',
    bottom: '#14161c',
    color: '#ececf2',
    muted: 'rgba(236, 236, 242, 0.5)',
    ring: 'rgba(255, 255, 255, 0.1)',
    spec: 'rgba(255, 255, 255, 0.12)',
    lip: 'rgba(0, 0, 0, 0.8)',
    wellA: '#0e0f14',
    wellB: '#14161d',
    wellIn: 'inset 0 2px 6px rgba(0, 0, 0, 0.72), inset 0 0 0 1px rgba(255, 255, 255, 0.055)',
    wellOut: '0 1px 0 rgba(255, 255, 255, 0.06)',
    activeBg: 'linear-gradient(180deg, #252832, #1b1d25)',
    activeShadow:
      '0 0 0 1px rgba(255, 255, 255, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.09), 0 4px 10px -4px rgba(0, 0, 0, 0.55)',
    drop: '0 26px 52px -18px rgba(0, 0, 0, 0.82), 0 4px 12px rgba(0, 0, 0, 0.45)',
    pool: 'linear-gradient(90deg, #8e9eff, #c8a8e8)',
    dot: 'rgba(255, 255, 255, 0.14)',
  },
  light: {
    top: '#ffffff',
    bottom: '#f1f2f6',
    color: '#1a1a18',
    muted: 'rgba(26, 26, 24, 0.5)',
    ring: 'rgba(15, 20, 40, 0.09)',
    spec: '#ffffff',
    lip: '#dde0e8',
    wellA: '#e8eaef',
    wellB: '#f4f5f8',
    wellIn: 'inset 0 2px 5px rgba(15, 20, 40, 0.1), inset 0 0 0 1px rgba(15, 20, 40, 0.045)',
    wellOut: '0 1px 0 rgba(255, 255, 255, 0.94)',
    activeBg: 'linear-gradient(180deg, #ffffff, #f6f7fa)',
    activeShadow:
      '0 0 0 1px rgba(15, 20, 40, 0.065), inset 0 1px 0 #ffffff, 0 4px 10px -4px rgba(15, 20, 40, 0.14)',
    drop: '0 24px 46px -18px rgba(15, 20, 40, 0.24), 0 3px 8px rgba(15, 20, 40, 0.06)',
    pool: 'linear-gradient(90deg, #ffb99f, #ffd59e)',
    dot: 'rgba(15, 20, 40, 0.12)',
  },
} as const;

const ROWS = [
  { name: 'Launch notes', from: '#9fadff', to: '#c8a8e8', when: 'Edited now', active: true },
  { name: 'Pricing page', from: '#5ad4a4', to: '#78b8ff', when: '2h ago', active: false },
  { name: 'Q4 roadmap', from: '#ffb89e', to: '#ffa3ae', when: 'Yesterday', active: false },
] as const;

/** The docs stage's flip: a machined app window with its own theme and the toggle in its corner. */
export function ThemeFlipDemo({ duration, style }: { duration?: number; style?: CSSProperties }) {
  const [theme, setTheme] = useState<Theme>('dark');
  const p = PALETTES[theme];
  return (
    <div
      style={{ position: 'relative', width: 'min(416px, 100%)', isolation: 'isolate', ...style }}
    >
      {/* Ambient floor light shifting from cool lunar violet to warm solar peach */}
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: '14%',
          right: '14%',
          bottom: -14,
          height: 32,
          borderRadius: '50%',
          background: p.pool,
          filter: 'blur(22px)',
          opacity: 0.42,
          pointerEvents: 'none',
          zIndex: 0,
          transition: 'background 500ms ease',
        }}
      />
      <div
        // The window keeps its own colours, whatever the stage around it passes.
        style={{
          position: 'relative',
          zIndex: 1,
          padding: 8,
          borderRadius: 19,
          background: `linear-gradient(180deg, ${p.top}, ${p.bottom})`,
          color: p.color,
          colorScheme: theme,
          boxShadow: `0 0 0 1px ${p.ring}, inset 0 1.5px 0 ${p.spec}, inset 0 -2.5px 0 ${p.lip}, ${p.drop}`,
          WebkitFontSmoothing: 'antialiased',
        }}
      >
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '4px 4px 10px 10px',
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
            <span aria-hidden="true" style={{ display: 'inline-flex', gap: 5 }}>
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  style={{ width: 8, height: 8, borderRadius: '50%', background: p.dot }}
                />
              ))}
            </span>
            <span style={{ fontSize: 13.5, fontWeight: 600, letterSpacing: '-0.01em' }}>
              Documents
            </span>
          </span>
          <ThemeFlip theme={theme} onThemeChange={setTheme} duration={duration} />
        </header>
        <ul
          style={{
            margin: 0,
            padding: 6,
            listStyle: 'none',
            display: 'grid',
            gap: 4,
            borderRadius: 12,
            background: `linear-gradient(180deg, ${p.wellA}, ${p.wellB})`,
            boxShadow: `${p.wellIn}, ${p.wellOut}`,
          }}
        >
          {ROWS.map((row) => (
            <li
              key={row.name}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '9px 10px',
                borderRadius: 9,
                background: row.active ? p.activeBg : undefined,
                boxShadow: row.active ? p.activeShadow : undefined,
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  display: 'grid',
                  placeItems: 'center',
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  background: `linear-gradient(145deg, ${row.from}, ${row.to})`,
                  boxShadow:
                    'inset 0 1.5px 0 rgba(255, 255, 255, 0.42), 0 3px 8px -3px rgba(15, 20, 40, 0.28)',
                  color: '#fff',
                }}
              >
                <svg
                  width={13}
                  height={13}
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.8}
                  strokeLinecap="round"
                >
                  <path d="M4.5 5.5h7M4.5 8.5h7M4.5 11.5h4.5" />
                </svg>
              </span>
              <span style={{ flex: 1, fontSize: 13.5, fontWeight: 550 }}>{row.name}</span>
              <span style={{ fontSize: 11.5, color: p.muted, fontVariantNumeric: 'tabular-nums' }}>
                {row.when}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
