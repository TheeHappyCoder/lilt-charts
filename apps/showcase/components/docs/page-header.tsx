import type { ReactNode } from 'react';
import { PageBreadcrumb } from './page-breadcrumb';
import { PageEmblem } from './page-emblem';

/** The title every page shares: where it sits, its name, and one line on what it is. */
export function PageHeader({
  title,
  lede,
  aside,
  eyebrow,
  badge,
}: {
  /** The page name; an <em> inside it takes the site's italic voice. */
  title: ReactNode;
  /** Replaces the breadcrumb, which otherwise follows the page's place in the navigation. */
  eyebrow?: ReactNode;
  lede?: ReactNode;
  /** Something to keep at hand beside the title, such as the card's import. */
  aside?: ReactNode;
  /** A short tag beside the title, such as "New". */
  badge?: string;
}) {
  return (
    <header className="lilt-docs__header">
      <div className="lilt-docs__header-copy">
        {eyebrow ?? <PageBreadcrumb />}
        <h1>
          <PageEmblem />
          <span className="lilt-docs__title">{title}</span>
          {badge ? <span className="lilt-docs__badge">{badge}</span> : null}
        </h1>
        {lede ? <p className="lilt-docs__lede">{lede}</p> : null}
      </div>
      {aside ? <div className="lilt-docs__header-aside">{aside}</div> : null}
    </header>
  );
}
