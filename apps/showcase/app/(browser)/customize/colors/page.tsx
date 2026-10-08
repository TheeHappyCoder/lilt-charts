import type { Metadata } from 'next';
import { LabShell } from '@/components/lab/lab-studio';
import { ColorsLab } from '@/components/lab/labs';

export const metadata: Metadata = { title: 'Colors · Customize' };

export default function Page() {
  return (
    <LabShell title="Colors" lede="Validated palettes, in every card family at once.">
      <ColorsLab />
    </LabShell>
  );
}
