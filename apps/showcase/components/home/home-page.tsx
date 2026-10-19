import Link from 'next/link';
import { HugeiconsIcon as Icon, type IconSvgElement } from '@hugeicons/react';
import ArrowRight01Icon from '@hugeicons/core-free-icons/ArrowRight01Icon';
import ArrowDataTransferHorizontalIcon from '@hugeicons/core-free-icons/ArrowDataTransferHorizontalIcon';
import DashboardSpeed02Icon from '@hugeicons/core-free-icons/DashboardSpeed02Icon';
import Link01Icon from '@hugeicons/core-free-icons/Link01Icon';
import Pin02Icon from '@hugeicons/core-free-icons/Pin02Icon';
import SparklesIcon from '@hugeicons/core-free-icons/SparklesIcon';
import Target03Icon from '@hugeicons/core-free-icons/Target03Icon';
import { ChartSettingsProvider } from '@/components/docs/chart-settings';
import { InstallCommand } from '@/components/docs/install-command';
import { GalleryTile } from '@/components/gallery/chart-gallery';
import { HomeBackdrop } from '@/components/home/home-backdrop';
import { HomeMeter } from '@/components/home/home-meter';
import { HomePlayground } from '@/components/home/home-playground';
import { BlurFade } from '@/components/motion/blur-fade';
import { LiltLogo } from '@/components/shell/logo';
import { groupsByTab } from '@/components/shell/nav-model';
import { SiteShell } from '@/components/shell/site-shell';
import { chartDocs } from '@/lib/card-docs/registry';
import { GITHUB_URL, getGitHubStars } from '@/lib/github-stars';
import { getDownloads } from '@/lib/npm-downloads';

/** The collection on the home page: a few families that show the range, the first one wide. */
const collection = [
  '/charts/area',
  '/charts/sankey',
  '/charts/stat-cards',
  '/charts/radar',
  '/charts/heatmap',
  '/charts/skyline',
  '/finance/candlestick',
  '/charts/treemap',
  '/charts/scatter',
] as const;

const features: readonly {
  icon: IconSvgElement;
  title: string;
  body: string;
  href: string;
}[] = [
  {
    icon: Link01Icon,
    title: 'Linked hover',
    body: 'Give cards the same sync key and one pointer reads every chart on the same day.',
    href: '/features/sync',
  },
  {
    icon: Pin02Icon,
    title: 'Pin',
    body: 'Click to hold a reading in place while you compare it against the rest.',
    href: '/features/pin',
  },
  {
    icon: ArrowDataTransferHorizontalIcon,
    title: 'Compare',
    body: 'Drag across a stretch and the card tells you what changed between the ends.',
    href: '/features/compare',
  },
  {
    icon: Target03Icon,
    title: 'Targets & forecasts',
    body: 'Draw a goal over the data and project the last stretch with its range.',
    href: '/features/targets',
  },
  {
    icon: DashboardSpeed02Icon,
    title: 'Performance',
    body: 'Long series draw four points per pixel column, measured live in your browser.',
    href: '/features/performance',
  },
  {
    icon: SparklesIcon,
    title: 'Motion that means something',
    body: 'Entrances, loading and hover follow the data, and all of it respects reduced motion.',
    href: '/guides/motion',
  },
];

const count = new Intl.NumberFormat('en-US');

/** Footer columns: every section of the docs, then the project's links. */
const footer = [
  {
    heading: 'Charts',
    links: groupsByTab.charts.map((group) => ({
      label: group.heading!,
      href: `/charts#${group.key}`,
    })),
  },
  {
    heading: 'Customize',
    links: groupsByTab.customize[0]!.routes.map((route) => ({
      label: route.label,
      href: route.href,
    })),
  },
  {
    heading: 'Features',
    links: groupsByTab.features[0]!.routes.map((route) => ({
      label: route.label,
      href: route.href,
    })),
  },
  {
    heading: 'Docs',
    links: [
      ...groupsByTab.docs.flatMap((group) =>
        group.routes.map((route) => ({ label: route.label, href: route.href })),
      ),
      { label: 'llms.txt', href: '/llms.txt' },
    ],
  },
];

export async function HomePage() {
  const [downloads, stars] = await Promise.all([getDownloads(), getGitHubStars()]);
  const families = Object.keys(chartDocs).length;
  return (
    <ChartSettingsProvider>
      <SiteShell stars={stars} bare>
        <div className="lilt-landing">
          <section className="lilt-landing__hero" aria-labelledby="lilt-landing-title">
            <HomeBackdrop />
            <BlurFade>
              <Link href="/charts" className="lilt-landing__pill">
                <span className="lilt-landing__pill-dot" aria-hidden="true" />
                {families} chart families for React
                <Icon icon={ArrowRight01Icon} size={13} strokeWidth={2} aria-hidden="true" />
              </Link>
            </BlurFade>
            <BlurFade delay={60}>
              <h1 id="lilt-landing-title">
                Give your data
                <br />a little <em>Lilt.</em>
              </h1>
            </BlurFade>
            <BlurFade delay={100}>
              <p className="lilt-landing__lede">
                Chart cards for React that arrive finished: fluid motion, precise inspection and
                thoughtful interactions, from one import.
              </p>
            </BlurFade>
            <BlurFade delay={140}>
              <div className="lilt-landing__ctas">
                <Link href="/guides/installation" className="lilt-landing__button">
                  Get started
                  <Icon icon={ArrowRight01Icon} size={15} strokeWidth={2} aria-hidden="true" />
                </Link>
                <Link href="/charts" className="lilt-landing__button" data-variant="quiet">
                  Browse charts
                </Link>
              </div>
            </BlurFade>
            <BlurFade delay={160} className="lilt-landing__install">
              <InstallCommand />
            </BlurFade>
          </section>

          <section className="lilt-landing__section" aria-label="Try it">
            <HomePlayground />
          </section>

          <section className="lilt-landing__section" aria-labelledby="collection-title">
            <div className="lilt-landing__head">
              <div>
                <p className="lilt-landing__eyebrow">The collection</p>
                <h2 id="collection-title">
                  One card per <em>job</em>, all speaking the same props.
                </h2>
              </div>
              <Link href="/charts" className="lilt-landing__link">
                All {families} charts
                <Icon icon={ArrowRight01Icon} size={14} strokeWidth={2} aria-hidden="true" />
              </Link>
            </div>
            <div className="lilt-landing__wall">
              {collection.map((href, index) => (
                <GalleryTile key={href} href={href} wide={index === 0} />
              ))}
            </div>
          </section>

          <section className="lilt-landing__section" aria-labelledby="features-title">
            <div className="lilt-landing__head">
              <div>
                <p className="lilt-landing__eyebrow">Built in</p>
                <h2 id="features-title">
                  The interactions you would otherwise <em>build yourself.</em>
                </h2>
              </div>
            </div>
            <div className="lilt-landing__features">
              {features.map((feature) => (
                <Link key={feature.title} href={feature.href} className="lilt-landing__feature">
                  <span className="lilt-landing__feature-icon">
                    <Icon icon={feature.icon} size={18} strokeWidth={1.7} aria-hidden="true" />
                  </span>
                  <h3>{feature.title}</h3>
                  <p>{feature.body}</p>
                </Link>
              ))}
            </div>
          </section>

          <section className="lilt-landing__closing" aria-labelledby="closing-title">
            <h2 id="closing-title">
              Ready when your <em>data</em> is.
            </h2>
            <p>Install the package, import the stylesheet once, and drop in a card.</p>
            <div className="lilt-landing__ctas">
              <Link href="/guides/installation" className="lilt-landing__button">
                Read the guide
                <Icon icon={ArrowRight01Icon} size={15} strokeWidth={2} aria-hidden="true" />
              </Link>
              <a
                href={GITHUB_URL}
                className="lilt-landing__button"
                data-variant="quiet"
                target="_blank"
                rel="noreferrer"
              >
                View on GitHub
              </a>
            </div>
            <HomeMeter downloads={downloads} />
            <dl className="lilt-landing__stats">
              <div>
                <dt>Chart families</dt>
                <dd>{families}</dd>
              </div>
              <div>
                <dt>npm downloads</dt>
                <dd>{downloads ? count.format(downloads.total) : '—'}</dd>
              </div>
              <div>
                <dt>Import to start</dt>
                <dd>1</dd>
              </div>
            </dl>
          </section>

          <footer className="lilt-landing__footer">
            <div className="lilt-landing__footer-brand">
              <LiltLogo className="lilt-header__logo" />
              <p>Expressive React chart cards.</p>
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
          </footer>
        </div>
      </SiteShell>
    </ChartSettingsProvider>
  );
}
