import type { Metadata } from 'next'
import './globals.css'
import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'
import QuickAdd from '@/features/dashboard/components/QuickAdd'
import BottomNav from '@/components/BottomNav'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AIAdvisorProvider } from '@/components/AIAdvisorProvider'
import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from "@vercel/speed-insights/next"

export const metadata: Metadata = {
  title: 'Personal OS',
  description: 'Personal AI Operating System',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="flex h-screen overflow-hidden bg-background">
        <SpeedInsights/>
        <Analytics/>
        <TooltipProvider>
          <AIAdvisorProvider>
            <Sidebar />
            <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
              <Header />
              <main className="flex-1 min-w-0 overflow-y-auto p-6 pb-20 md:pb-6 animate-in fade-in duration-200">{children}</main>
            </div>
            <QuickAdd />
            <BottomNav />
          </AIAdvisorProvider>
        </TooltipProvider>
      </body>
    </html>
  )
}
