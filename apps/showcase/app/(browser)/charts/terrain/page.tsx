import type { Metadata } from 'next';
import { CardDocPage } from '@/components/docs/card-doc-page';
import { terrainDoc } from '@/lib/card-docs/cool';

export const metadata: Metadata = { title: 'Terrain' };

export default function TerrainPage() {
  return <CardDocPage doc={terrainDoc} />;
}
