import type { Metadata } from 'next';
import { LabShell } from '@/components/lab/lab-studio';
import { LegendsLab } from '@/components/lab/legends-lab';

export const metadata: Metadata = { title: 'Legends · Customize' };

export default function Page() {
  return (
    <LabShell title="Legends" lede="Five layouts and three marks. One prop each.">
      <LegendsLab />
    </LabShell>
  );
}
