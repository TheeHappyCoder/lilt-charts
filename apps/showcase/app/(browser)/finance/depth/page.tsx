import type { Metadata } from 'next';
import { CardDocPage } from '@/components/docs/card-doc-page';
import { depthDoc } from '@/lib/card-docs/depth';

export const metadata: Metadata = { title: 'Depth chart' };

export default function DepthChartPage() {
  return <CardDocPage doc={depthDoc} />;
}
