import { Suspense } from 'react';
import { RailShell } from '@/components/shell/rail-shell';
import { ChartSettingsProvider } from '@/components/docs/chart-settings';
import { getDownloads } from '@/lib/npm-downloads';
import { getGitHubStars } from '@/lib/github-stars';

export default async function BrowserLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const [downloads, stars] = await Promise.all([getDownloads(), getGitHubStars()]);
  return (
    <Suspense fallback={<div className="lilt-shell" data-layout="rail" />}>
      <ChartSettingsProvider>
        <RailShell downloads={downloads} stars={stars}>
          {children}
        </RailShell>
      </ChartSettingsProvider>
    </Suspense>
  );
}
