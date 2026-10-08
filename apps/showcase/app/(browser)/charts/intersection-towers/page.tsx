import type { Metadata } from 'next';
import { CardDocPage } from '@/components/docs/card-doc-page';
import { intersectionTowersDoc } from '@/lib/card-docs/spatial';
export const metadata: Metadata = { title: 'Intersection towers' };
export default function IntersectionTowersPage() {
  return <CardDocPage doc={intersectionTowersDoc} />;
}
