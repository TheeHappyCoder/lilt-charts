import type { Metadata } from 'next';
import { CardDocPage } from '@/components/docs/card-doc-page';
import { indicatorDoc } from '@/lib/card-docs/indicator';

export const metadata: Metadata = { title: 'Indicator chart' };

export default function IndicatorChartPage() {
  return <CardDocPage doc={indicatorDoc} />;
}
