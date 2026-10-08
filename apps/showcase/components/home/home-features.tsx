'use client';

import Link from 'next/link';
import { useRef } from 'react';
import { motion } from 'motion/react';
import { HugeiconsIcon as Icon } from '@hugeicons/react';
import ArrowRight02Icon from '@hugeicons/core-free-icons/ArrowRight02Icon';
import { CardExamplePreview } from '@/components/docs/card-example-preview';
import { useHomeLook } from '@/components/home/home-look';
import { RevealTitle } from '@/components/home/home-reveal-title';
import { StoryIndex } from '@/components/home/home-story-index';
import { useGhostPointer } from '@/components/home/use-ghost-pointer';
import { heroWithLook, partnerWithLook, sceneProps, type SceneId } from '@/lib/home-hero';

const scenes: readonly {
  id: SceneId;
  name: string;
  prop: string;
  description: string;
  href: string;
  link: string;
}[] = [
  {
    id: 'sync',
    name: 'Linked hover',
    prop: 'sync',
    description: 'Move across either card. Sales and orders follow the same day.',
    href: '/features/sync',
    link: 'Linked hover docs',
  },
  {
    id: 'compare',
    name: 'Compare',
    prop: 'compare',
    description: 'Drag across a stretch of days to see what changed between them.',
    href: '/features/compare',
    link: 'Comparison docs',
  },
  {
    id: 'forecast',
    name: 'Look ahead',
    prop: 'target · forecast',
    description: 'A daily goal over the bars, and the last week projected with its range.',
    href: '/features/targets',
    link: 'Targets & forecasts docs',
  },
];

const glide = { type: 'spring', duration: 0.5, bounce: 0.12 } as const;

/**
 * The reader's own chart, docked: it arrives from the studio in the look they chose, and a second
 * card slides out from behind it to show what cards do together. The scene the reader picks here
 * stays on the chart when it flies on to the code.
 */
export function HomeFeatures() {
  const { look, scene, setScene } = useHomeLook();
  const stage = useRef<HTMLDivElement>(null);
  const ghost = useRef<HTMLSpanElement>(null);
  useGhostPointer(stage, ghost, scene);
  const current = scenes.find((item) => item.id === scene)!;

  return (
    <section className="lilt-story-theatre" aria-labelledby="bento-title">
      <StoryIndex>Interactions</StoryIndex>
      <div className="lilt-story-head">
        <RevealTitle id="bento-title">
          Follow the data.
          <br />
          <em>Every card listens.</em>
        </RevealTitle>
        <div className="lilt-story-head__aside">
          <p className="lilt-story-lede">
            This is the chart you just styled. Hover it, drag across it, look ahead. The
            interactions ship inside the card.
          </p>
          <div className="lilt-theatre-switcher" role="group" aria-label="Try an interaction">
            {scenes.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={item.id === scene}
                aria-controls="lilt-interaction-scene"
                onClick={() => setScene(item.id)}
              >
                {item.id === scene ? (
                  <motion.span
                    layoutId="lilt-theatre-pill"
                    className="lilt-theatre-switcher__pill"
                    transition={glide}
                  />
                ) : null}
                <span className="lilt-theatre-switcher__label">{item.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div ref={stage} className="lilt-theatre-frame" id="lilt-interaction-scene">
        <span className="lilt-theatre-frame__light" aria-hidden="true" />
        <div className="lilt-theatre-stage" data-paired>
          <div data-flight-slot="interactions" data-lit className="lilt-theatre-main">
            <CardExamplePreview example={heroWithLook(look, sceneProps[scene].main)} />
          </div>
          {/* It waits behind the reader's chart and slides out as the chart docks (home-scroll.css). */}
          <div className="lilt-theatre-partner" data-lit>
            <CardExamplePreview example={partnerWithLook(look, sceneProps[scene].partner)} />
          </div>
        </div>
        <span ref={ghost} className="lilt-theatre-ghost" aria-hidden="true">
          <svg viewBox="0 0 20 22" width="20" height="22">
            <path d="M3 2.5 16.5 12l-6.2 1.2-3.4 5.6L3 2.5Z" />
          </svg>
        </span>
      </div>

      <div className="lilt-theatre-caption">
        <p>
          <code>{current.prop}</code>
          {current.description}
        </p>
        <Link href={current.href} className="lilt-story-link">
          {current.link}
          <Icon icon={ArrowRight02Icon} size={16} aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
