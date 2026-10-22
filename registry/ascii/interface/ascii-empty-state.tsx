'use client';

import type { CSSProperties, ReactNode } from 'react';
import { AsciiCanvas } from '../react/ascii-canvas';
import { createEmptyScene, type EmptyVariant } from './empty-scenes';

export interface AsciiEmptyStateProps {
  /**
   * The picture: `no-data` (empty axes and a tumbleweed), `not-found` (404 under a search light),
   * `offline` (a plug reaching for its socket), or `done` (a tick and confetti). Default `no-data`.
   */
  variant?: EmptyVariant;
  /** The heading. Default one that fits the variant. */
  title?: ReactNode;
  /** A line under the heading. Default one that fits the variant. */
  description?: ReactNode;
  /** Actions under the words, such as a button. */
  children?: ReactNode;
  /** Colour of the picture's accent. Default violet. */
  accent?: string;
  /** Height of the picture in pixels. Default 120. */
  height?: number;
  /** Font size of the picture's cells. Default 12. */
  cellSize?: number;
  className?: string;
  style?: CSSProperties;
}

const WORDS: Record<EmptyVariant, [string, string]> = {
  'no-data': ['No data yet', 'Numbers will show here as soon as the first ones arrive.'],
  'not-found': ['Page not found', 'It may have moved, or it never was.'],
  offline: ['You’re offline', 'We’ll reconnect as soon as the network comes back.'],
  done: ['All done', 'Nothing left to do here. Nice work.'],
};

/**
 * An empty state with a little life in it: a small looping picture in type, a heading, a line of
 * explanation and room for an action. The picture is decorative; the words carry the meaning.
 */
export function AsciiEmptyState({
  variant = 'no-data',
  title,
  description,
  children,
  accent = '#8b6cff',
  height = 120,
  cellSize = 12,
  className,
  style,
}: AsciiEmptyStateProps) {
  const [heading, line] = WORDS[variant] ?? WORDS['no-data'];
  return (
    <div
      className={className}
      style={{ display: 'grid', justifyItems: 'center', gap: 6, textAlign: 'center', ...style }}
    >
      <div style={{ width: 'min(300px, 100%)', height }}>
        <AsciiCanvas
          scene={() => createEmptyScene({ variant, accent })}
          sceneKey={`${variant}:${accent}`}
          cellSize={cellSize}
        />
      </div>
      <strong style={{ marginTop: 6, fontSize: '1.05em', fontWeight: 600 }}>
        {title ?? heading}
      </strong>
      <p style={{ margin: 0, maxWidth: '34ch', opacity: 0.62, lineHeight: 1.5 }}>
        {description ?? line}
      </p>
      {children ? <div style={{ marginTop: 10 }}>{children}</div> : null}
    </div>
  );
}
