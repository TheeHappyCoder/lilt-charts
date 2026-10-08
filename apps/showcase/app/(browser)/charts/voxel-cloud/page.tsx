import type { Metadata } from 'next';
import { CardDocPage } from '@/components/docs/card-doc-page';
import { voxelCloudDoc } from '@/lib/card-docs/spatial';
export const metadata: Metadata = { title: 'Voxel cloud' };
export default function VoxelCloudPage() {
  return <CardDocPage doc={voxelCloudDoc} />;
}
