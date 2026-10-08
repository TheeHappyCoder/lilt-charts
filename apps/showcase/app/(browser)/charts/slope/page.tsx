import type { Metadata } from 'next';
import { CardDocPage } from '@/components/docs/card-doc-page';
import { slopeDoc } from '@/lib/card-docs/slope';

export const metadata: Metadata = { title: 'Slope chart' };

export default function SlopeChartPage() {
  return <CardDocPage doc={slopeDoc} />;
}
