import type { Metadata } from 'next';
import { CardDocPage } from '@/components/docs/card-doc-page';
import { priceDoc } from '@/lib/card-docs/price';

export const metadata: Metadata = { title: 'Price chart' };

export default function PriceChartPage() {
  return <CardDocPage doc={priceDoc} />;
}
