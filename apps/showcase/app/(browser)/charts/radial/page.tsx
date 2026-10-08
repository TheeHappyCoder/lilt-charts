import type { Metadata } from 'next';
import { CardDocPage } from '@/components/docs/card-doc-page';
import { radialDoc } from '@/lib/card-docs/radial';

export const metadata: Metadata = { title: 'Radial chart' };

export default function RadialChartPage() {
  return <CardDocPage doc={radialDoc} />;
}
