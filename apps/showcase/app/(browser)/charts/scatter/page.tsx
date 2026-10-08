import type { Metadata } from 'next';
import { CardDocPage } from '@/components/docs/card-doc-page';
import { scatterDoc } from '@/lib/card-docs/scatter';

export const metadata: Metadata = { title: 'Scatter chart' };

export default function ScatterChartPage() {
  return <CardDocPage doc={scatterDoc} />;
}
