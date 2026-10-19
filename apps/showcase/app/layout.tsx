import { Analytics } from '@vercel/analytics/next';
import type { Metadata } from 'next';
import { Geist, Geist_Mono, Instrument_Serif } from 'next/font/google';
import { ThemeProvider } from 'next-themes';
import { TooltipProvider } from '@/components/ui/tooltip';
import './globals.css';
import '@lilt-ui/charts/styles.css';
import './studio.css';
import './docs.css';
import './lab.css';
import './api-reference.css';
import './getting-started.css';
import './motion-guide.css';
import './performance.css';
import './site-header.css';
import './site-shell.css';
import './style-menu.css';
import './gallery.css';
import './landing.css';
import './personality.css';
import '@/components/motion/blur-fade.css';
import '@/components/ui/surface.css';
import '@/components/ui/segmented.css';
import '@/components/ui/pill-select.css';
import '@/components/ui/icon-swap.css';
import '@/components/ui/card-carousel.css';
import './chart-stage.css';
import './not-found.css';

const geist = Geist({ subsets: ['latin'], variable: '--font-geist', display: 'swap' });
/** The site's italic voice: one word in a headline, as in the wordmark's Lilt. */
const serif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  style: 'italic',
  variable: '--font-serif',
  display: 'swap',
});
const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Lilt Charts',
    template: '%s · Lilt Charts',
  },
  description:
    'Expressive React charts. Fluid motion, precise inspection, and thoughtful interactions, ready to make your own.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geist.variable} ${serif.variable} ${geistMono.variable}`}
    >
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <TooltipProvider>{children}</TooltipProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
