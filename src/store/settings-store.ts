'use client'

import { create } from 'zustand'

import type { AIMode } from '@/lib/ai'

interface SettingsState {
  aiMode: AIMode
  /** Whether the server reports an ANTHROPIC_API_KEY; null until probed. */
  liveAvailable: boolean | null
  setAiMode: (mode: AIMode) => void
  probeLiveAvailability: () => Promise<void>
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
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
