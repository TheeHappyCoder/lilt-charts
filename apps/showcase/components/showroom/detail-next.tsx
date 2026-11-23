import Link from 'next/link';
import { ArrowSwap } from '@/components/craft/roll';
import type { AdjacentLink } from './detail-bar';

/** Previous and Next plinth cards at the foot of every showroom detail page. */
export function DetailPager({
  prev,
  next,
  noun,
}: {
  prev: AdjacentLink | null;
  next: AdjacentLink | null;
  noun: string;
}) {
  if (!prev && !next) return null;
  return (
    <nav className="lilt-detail-pager" aria-label={`Adjacent ${noun}s`}>
      {prev ? (
        <Link href={prev.href} className="lilt-detail-pager__card">
          <span className="lilt-detail-pager__copy">
            <em>Previous {noun}</em>
            <strong>{prev.label}</strong>
          </span>
          <ArrowSwap direction="right" />
        </Link>
      ) : null}
      {next ? (
        <Link href={next.href} className="lilt-detail-pager__card" data-align="next">
          <span className="lilt-detail-pager__copy">
            <em>Next {noun}</em>
            <strong>{next.label}</strong>
          </span>
          <ArrowSwap />
        </Link>
      ) : null}
    </nav>
  );
}
