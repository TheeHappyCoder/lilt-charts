import type { Metadata } from 'next';
import { CardDocPage } from '@/components/docs/card-doc-page';
import { contourIslandsDoc } from '@/lib/card-docs/sculpted';

export const metadata: Metadata = { title: 'Contour islands' };

export default function ContourIslandsPage() {
  return <CardDocPage doc={contourIslandsDoc} />;
}
