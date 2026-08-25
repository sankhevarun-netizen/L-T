'use client'

import { create } from 'zustand'

import type { AIMode } from '@/lib/ai'

/**
 * Where the numbers on screen come from.
 *
 * Only "example" resolves to anything today. It is modelled as a selectable
 * source rather than an unstated assumption so a client sees the choice being
 * made, and sees that connecting their own data is a step someone has to take
 * rather than something that quietly already happened.
 */
export type DataSource = 'example' | 'client'

interface SettingsState {
  dataSource: DataSource
  /** No client org is connected in this build. */
  clientDataAvailable: boolean
  setDataSource: (source: DataSource) => void
  aiMode: AIMode
  /** Whether the server reports an ANTHROPIC_API_KEY; null until probed. */
  liveAvailable: boolean | null
  setAiMode: (mode: AIMode) => void
  probeLiveAvailability: () => Promise<void>
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  dataSource: 'example',
  clientDataAvailable: false,

  setDataSource: (dataSource) => {
    // Selecting a source that is not connected would show the same synthetic
    // figures under a label claiming they came from the client. Refuse it.
    if (dataSource === 'client' && !get().clientDataAvailable) return
    set({ dataSource })
  },

  aiMode: 'mock',
  liveAvailable: null,

  setAiMode: (aiMode) => {
    // Live is only selectable when the server actually holds a key.
    if (aiMode === 'live' && get().liveAvailable === false) return
    set({ aiMode })
  },

  probeLiveAvailability: async () => {
    if (get().liveAvailable !== null) return
    try {
      const response = await fetch('/api/ai')
      const data = (await response.json()) as { available?: boolean }
      set({ liveAvailable: Boolean(data.available) })
      if (!data.available) set({ aiMode: 'mock' })
    } catch {
      set({ liveAvailable: false, aiMode: 'mock' })
    }
  },
}))
