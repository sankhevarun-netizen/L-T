'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Bell, ChevronDown, Layers3, Search } from 'lucide-react'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { CURRENT_USER } from '@/config/brand'
import { resolveNavItem } from '@/config/nav'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/store/ui-store'

export function Header() {
  const pathname = usePathname()
  const { title, subtitle } = resolveNavItem(pathname)
  const isStack = pathname === '/tech-stack'

  const searchQuery = useUIStore((s) => s.searchQuery)
  const setSearchQuery = useUIStore((s) => s.setSearchQuery)
  const unread = useUIStore((s) => s.unreadNotifications)
  const clearNotifications = useUIStore((s) => s.clearNotifications)

  return (
    <header className="z-20 flex h-[76px] shrink-0 items-center gap-6 border-b border-slate-200 bg-white px-6">
      {/* Page identity */}
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-[26px] font-bold leading-tight tracking-[-0.02em] text-slate-900">
          {title}
        </h1>
        <p className="truncate text-[13px] text-slate-500">{subtitle}</p>
      </div>

      {/* Global search */}
      <div className="relative hidden w-[330px] shrink-0 lg:block">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search customer, lead, project…"
          aria-label="Search customer, lead, project"
          className="h-11 rounded-xl bg-slate-50 pl-9 text-[13.5px]"
        />
      </div>

      {/*
        Tech Stack. A named entry point rather than a nav row: it is the one
        screen a client asks for by name mid-demo, and hunting the sidebar for it
        is the wrong moment to be scrolling.
      */}
      <Link
        href="/tech-stack"
        aria-current={isStack ? 'page' : undefined}
        className={cn(
          'flex h-10 shrink-0 items-center gap-1.5 rounded-xl px-3 text-[13px] font-semibold transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kpmg-blue/30',
          isStack
            ? 'bg-kpmg-navy text-white'
            : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-800',
        )}
      >
        <Layers3 className="size-4" strokeWidth={2.1} />
        <span className="hidden sm:inline">Tech Stack</span>
      </Link>

      {/* Notifications */}
      <button
        type="button"
        onClick={clearNotifications}
        aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}
        className="relative flex size-10 shrink-0 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
      >
        <Bell className="size-[21px]" strokeWidth={1.9} />
        {unread > 0 && (
          <span className="absolute right-1 top-1 flex min-w-[18px] items-center justify-center rounded-full bg-status-danger px-1 text-[10px] font-bold leading-[18px] text-white ring-2 ring-white">
            {unread}
          </span>
        )}
      </button>

      <div className="h-9 w-px shrink-0 bg-slate-200" />

      {/* User chip */}
      <DropdownMenu>
        <DropdownMenuTrigger className="flex shrink-0 items-center gap-3 rounded-xl px-1 py-1 outline-none transition-colors hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-kpmg-blue/30">
          <Avatar className="size-10">
            <AvatarFallback className="bg-kpmg-navy text-[13px]">
              {CURRENT_USER.initials}
            </AvatarFallback>
          </Avatar>
          <div className="hidden text-left leading-tight xl:block">
            <p className="text-[13.5px] font-semibold text-slate-900">
              {CURRENT_USER.name}
            </p>
            <p className="text-xs text-slate-500">{CURRENT_USER.role}</p>
          </div>
          <ChevronDown className="size-4 text-slate-400" />
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Signed in</DropdownMenuLabel>
          <DropdownMenuItem>My profile</DropdownMenuItem>
          <DropdownMenuItem>Team &amp; territories</DropdownMenuItem>
          <DropdownMenuItem>Notification settings</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem>Sign out</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
