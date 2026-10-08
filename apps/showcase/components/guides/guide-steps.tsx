import Link from 'next/link';
import type { ReactNode } from 'react';

/**
 * A walkthrough: numbered steps on one line down the page, each with its code beneath it, so it
 * reads top to bottom once and needs no navigation.
 */
export function GuideSteps({ children }: { children: ReactNode }) {
  return <ol className="lilt-steps">{children}</ol>;
}

export function GuideStep({ title, children }: { title: string; children: ReactNode }) {
  const id = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return (
    <li className="lilt-step" id={id}>
      <span className="lilt-step__marker" aria-hidden="true" />
      <div className="lilt-step__body">
        <h2>{title}</h2>
        {children}
      </div>
    </li>
  );
}

/** Where to go once the walkthrough is done. */
export function GuideNext({
  links,
}: {
  links: readonly { href: string; title: string; description: string }[];
}) {
  return (
    <nav className="lilt-steps-next" aria-labelledby="lilt-steps-next-title">
      <h2 id="lilt-steps-next-title">Next</h2>
      <ul>
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href} className="lilt-steps-next__link">
              <span className="lilt-steps-next__title">{link.title}</span>
              <span className="lilt-steps-next__description">{link.description}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
