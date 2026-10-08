import type { Metadata } from 'next';
import { CardDocPage } from '@/components/docs/card-doc-page';
import { rangeDoc } from '@/lib/card-docs/range';

export const metadata: Metadata = { title: 'Range chart' };

export default function RangeChartPage() {
  return <CardDocPage doc={rangeDoc} />;
}
