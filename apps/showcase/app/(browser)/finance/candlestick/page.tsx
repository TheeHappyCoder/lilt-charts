import type { Metadata } from 'next';
import { CardDocPage } from '@/components/docs/card-doc-page';
import { candlestickDoc } from '@/lib/card-docs/candlestick';

export const metadata: Metadata = { title: 'Candlestick chart' };

export default function CandlestickChartPage() {
  return <CardDocPage doc={candlestickDoc} />;
}
