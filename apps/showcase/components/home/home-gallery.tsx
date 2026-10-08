'use client';

import ArrowRight02Icon from '@hugeicons/core-free-icons/ArrowRight02Icon';
import { HugeiconsIcon as Icon } from '@hugeicons/react';
import Link from 'next/link';
import { useState } from 'react';
import { CardCarousel } from '@/components/ui/card-carousel';
import { CardExamplePreview } from '@/components/docs/card-example-preview';
import { RevealTitle } from '@/components/home/home-reveal-title';
import { StoryIndex } from '@/components/home/home-story-index';
import { areaDoc } from '@/lib/card-docs/area';
import { barDoc } from '@/lib/card-docs/bar';
import { heatmapDoc } from '@/lib/card-docs/heatmap';
import { radarDoc } from '@/lib/card-docs/radar';
import { sankeyDoc } from '@/lib/card-docs/sankey';
import { scatterDoc } from '@/lib/card-docs/scatter';
import { statDoc } from '@/lib/card-docs/stat';
import { featureCards, variant } from '@/lib/home-showcase';

/** Plot heights that bring every family's card to the same overall height on the arc. */
const collection = [
  { name: 'Area', height: 285, ...variant(areaDoc, '/charts/area', 'forecast') },
  { name: 'Bar', height: 285, ...variant(barDoc, '/charts/bar', 'needle') },
  { name: 'Sankey', height: 285, ...variant(sankeyDoc, '/charts/sankey', 'money') },
  { name: 'Radar', height: 235, ...variant(radarDoc, '/charts/radar', 'compare') },
  { name: 'Stat cards', height: 272, ...variant(statDoc, '/charts/stat-cards') },
  { name: 'Scatter', height: 285, ...variant(scatterDoc, '/charts/scatter', 'bubbles') },
  { name: 'Heatmap', height: 233, ...variant(heatmapDoc, '/charts/heatmap', 'retention') },
].map((card) => ({
  ...card,
  preview: featureCards(card.example, { height: card.height, legend: 'inline' })[0]!,
}));

export function HomeGallery() {
  const [active, setActive] = useState(0);
  const current = collection[active]!;
  return (
    <section className="lilt-story-collection" aria-labelledby="gallery-title">
      <StoryIndex>Families</StoryIndex>
      <div className="lilt-story-head">
        <RevealTitle id="gallery-title">
          Explore the <em>charts.</em>
        </RevealTitle>
        <div className="lilt-story-head__aside">
          <p className="lilt-story-lede">
            From a quiet trend line to a retention grid, every family is one card that speaks the
            same props.
          </p>
          <Link href="/charts" className="lilt-story-link">
            All chart families
            <Icon icon={ArrowRight02Icon} aria-hidden="true" size={16} />
          </Link>
        </div>
      </div>

      <CardCarousel
        items={collection.map((card) => ({ id: card.name, title: card.name }))}
        active={active}
        onSelect={setActive}
        label="Chart families"
        compact
        renderItem={(index) => <CardExamplePreview example={collection[index]!.preview} />}
      />
      <div className="lilt-arc__explore">
        <Link href={current.href} className="lilt-home__button" data-variant="quiet">
          Explore {current.name.toLowerCase()}
          <Icon icon={ArrowRight02Icon} aria-hidden="true" size={16} strokeWidth={1.8} />
        </Link>
      </div>
    </section>
  );
}
