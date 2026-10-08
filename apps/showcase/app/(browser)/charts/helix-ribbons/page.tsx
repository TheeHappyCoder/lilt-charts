import type { Metadata } from 'next';
import { CardDocPage } from '@/components/docs/card-doc-page';
import { helixRibbonsDoc } from '@/lib/card-docs/spatial';
export const metadata: Metadata = { title: 'Helix ribbons' };
export default function HelixRibbonsPage() {
  return <CardDocPage doc={helixRibbonsDoc} />;
}
