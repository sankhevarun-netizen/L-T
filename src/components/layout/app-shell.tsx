'use client'

import type { ReactNode } from 'react'

import { DemoMenu } from './demo-menu'
import { DemoNotice } from './demo-notice'
import { Header } from './header'
import { LastUpdated } from './last-updated'
import { Sidebar } from './sidebar'
import { TooltipProvider } from '@/components/ui/tooltip'

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <TooltipProvider delayDuration={80}>
      <div className="flex h-screen w-full overflow-hidden bg-background">
        <Sidebar />

        <div className="flex min-w-0 flex-1 flex-col">
          <Header />

          <main className="scrollbar-slim flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-[1600px] px-6 pb-8 pt-3">
              <div className="flex items-center justify-between gap-4">
                <DemoMenu />
                <LastUpdated />
              </div>
              <div className="mt-2">{children}</div>
            </div>
          </main>
        </div>
      </div>

      <DemoNotice />
    </TooltipProvider>
  )
}
