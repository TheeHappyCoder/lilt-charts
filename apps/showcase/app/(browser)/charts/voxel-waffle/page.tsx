import type { Metadata } from 'next';
import { CardDocPage } from '@/components/docs/card-doc-page';
import { voxelWaffleDoc } from '@/lib/card-docs/cool';

export const metadata: Metadata = { title: 'Voxel waffle' };

export default function VoxelWafflePage() {
  return <CardDocPage doc={voxelWaffleDoc} />;
}
