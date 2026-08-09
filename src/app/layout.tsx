import type { Metadata } from 'next'
import Script from 'next/script'
import './globals.css'
import TopNav from '@/components/TopNav'
import QuickAdd from '@/features/dashboard/components/QuickAdd'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AIAdvisorProvider } from '@/components/AIAdvisorProvider'
import { ThemeProvider } from '@/components/ThemeProvider'
import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from "@vercel/speed-insights/next"

export const metadata: Metadata = {
  title: 'Personal OS',
  description: 'Personal AI Operating System',
}

// Sets data-theme on <html> before paint/hydration, reading the persisted
// preference or falling back to the design's time-of-day rule — this must be
// a blocking inline script (not useEffect) or the page flashes the wrong
// theme for a frame. ThemeProvider reads this same attribute back as its own
// initial state, so the two can never disagree.
//
// Must use next/script's beforeInteractive strategy, not a raw <script> tag
// — this app's pages stream via Suspense, and Next.js delivers streamed body
// content through a JS-based DOM-patching "reveal" mechanism rather than the
// browser's HTML parser. A plain inline <script> landing in that streamed
// content never executes (confirmed empirically: present in the final DOM,
// zero effect, no error). beforeInteractive is the one strategy Next.js
// guarantees runs before hydration regardless of streaming.
const THEME_INIT_SCRIPT = `(function(){try{
  var t = localStorage.getItem('theme');
  if (t !== 'light' && t !== 'dark') {
    var h = new Date().getHours();
    t = (h >= 6 && h < 18) ? 'light' : 'dark';
  }
  document.documentElement.setAttribute('data-theme', t);
} catch(e) {} })();`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-density="comfortable" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-background">
        <Script id="theme-init" strategy="beforeInteractive">{THEME_INIT_SCRIPT}</Script>
        <SpeedInsights/>
        <Analytics/>
        <ThemeProvider>
          <TooltipProvider>
            <AIAdvisorProvider>
              <TopNav />
              <main className="max-w-[1180px] mx-auto px-8 pt-7 pb-[70px] md:pb-0 animate-in fade-in duration-200">{children}</main>
              <QuickAdd />
            </AIAdvisorProvider>
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
