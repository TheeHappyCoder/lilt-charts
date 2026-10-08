import type { Metadata } from 'next';
import { CardDocPage } from '@/components/docs/card-doc-page';
import { sankeyDoc } from '@/lib/card-docs/sankey';

export const metadata: Metadata = { title: 'Sankey chart' };

export default function SankeyChartPage() {
  return <CardDocPage doc={sankeyDoc} />;
}
