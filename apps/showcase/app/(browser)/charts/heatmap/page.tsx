import type { Metadata } from 'next';
import { CardDocPage } from '@/components/docs/card-doc-page';
import { heatmapDoc } from '@/lib/card-docs/heatmap';

export const metadata: Metadata = { title: 'Heatmap' };

export default function HeatmapPage() {
  return <CardDocPage doc={heatmapDoc} />;
}
