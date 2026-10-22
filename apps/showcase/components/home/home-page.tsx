import Link from 'next/link';
import { HugeiconsIcon as Icon } from '@hugeicons/react';
import ArrowRight01Icon from '@hugeicons/core-free-icons/ArrowRight01Icon';
import { ChartSettingsProvider } from '@/components/docs/chart-settings';
import { HomeCharts } from '@/components/home/home-charts';
import { HomeClosing } from '@/components/home/home-closing';
import { HomeData } from '@/components/home/home-data';
import { HomeHero } from '@/components/home/home-hero';
import { HomeInterface } from '@/components/home/home-interface';
import { HomeMedia } from '@/components/home/home-media';
import { HomeQuickstart } from '@/components/home/home-quickstart';
import { HomeScenes } from '@/components/home/home-scenes';
import { LiltLogo } from '@/components/shell/logo';
import {
  customizeRoutes,
  familyGroups,
  featureRoutes,
  groupsByTab,
  referenceRoutes,
  startRoutes,
  type TileGroup,
} from '@/components/shell/nav-model';
import { SiteShell } from '@/components/shell/site-shell';
import { chartDocs } from '@/lib/card-docs/registry';
import { GITHUB_URL, getGitHubStars } from '@/lib/github-stars';
import { SITE_URL } from '@/lib/llms';

/** What to paste into an agent to get a first card on screen. */
const AGENT_TASK = 'Add a Lilt AreaChartCard of monthly visitors to my dashboard.';

const shelf = (group: TileGroup) => ({ label: group.heading!, href: group.routes[0]!.href });

/**
 * Footer columns: a handful of ways into each line and the docs, never every page. The rails
 * list everything; the footer only points.
 */
const footer = [
  {
    heading: 'Charts',
    links: [
      { label: 'All charts', href: '/charts' },
      { label: 'Finance', href: familyGroups.at(-1)!.routes[0]!.href },
      { label: 'Customize', href: customizeRoutes[0]!.href },
      { label: 'Features', href: featureRoutes[0]!.href },
    ],
  },
  { heading: 'Components', links: groupsByTab.components.map(shelf) },
  {
    heading: 'ASCII',
    links: [
      { label: 'All scenes', href: groupsByTab.ascii[0]!.routes[0]!.href },
      ...groupsByTab.ascii
        .filter((group) =>
          ['Text', 'Interface', 'Backgrounds', 'Media', 'Data'].includes(group.heading!),
        )
        .map(shelf),
    ],
  },
  {
    heading: 'Docs',
    links: [
      ...[...startRoutes, ...referenceRoutes].map((route) => ({
        label: route.label,
        href: route.href,
      })),
      { label: 'llms.txt', href: '/llms.txt' },
    ],
  },
];

/** One section: its number and name, the headline and a line beside it, then its bento. */
function Section({
  index,
  eyebrow,
  id,
  title,
  aside,
  more,
  children,
}: {
  index: string;
  eyebrow: string;
  id: string;
  title: React.ReactNode;
  aside: string;
  more?: { href: string; label: string };
  children: React.ReactNode;
}) {
  return (
    <section className="lilt-home-section" aria-labelledby={id}>
      <div className="lilt-home-head">
        <div>
          <p className="lilt-home-eyebrow">
            <span>{index}</span>
            {eyebrow}
          </p>
          <h2 id={id}>{title}</h2>
        </div>
        <p className="lilt-home-head__aside">{aside}</p>
      </div>
      {children}
      {more ? (
        <Link href={more.href} className="lilt-landing__more">
          {more.label}
          <Icon icon={ArrowRight01Icon} size={14} strokeWidth={2} aria-hidden="true" />
        </Link>
      ) : null}
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
  const piecesHref = pieces[0]!.routes[0]!.href;
  const pieceCount = pieces.flatMap((group) => group.routes).length;
  const scenes = groupsByTab.ascii.flatMap((group) => group.routes).length;
  return (
    <ChartSettingsProvider>
      <SiteShell stars={stars} bare>
        <div className="lilt-home">
          <HomeHero />

          <div className="lilt-landing">
            <Section
              index="01"
              eyebrow="Chart cards"
              id="charts-title"
              title={
                <>
                  Charts that arrive <em>finished.</em>
                </>
              }
              aside="Headline, hover readout, legend, loading and motion, from one import. Live cards, not screenshots: hover any of them."
              more={{ href: '/charts', label: `Browse all ${families} chart families` }}
            >
              <HomeCharts />
            </Section>

            <Section
              index="02"
              eyebrow="ASCII interface"
              id="interface-title"
              title={
                <>
                  Every detail, <em>in type.</em>
                </>
              }
              aside="Loaders, counters, glyph borders, a terminal that types itself, and the curtain every page on this site changes behind. Add one with the shadcn CLI and the source is yours."
              more={{ href: piecesHref, label: `Explore all ${pieceCount} interface pieces` }}
            >
              <HomeInterface />
            </Section>

            <Section
              index="03"
              eyebrow="Living scenes"
              id="scenes-title"
              title={
                <>
                  A whole sky of <em>scenes.</em>
                </>
              }
              aside="Each one fills its parent, takes its ink from your CSS, follows the pointer, rests off screen, and holds still for reduced motion."
              more={{ href: '/ascii/koi', label: `Explore all ${scenes} ASCII scenes` }}
            >
              <HomeScenes />
            </Section>

            <Section
              index="04"
              eyebrow="Data in type"
              id="data-title"
              title={
                <>
                  Same numbers, <em>set in type.</em>
                </>
              }
              aside="One year of visitors as a chart card and as an area of type, then the charts that only type can draw. Hover either."
            >
              <HomeData />
            </Section>

            <Section
              index="05"
              eyebrow="3D and media"
              id="media-title"
              title={
                <>
                  Real geometry, <em>rendered in type.</em>
                </>
              }
              aside="A small rasteriser lights each face and sets it in blocks and glyphs. Pick a shape, lean it with the pointer, click to spin."
            >
              <HomeMedia />
            </Section>

            <HomeClosing github={GITHUB_URL}>
              <div className="lilt-home-closing__install">
                <HomeQuickstart task={AGENT_TASK} docsUrl={`${SITE_URL}/llms.txt`} />
              </div>
            </HomeClosing>

            <footer className="lilt-landing__footer">
              <div className="lilt-landing__footer-brand">
                <LiltLogo className="lilt-header__logo" />
                <p>React components with a little lilt.</p>
              </div>
              {footer.map((column) => (
                <nav
                  key={column.heading}
                  className="lilt-landing__footer-column"
                  aria-label={column.heading}
                >
                  <h3>{column.heading}</h3>
                  <ul>
                    {column.links.map((link) => (
                      <li key={link.href}>
                        <Link href={link.href}>{link.label}</Link>
                      </li>
                    ))}
                  </ul>
                </nav>
              ))}
              <div className="lilt-landing__footer-base">
                <span>Charts from npm. Components and scenes as source you own.</span>
                <span className="lilt-landing__footer-links">
                  <a href={GITHUB_URL}>GitHub</a>
                  <a href="https://www.npmjs.com/package/@lilt-ui/charts">npm</a>
                </span>
              </div>
            </footer>
          </div>
        </div>
      </SiteShell>
    </ChartSettingsProvider>
  );
}
