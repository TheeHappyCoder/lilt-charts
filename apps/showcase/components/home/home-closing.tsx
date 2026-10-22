'use client';

import { HugeiconsIcon as Icon } from '@hugeicons/react';
import ArrowRight01Icon from '@hugeicons/core-free-icons/ArrowRight01Icon';
import { AsciiScramble, AsciiTopography } from '@lilt-ui/registry';
import Link from 'next/link';
import type { ReactNode } from 'react';

/** The close: contour lines drifting behind a headline that decodes as it comes into view. */
export function HomeClosing({ github, children }: { github: string; children?: ReactNode }) {
  return (
    <section className="lilt-home-closing dark" aria-labelledby="closing-title">
      <div className="lilt-home-closing__ground" aria-hidden="true">
        <AsciiTopography color="#8b6cff" />
      </div>
      <div className="lilt-home-closing__copy">
        <h2 id="closing-title">
          <AsciiScramble text="Ready when your" as="span" trigger="view" duration={1.1} />{' '}
          <em>data is.</em>
        </h2>
        <p>Install a package, import the stylesheet once, and drop in a card or a scene.</p>
        <div className="lilt-home-hero__ctas">
          <Link href="/guides/installation" className="lilt-home-button">
            Read the guide
            <Icon icon={ArrowRight01Icon} size={15} strokeWidth={2} aria-hidden="true" />
          </Link>
          <a
            href={github}
            className="lilt-home-button"
            data-variant="glass"
            target="_blank"
            rel="noreferrer"
          >
            View on GitHub
          </a>
        </div>
        {children}
      </div>
    </section>
  );
}
