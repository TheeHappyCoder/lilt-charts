import type { Metadata } from 'next';
import { PageHeader } from '@/components/docs/page-header';
import { ChartGallery } from '@/components/gallery/chart-gallery';

export const metadata: Metadata = { title: 'Charts' };

/** Every chart family at a glance, live, grouped by the job it does. */
export default function ChartsPage() {
  return (
    <article className="lilt-docs lilt-docs--wide">
      <PageHeader
        eyebrow={<span className="lilt-breadcrumb">Charts</span>}
        title={
          <>
            Every chart, by the <em>job</em> it does
          </>
        }
        lede="Each family is one card with the same props, motion and inspection. Pick one to see its situations, its code and its data."
      />
      <ChartGallery />
    </article>
  );
}
