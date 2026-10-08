import type { Metadata } from 'next';
import { LabShell } from '@/components/lab/lab-studio';
import { HoverLab } from '@/components/lab/labs';

export const metadata: Metadata = { title: 'Hover · Customize' };

export default function Page() {
  return (
    <LabShell title="Hover" lede="One readout for the hovered point. Hover any chart.">
      <HoverLab />
    </LabShell>
  );
}
