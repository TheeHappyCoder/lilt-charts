import type { Metadata } from 'next';
import { CardDocPage } from '@/components/docs/card-doc-page';
import { horizonFoldsDoc } from '@/lib/card-docs/spatial';
export const metadata: Metadata = { title: 'Horizon folds' };
export default function HorizonFoldsPage() {
  return <CardDocPage doc={horizonFoldsDoc} />;
}
