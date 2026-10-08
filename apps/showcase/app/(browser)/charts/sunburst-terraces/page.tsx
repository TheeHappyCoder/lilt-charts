import type { Metadata } from 'next';
import { CardDocPage } from '@/components/docs/card-doc-page';
import { sunburstTerracesDoc } from '@/lib/card-docs/spatial';
export const metadata: Metadata = { title: 'Sunburst terraces' };
export default function SunburstTerracesPage() {
  return <CardDocPage doc={sunburstTerracesDoc} />;
}
