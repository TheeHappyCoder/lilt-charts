import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';
import { Count, Label, TwoTone } from '@/components/craft/label';
import { Roll } from '@/components/craft/roll';
import { ChartSettingsProvider } from '@/components/docs/chart-settings';
import { HomeCharts } from '@/components/home/home-charts';
import { HomeData } from '@/components/home/home-data';
import { HomeFloatingNav } from '@/components/home/home-floating-nav';
import { HomeHero } from '@/components/home/home-hero';
import { HomeInterface } from '@/components/home/home-interface';
import { HomeMedia } from '@/components/home/home-media';
import { HomeQuickstart } from '@/components/home/home-quickstart';
import { HomeScenes } from '@/components/home/home-scenes';
import { groupsByTab } from '@/components/shell/nav-model';
import { SiteFooter } from '@/components/shell/site-footer';
import { SiteShell } from '@/components/shell/site-shell';
import { chartDocs } from '@/lib/card-docs/registry';
import { getGitHubStars } from '@/lib/github-stars';
import { SITE_URL } from '@/lib/llms';

/** What to paste into an agent to get a first card on screen. */
const AGENT_TASK = 'Add a Lilt AreaChartCard of monthly visitors to my dashboard.';

/**
 * One section: a small label with its count, a heading in two tones, a line beside it with the
 * way on, then its bento of tiles.
 */
function Section({
  label,
  count,
  id,
  claim,
  dim,
  aside,
  more,
  children,
}: {
  label: string;
  count?: number;
  id: string;
  claim: ReactNode;
  dim: ReactNode;
  aside: string;
  more?: { href: string; label: string; count?: number };
  children: ReactNode;
}) {
  return (
    <section className="lilt-home-section" aria-labelledby={id}>
      <div className="lilt-home-head">
        <div className="lilt-home-head__main">
          <Label count={count}>{label}</Label>
          <TwoTone id={id} claim={claim} dim={dim} />
        </div>
        <div className="lilt-home-head__side" data-rv="fade" style={{ '--i': 3 } as CSSProperties}>
          <p>{aside}</p>
          {more ? (
            <Link href={more.href} className="lilt-btn" data-tone="outline">
              <Roll>{more.label}</Roll>
              {more.count === undefined ? null : <Count n={more.count} />}
            </Link>
          ) : null}
        </div>
      </div>
      {children}
    </section>
  );
}

export async function HomePage() {
  const stars = await getGitHubStars();
  const families = Object.keys(chartDocs).length;
  // Interface pieces and text effects are drawn in type, so they live in ASCII.
  const pieces = groupsByTab.ascii.filter((group) =>
    ['Interface', 'Text'].includes(group.heading!),
  );
  const pieceCount = pieces.flatMap((group) => group.routes).length;
  const scenes = groupsByTab.ascii.flatMap((group) => group.routes).length;
  return (
    <ChartSettingsProvider>
      <SiteShell stars={stars} bare>
        <div className="lilt-home">
          <HomeHero />
          <HomeFloatingNav />

          <div className="lilt-landing">
            <Section
              label="Chart cards"
              count={families}
              id="charts-title"
              claim="Charts that arrive finished."
              dim="One import, nothing left to build."
              aside="Headline, hover readout, legend, loading and motion, from one import. Live cards, not screenshots: hover any of them."
              more={{ href: '/charts', label: 'Browse all chart families', count: families }}
            >
              <HomeCharts />
            </Section>

            <Section
              label="Living scenes"
              count={scenes}
              id="scenes-title"
              claim="A whole sky of scenes."
              dim="Every one of them alive."
              aside="Each one fills its parent, takes its ink from your CSS, follows the pointer, rests off screen, and holds still for reduced motion."
              more={{ href: '/ascii', label: 'Explore all ASCII scenes', count: scenes }}
            >
              <HomeScenes />
            </Section>

            <Section
              label="ASCII interface"
              count={pieceCount}
              id="interface-title"
              claim="Every detail, in type."
              dim="Source you own."
              aside="Loaders, counters, glyph borders, a terminal that types itself, and a curtain for pages to change behind. Add one with the shadcn CLI and the source is yours."
              more={{ href: '/ascii', label: 'Explore all interface pieces', count: pieceCount }}
            >
              <HomeInterface />
            </Section>

            <Section
              label="Data in type"
              id="data-title"
              claim="Same numbers, set in type."
              dim="Two ways to read a year."
              aside="One year of visitors as a chart card and as an area of type, then the charts that only type can draw. Hover either."
            >
              <HomeData />
            </Section>

            <Section
              label="3D and media"
              id="media-title"
              claim="Real geometry, rendered in type."
              dim="Lit, shaded and set in glyphs."
              aside="A small rasteriser lights each face and sets it in blocks and glyphs. Pick a shape, lean it with the pointer, click to spin."
            >
              <HomeMedia />
            </Section>
          </div>

          <SiteFooter>
            <HomeQuickstart task={AGENT_TASK} docsUrl={`${SITE_URL}/llms.txt`} />
          </SiteFooter>
        </div>
      </SiteShell>
    </ChartSettingsProvider>
  );
}
