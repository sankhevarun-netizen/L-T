'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ChevronDown,
  CircleCheck,
  Gauge,
  Play,
  RotateCcw,
  Sparkles,
  UserRound,
  Workflow,
  Zap,
} from 'lucide-react'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { HERO_LEAD_ID } from '@/lib/selectors/use-overview-data'
import { useCrmStore } from '@/store/crm-store'
import { useSettingsStore } from '@/store/settings-store'
import { cn } from '@/lib/utils'

/**
 * Presenter controls: reset the dataset, jump straight to a demo beat, and
 * switch the AI service between mock and live.
 */
export function DemoMenu() {
  const router = useRouter()
  const resetDemoData = useCrmStore((s) => s.resetDemoData)
  const activityCount = useCrmStore((s) => s.activities.length)

  const dataSource = useSettingsStore((s) => s.dataSource)
  const setDataSource = useSettingsStore((s) => s.setDataSource)
  const setFeedbackSource = useCrmStore((s) => s.setFeedbackSource)

  const aiMode = useSettingsStore((s) => s.aiMode)
  const setAiMode = useSettingsStore((s) => s.setAiMode)
  const liveAvailable = useSettingsStore((s) => s.liveAvailable)
  const probe = useSettingsStore((s) => s.probeLiveAvailability)

  const [justReset, setJustReset] = useState(false)

  // Ask the server once whether a key is configured.
  useEffect(() => {
    void probe()
  }, [probe])

  function handleReset() {
    // Restore the feed that is actually selected, not always the example one.
    resetDemoData(dataSource)
    setJustReset(true)
    setTimeout(() => setJustReset(false), 1800)
  }

  return (
    <div className="flex items-center gap-2">
      {activityCount > 0 && (
        <span className="rounded-full bg-kpmg-teal/10 px-2 py-0.5 text-[11px] font-semibold text-kpmg-teal">
          {activityCount} CRM write{activityCount === 1 ? '' : 's'}
        </span>
      )}

      {justReset && (
        <span className="flex items-center gap-1 text-[11px] font-semibold text-status-success">
          <CircleCheck className="size-3" />
          Demo data reset
        </span>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn(
            'flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium outline-none transition-colors',
            'text-slate-500 hover:bg-slate-100 hover:text-slate-800',
            'focus-visible:ring-2 focus-visible:ring-kpmg-blue/30',
          )}
        >
          <Sparkles className="size-3.5" />
          Demo
          <ChevronDown className="size-3" />
        </DropdownMenuTrigger>

        <DropdownMenuContent align="start" className="w-[264px]">
          <DropdownMenuLabel>Run the story</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => router.push('/live-transcript')}>
            <Play />
            Play the hot-lead transcript
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => router.push(`/customers/${HERO_LEAD_ID}`)}
          >
            <UserRound />
            Jump to Priya Shah&apos;s 360
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push('/ai-insights')}>
            <Zap />
            Open the agent gallery
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => router.push('/csat-nps/detractor-recovery')}
          >
            <Gauge />
            Run the CSAT story
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push('/platform')}>
            <Workflow />
            Show the architecture
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuLabel>Data source</DropdownMenuLabel>
          <div className="px-1.5 pb-1">
            <div className="flex rounded-lg border border-slate-200 p-0.5">
              {(
                [
                  { key: 'example' as const, label: 'Example' },
                  { key: 'client' as const, label: 'Client' },
                ]
              ).map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => {
                    setDataSource(option.key)
                    // Regenerate the feedback book so the switch actually
                    // changes the figures rather than only the label.
                    setFeedbackSource(option.key)
                  }}
                  className={cn(
                    'flex-1 rounded-md px-2 py-1 text-[11.5px] font-semibold transition-colors',
                    dataSource === option.key
                      ? 'bg-kpmg-navy text-white'
                      : 'text-slate-500 hover:text-slate-800',
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <p className="mt-1.5 px-1 text-[10.5px] leading-snug text-slate-400">
              {dataSource === 'client'
                ? 'Reading the connected org feed. Every figure on every screen reloads.'
                : 'Reading the example book. Switch to compare the same screens against a different feed.'}
            </p>
          </div>

          <DropdownMenuSeparator />

          <DropdownMenuLabel>AI mode</DropdownMenuLabel>
          <div className="px-1.5 pb-1">
            <div className="flex rounded-lg border border-slate-200 p-0.5">
              {(['mock', 'live'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setAiMode(mode)}
                  className={cn(
                    'flex-1 rounded-md px-2 py-1 text-[11.5px] font-semibold capitalize transition-colors',
                    aiMode === mode
                      ? 'bg-kpmg-navy text-white'
                      : 'text-slate-500 hover:text-slate-800',
                  )}
                >
                  {mode}
                </button>
              ))}
            </div>
            <p className="mt-1.5 px-1 text-[10.5px] leading-snug text-slate-400">
              {aiMode === 'live'
                ? 'Reasoning runs through the model route. Narrative varies; the underlying figures never do.'
                : 'Deterministic narrative. Identical wording on every run.'}
            </p>
          </div>

          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={handleReset}>
            <RotateCcw />
            Reset demo data
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
