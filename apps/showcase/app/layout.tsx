import { Analytics } from '@vercel/analytics/next';
import type { Metadata } from 'next';
import { Geist_Mono, Manrope } from 'next/font/google';
import { ThemeProvider } from 'next-themes';
import { TooltipProvider } from '@/components/ui/tooltip';
import './globals.css';
import '@lilt-ui/charts/styles.css';
import './studio.css';
import './docs.css';
import './lab.css';
import './home.css';
import './home-story.css';
import './home-scenes.css';
import './home-craft.css';
import './home-flight.css';
import './home-scroll.css';
import './tuner.css';
import './api-reference.css';
import './getting-started.css';
import './motion-guide.css';
import './performance.css';
import './shell.css';
import './rail-shell.css';
import './style-notch.css';
import '@/components/motion/blur-fade.css';
import '@/components/ui/surface.css';
import '@/components/ui/segmented.css';
import '@/components/ui/pill-select.css';
import '@/components/ui/icon-swap.css';
import '@/components/ui/card-carousel.css';
import './chart-stage.css';
import './not-found.css';

const manrope = Manrope({ subsets: ['latin'], variable: '--font-manrope', display: 'swap' });
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
      className={`${manrope.variable} ${geistMono.variable}`}
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
