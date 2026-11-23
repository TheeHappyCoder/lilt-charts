'use client';

import { useState, type CSSProperties } from 'react';
import { ThemeFlip, type Theme } from '../theme-flip';

const PALETTES = {
  dark: {
    background: '#121211',
    panel: '#1a1a18',
    color: '#f4f4f2',
    muted: '#73736e',
    line: 'rgb(244 244 242 / 0.08)',
    shadow: '0 10px 28px rgb(0 0 0 / 0.35)',
  },
  light: {
    background: '#ffffff',
    panel: '#f4f4f2',
    color: '#1a1a18',
    muted: '#8c8c87',
    line: 'rgb(26 26 24 / 0.09)',
    shadow: '0 10px 28px rgb(26 26 24 / 0.06)',
  },
} as const;

const ROWS = [
  { name: 'Launch notes', tone: '#7c5cff', when: 'Edited now', active: true },
  { name: 'Pricing page', tone: '#2d8a4e', when: '2h ago', active: false },
  { name: 'Q4 roadmap', tone: '#c2701c', when: 'Yesterday', active: false },
] as const;

/** The docs stage's flip: a small app window with its own theme and the toggle in its corner. */
export function ThemeFlipDemo({ duration, style }: { duration?: number; style?: CSSProperties }) {
  const [theme, setTheme] = useState<Theme>('dark');
  const p = PALETTES[theme];
  return (
    <div
      // The window keeps its own colours, whatever the stage around it passes.
      style={{
        ...style,
        width: 'min(400px, 100%)',
        borderRadius: 14,
        border: `1px solid ${p.line}`,
        overflow: 'hidden',
        background: p.background,
        color: p.color,
        colorScheme: theme,
        boxShadow: p.shadow,
        WebkitFontSmoothing: 'antialiased',
      }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 10px 10px 16px',
          borderBottom: `1px solid ${p.line}`,
        }}
      >
        <span style={{ fontSize: 13.5, fontWeight: 500, letterSpacing: '-0.01em' }}>Documents</span>
        <ThemeFlip theme={theme} onThemeChange={setTheme} duration={duration} />
      </header>
      <ul style={{ margin: 0, padding: 6, listStyle: 'none', display: 'grid', gap: 2 }}>
        {ROWS.map((row) => (
          <li
            key={row.name}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 11,
              padding: '9px 10px',
              borderRadius: 9,
              background: row.active ? p.panel : undefined,
            }}
          >
            <span
              aria-hidden="true"
              style={{
                display: 'grid',
                placeItems: 'center',
                width: 26,
                height: 26,
                borderRadius: 7,
                background: `color-mix(in srgb, ${row.tone} 14%, transparent)`,
                color: row.tone,
              }}
            >
              <svg
                width={13}
                height={13}
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.7}
                strokeLinecap="round"
              >
                <path d="M4.5 5.5h7M4.5 8.5h7M4.5 11.5h4.5" />
              </svg>
            </span>
            <span style={{ flex: 1, fontSize: 13.5, fontWeight: 450 }}>{row.name}</span>
            <span style={{ fontSize: 12, color: p.muted, fontVariantNumeric: 'tabular-nums' }}>
              {row.when}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
