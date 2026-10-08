import type { Metadata } from 'next';
import { LabShell } from '@/components/lab/lab-studio';
import { AxesLab } from '@/components/lab/labs';

export const metadata: Metadata = { title: 'Axes · Customize' };

export default function Page() {
  return (
    <LabShell title="Axes" lede="How much axis a chart needs.">
      <AxesLab />
    </LabShell>
  );
}
