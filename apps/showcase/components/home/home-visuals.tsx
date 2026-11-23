'use client';

import { EffortDial, GlassCard, PrismRouter, RedactionGlass } from '@lilt-ui/registry/visuals';
import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';
import { ArrowSwap } from '@/components/craft/roll';

const featured: readonly {
  href: string;
  name: string;
  shelf: string;
  hint: string;
  render: () => ReactNode;
}[] = [
  {
    href: '/visuals/effort-dial',
    name: 'Effort dial',
    shelf: 'AI',
    hint: 'Drag the knob or step with arrow keys',
    render: () => <EffortDial />,
  },
  {
    href: '/visuals/prism-router',
    name: 'Prism router',
    shelf: 'AI',
    hint: 'One prompt in, the right model out',
    render: () => <PrismRouter />,
  },
  {
    href: '/visuals/glass-card',
    name: 'Glass card',
    shelf: 'Product',
    hint: 'Move your pointer to tilt it in 3D',
    render: () => <GlassCard />,
  },
  {
    href: '/visuals/redaction-glass',
    name: 'Redaction glass',
    shelf: 'Security',
    hint: 'Real frosted glass sliding over private values',
    render: () => <RedactionGlass />,
  },
];

/** Four flagship 3:2 living visuals on plinths for the home page. */
export function HomeVisuals() {
  return (
    <div className="lilt-showroom-grid" style={{ '--cols': 2 } as CSSProperties}>
      {featured.map((item, index) => (
        <Link
          key={item.href}
          href={item.href}
          className="lilt-plinth lilt-showroom-tile"
          data-rv="media"
          style={{ '--i': index } as CSSProperties}
        >
          <span className="lilt-media lilt-visual-tile__media" aria-hidden="true">
            <span className="lilt-visual-tile__mount">{item.render()}</span>
          </span>
          <span className="lilt-cap">
            <span className="lilt-cap__top">
              <span className="lilt-cap__title">
                <strong>{item.name}</strong>
                <span className="lilt-chip" data-tone="wall">
                  {item.shelf}
                </span>
              </span>
              <span className="lilt-cap__end">
                <ArrowSwap />
              </span>
            </span>
            <span className="lilt-cap__desc">{item.hint}</span>
          </span>
        </Link>
      ))}
    </div>
  );
}
