import type { Metadata } from 'next';
import { LabShell } from '@/components/lab/lab-studio';
import { LoadingLab } from '@/components/lab/loading-lab';

export const metadata: Metadata = { title: 'Loading · Customize' };

export default function Page() {
  return (
    <LabShell title="Loading" lede="Every card, waiting for data, then landing it.">
      <LoadingLab />
    </LabShell>
  );
}
