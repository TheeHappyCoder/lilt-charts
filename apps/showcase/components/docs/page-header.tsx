import type { ReactNode } from 'react';
import { StaticSlats } from '@/components/backgrounds/static-slats';

/** The page title every chart and lab page shares: minimal text on the left, slats on the right. */
export function PageHeader({
  title,
  lede,
  aside,
  eyebrow,
}: {
  title: string;
  /** A small line above the title, such as a breadcrumb back to an index. */
  eyebrow?: ReactNode;
  lede?: ReactNode;
  /** Something to keep at hand beside the title, such as the card's import. */
  aside?: ReactNode;
}) {
  return (
    <header className="lilt-docs__header">
      <StaticSlats className="lilt-docs__header-texture" />
      <div className="lilt-docs__header-copy">
        {eyebrow}
        <h1>{title}</h1>
        {lede ? <p className="lilt-docs__lede">{lede}</p> : null}
      </div>
      {aside ? <div className="lilt-docs__header-aside">{aside}</div> : null}
    </header>
  );
}
