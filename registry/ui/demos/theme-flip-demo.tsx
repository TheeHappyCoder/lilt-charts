'use client';

import { useState, type CSSProperties } from 'react';
import { ThemeFlip, type Theme } from '../theme-flip';

const PALETTES = {
  dark: {
    background: '#111114',
    color: '#ececf1',
    muted: 'rgb(236 236 241 / 0.5)',
    line: 'rgb(255 255 255 / 0.08)',
    well: 'rgb(255 255 255 / 0.04)',
  },
  light: {
    background: '#fbfaf7',
    color: '#18181b',
    muted: 'rgb(24 24 27 / 0.5)',
    line: 'rgb(0 0 0 / 0.08)',
    well: 'rgb(0 0 0 / 0.03)',
  },
} as const;

const ROWS = [
  { name: 'Launch notes', tone: '#8b6cff', when: 'Edited now' },
  { name: 'Pricing page', tone: '#3ecf8e', when: '2h ago' },
  { name: 'Q4 roadmap', tone: '#ff8a4c', when: 'Yesterday' },
] as const;

/** The docs stage's flip: a small app window with its own theme and the toggle in its corner. */
export function ThemeFlipDemo({ duration, style }: { duration?: number; style?: CSSProperties }) {
  const [theme, setTheme] = useState<Theme>('dark');
  const palette = PALETTES[theme];
  return (
    <div
      // The window keeps its own colours, whatever the stage around it passes.
      style={{
        ...style,
        width: 'min(400px, 100%)',
        borderRadius: 16,
        overflow: 'hidden',
        background: palette.background,
        color: palette.color,
        colorScheme: theme,
        boxShadow: `0 0 0 1px ${palette.line}, 0 24px 60px -24px rgb(0 0 0 / 0.5)`,
      }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 12px 12px 18px',
          borderBottom: `1px solid ${palette.line}`,
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em' }}>Documents</span>
        <ThemeFlip theme={theme} onThemeChange={setTheme} duration={duration} />
      </header>
      <ul style={{ margin: 0, padding: 8, listStyle: 'none', display: 'grid', gap: 2 }}>
        {ROWS.map((row) => (
          <li
            key={row.name}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '10px 10px',
              borderRadius: 10,
              background: row === ROWS[0] ? palette.well : undefined,
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                background: `linear-gradient(135deg, ${row.tone}, color-mix(in srgb, ${row.tone} 55%, ${palette.background}))`,
                boxShadow: 'inset 0 1px 0 rgb(255 255 255 / 0.25)',
              }}
            />
            <span style={{ flex: 1, fontSize: 13.5, fontWeight: 500 }}>{row.name}</span>
            <span style={{ fontSize: 12, color: palette.muted }}>{row.when}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
