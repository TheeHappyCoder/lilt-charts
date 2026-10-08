import type { Metadata } from 'next';
import { LabShell } from '@/components/lab/lab-studio';
import { SyncLab } from '@/components/features/feature-labs';

export const metadata: Metadata = { title: 'Sync hover · Features' };

export default function Page() {
  return (
    <LabShell title="Sync hover" lede="Several cards, one moment.">
      <SyncLab />
    </LabShell>
  );
}
