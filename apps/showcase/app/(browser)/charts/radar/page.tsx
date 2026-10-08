import type { Metadata } from 'next';
import { CardDocPage } from '@/components/docs/card-doc-page';
import { radarDoc } from '@/lib/card-docs/radar';

export const metadata: Metadata = { title: 'Radar chart' };

export default function RadarChartPage() {
  return <CardDocPage doc={radarDoc} />;
}
