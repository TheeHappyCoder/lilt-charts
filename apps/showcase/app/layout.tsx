import { Analytics } from '@vercel/analytics/next';
import type { Metadata } from 'next';
import { Geist_Mono, Mona_Sans } from 'next/font/google';
import { ThemeProvider } from 'next-themes';
import { REVEAL_BOOT, RevealObserver } from '@/components/craft/reveal';
import { BlurTransition } from '@/components/shell/blur-transition';
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
import './showroom.css';
import './landing.css';
import './home.css';
import './personality.css';
import '@/components/motion/blur-fade.css';
import '@/components/ui/surface.css';
import '@/components/ui/segmented.css';
import '@/components/ui/field.css';
import '@/components/ui/pill-select.css';
import '@/components/ui/icon-swap.css';
import '@/components/ui/card-carousel.css';
import './chart-stage.css';
import './not-found.css';
import './ascii.css';
import '@/components/craft/craft.css';

/** The site's one face: Mona Sans, read at 450 with tight tracking. */
const mona = Mona_Sans({ subsets: ['latin'], variable: '--font-mona', display: 'swap' });
/** Mono is kept for code, install commands and API identifiers. */
const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Lilt UI',
    template: '%s · Lilt UI',
  },
  description:
    'Expressive React components: charts and living ASCII scenes. Fluid motion, precise inspection, and thoughtful interactions, ready to make your own.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${mona.variable} ${geistMono.variable}`}>
      <head>
        {/* Reveals switch on before the first paint, so nothing shows and then hides. */}
        <script dangerouslySetInnerHTML={{ __html: REVEAL_BOOT }} />
      </head>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <TooltipProvider>{children}</TooltipProvider>
          <BlurTransition />
          <RevealObserver />
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
