import type { Metadata } from 'next';
import { EmptyLab } from '@/components/lab/empty-lab';
import { LabShell } from '@/components/lab/lab-studio';

export const metadata: Metadata = { title: 'Empty · Customize' };

export default function Page() {
  return (
    <LabShell title="Empty" lede="Every card, with nothing to draw.">
      <EmptyLab />
    </LabShell>
  );
}
