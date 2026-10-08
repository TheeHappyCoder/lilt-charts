import type { Metadata } from 'next';
import { CardDocPage } from '@/components/docs/card-doc-page';
import { barDoc } from '@/lib/card-docs/bar';

export const metadata: Metadata = { title: 'Bar chart' };

export default function BarChartPage() {
  return <CardDocPage doc={barDoc} />;
}
