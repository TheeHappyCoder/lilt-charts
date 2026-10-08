import type { Metadata } from 'next';
import { CardDocPage } from '@/components/docs/card-doc-page';
import { horizontalBarDoc } from '@/lib/card-docs/horizontal-bar';

export const metadata: Metadata = { title: 'Horizontal bar chart' };

export default function HorizontalBarChartPage() {
  return <CardDocPage doc={horizontalBarDoc} />;
}
