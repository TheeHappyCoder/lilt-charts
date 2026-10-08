import type { Metadata } from 'next';
import { CardDocPage } from '@/components/docs/card-doc-page';
import { areaDoc } from '@/lib/card-docs/area';

export const metadata: Metadata = { title: 'Area chart' };

export default function AreaChartPage() {
  return <CardDocPage doc={areaDoc} />;
}
