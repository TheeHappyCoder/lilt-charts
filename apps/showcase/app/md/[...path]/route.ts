import { chartMarkdown, documentedCharts } from '@/lib/llms';

// One file per chart page, built from the same docs, so it always matches the page.
export const dynamic = 'force-static';

export function generateStaticParams() {
  return documentedCharts().map(({ route }) => ({
    path: route.pathname.split('/').filter(Boolean),
  }));
}

export async function GET(_request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const markdown = chartMarkdown(`/${path.join('/')}`);
  if (!markdown) return new Response('Not found', { status: 404 });
  // Plain text, so a browser shows it in the tab rather than downloading it.
  return new Response(markdown, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
