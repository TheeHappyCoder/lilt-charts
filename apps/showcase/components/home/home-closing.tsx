import ArrowRight02Icon from '@hugeicons/core-free-icons/ArrowRight02Icon';
import { HugeiconsIcon as Icon } from '@hugeicons/react';
import Link from 'next/link';
import { HomeDownloads } from '@/components/home/home-downloads';
import { HomeInstallBadge } from '@/components/home/home-install-badge';
import { HomeSkyline } from '@/components/home/home-skyline';
import { BlurFade } from '@/components/motion/blur-fade';
import type { Downloads } from '@/lib/npm-downloads';
import type { GitHubStars as Stars } from '@/lib/github-stars';
import { GitHubStars } from '@/components/github-stars';

/**
 * The last word: the headline's promise, Lilt's own downloads drawn by Lilt, the install command
 * and the way in, standing on a skyline of the hero's level meter.
 */
export function HomeClosing({
  downloads,
  stars,
}: {
  downloads: Downloads | null;
  stars: Stars | null;
}) {
  return (
    <section className="lilt-story-closing" aria-labelledby="closing-title">
      <BlurFade trigger="scroll">
        <h2 id="closing-title">
          Give your next interface
          <br />a little <em>Lilt.</em>
        </h2>
      </BlurFade>
      <BlurFade trigger="scroll" delay={60} className="lilt-story-stats">
        {downloads ? <HomeDownloads downloads={downloads} /> : null}
        <GitHubStars stars={stars} variant="card" />
      </BlurFade>
      <BlurFade trigger="scroll" delay={80}>
        <div className="lilt-story-closing__install">
          <HomeInstallBadge />
        </div>
      </BlurFade>
      <BlurFade trigger="scroll" delay={140}>
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
      <HomeSkyline />
    </section>
  );
}
