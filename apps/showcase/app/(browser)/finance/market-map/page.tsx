import type { Metadata } from 'next';
import { CardDocPage } from '@/components/docs/card-doc-page';
import { marketMapDoc } from '@/lib/card-docs/market-map';

export const metadata: Metadata = { title: 'Market map' };

export default function MarketMapPage() {
  return <CardDocPage doc={marketMapDoc} />;
}
