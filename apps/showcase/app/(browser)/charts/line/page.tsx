import type { Metadata } from 'next';
import { CardDocPage } from '@/components/docs/card-doc-page';
import { lineDoc } from '@/lib/card-docs/line';

export const metadata: Metadata = { title: 'Line chart' };

export default function LineChartPage() {
  return <CardDocPage doc={lineDoc} />;
}
