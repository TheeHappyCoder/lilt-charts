import type { Metadata } from 'next';
import { CardDocPage } from '@/components/docs/card-doc-page';
import { watchlistDoc } from '@/lib/card-docs/watchlist';

export const metadata: Metadata = { title: 'Watchlist' };

export default function WatchlistPage() {
  return <CardDocPage doc={watchlistDoc} />;
}
