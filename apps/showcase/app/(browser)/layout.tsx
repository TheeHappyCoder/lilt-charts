import { ChartSettingsProvider } from '@/components/docs/chart-settings';
import { SiteShell } from '@/components/shell/site-shell';
import { getGitHubStars } from '@/lib/github-stars';

export default async function BrowserLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const stars = await getGitHubStars();
  return (
    <ChartSettingsProvider>
      <SiteShell stars={stars}>{children}</SiteShell>
    </ChartSettingsProvider>
  );
}
