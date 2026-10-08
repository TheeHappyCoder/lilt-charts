import type { Metadata } from 'next';
import { CardDocPage } from '@/components/docs/card-doc-page';
import { ternaryPrismDoc } from '@/lib/card-docs/spatial';
export const metadata: Metadata = { title: 'Ternary prism' };
export default function TernaryPrismPage() {
  return <CardDocPage doc={ternaryPrismDoc} />;
}
