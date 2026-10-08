import type { Metadata } from 'next';
import { LabShell } from '@/components/lab/lab-studio';
import { SurfacesLab } from '@/components/lab/labs';

export const metadata: Metadata = { title: 'Surfaces · Customize' };

export default function Page() {
  return (
    <LabShell title="Surfaces" lede="How a card sits on your page.">
      <SurfacesLab />
    </LabShell>
  );
}
