import { llmsIndex } from '@/lib/llms';

// Built once from the card docs, so it always matches the pages.
export const dynamic = 'force-static';

export function GET() {
  return new Response(llmsIndex(), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
