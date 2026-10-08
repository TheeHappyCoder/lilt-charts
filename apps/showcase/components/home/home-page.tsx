import Link from 'next/link';
import { HugeiconsIcon as Icon } from '@hugeicons/react';
import ArrowRight02Icon from '@hugeicons/core-free-icons/ArrowRight02Icon';
import { CardExamplePreview } from '@/components/docs/card-example-preview';
import { HomeBackdrop } from '@/components/home/home-backdrop';
import { HomeClosing } from '@/components/home/home-closing';
import { HomeCode } from '@/components/home/home-code';
import { HomeFeatures } from '@/components/home/home-features';
import { HomeGallery } from '@/components/home/home-gallery';
import { HomeFlight } from '@/components/home/home-flight';
import { HomeHeader } from '@/components/home/home-header';
import { HomeInstallBadge } from '@/components/home/home-install-badge';
import { HomeLookProvider } from '@/components/home/home-look';
import { HomePerformance } from '@/components/home/home-performance';
import { HomeStoryLight } from '@/components/home/home-story-light';
import { HomeStoryRail } from '@/components/home/home-story-rail';
import { HomeStudio } from '@/components/home/home-studio';
import { BlurFade } from '@/components/motion/blur-fade';
import { LiltLogo } from '@/components/shell/logo';
import { ThemeModeSwitcher } from '@/components/shell/theme-switcher';
import { heroChart } from '@/lib/home-hero';
import { getDownloads } from '@/lib/npm-downloads';
import { getGitHubStars } from '@/lib/github-stars';

export async function HomePage() {
  const [downloads, stars] = await Promise.all([getDownloads(), getGitHubStars()]);
  return (
    <div className="lilt-home">
      <HomeBackdrop />
      <HomeHeader />

      <main>
        <section className="lilt-home__hero" aria-labelledby="lilt-home-title">
          <div className="lilt-home__hero-copy">
            <BlurFade delay={60}>
              <h1 id="lilt-home-title">
                Give your data
                <br />a little <em>Lilt.</em>
              </h1>
            </BlurFade>
            <BlurFade delay={120}>
              <p className="lilt-home__hero-description">
                Expressive chart cards. Thoughtful interactions.
                <br />
                Ready for your next interface.
              </p>
            </BlurFade>
            <BlurFade delay={160}>
              <div className="lilt-home__cta">
                <Link href="/guides/installation" className="lilt-home__button">
                  Get started
                  <Icon icon={ArrowRight02Icon} aria-hidden="true" size={16} strokeWidth={1.8} />
                </Link>
                <Link href="/charts/area" className="lilt-home__button" data-variant="quiet">
                  Browse charts
                </Link>
              </div>
            </BlurFade>
          </div>
          <div className="lilt-home__hero-chart">
            <CardExamplePreview example={heroChart.example} badge={<HomeInstallBadge />} />
          </div>
        </section>

        {/* The scroll meter connects the chapters; the hero's chart travels through them, styled
            by the reader, and comes to rest in the closing skyline. */}
        <HomeLookProvider>
          <div className="lilt-story">
            <HomeStoryRail />
            <HomeStoryLight />
            <HomeStudio />
            <HomeFeatures />
            <HomeCode />
            <HomePerformance />
            <HomeGallery />
            <HomeClosing downloads={downloads} stars={stars} />
          </div>
          <HomeFlight />
        </HomeLookProvider>
      </main>

      <footer className="lilt-home__footer">
        <LiltLogo className="lilt-shell__brand-logo" />
        <ThemeModeSwitcher start="bottom-right" />
      </footer>
    </div>
  );
}
