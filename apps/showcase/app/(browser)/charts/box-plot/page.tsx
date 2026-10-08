import type { Metadata } from 'next';
import { CardDocPage } from '@/components/docs/card-doc-page';
import { boxPlotDoc } from '@/lib/card-docs/box-plot';

export const metadata: Metadata = { title: 'Box plot' };

export default function BoxPlotPage() {
  return <CardDocPage doc={boxPlotDoc} />;
}
