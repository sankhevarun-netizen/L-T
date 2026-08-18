'use client'

import { create } from 'zustand'

interface UIState {
  sidebarCollapsed: boolean
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void

  searchQuery: string
  setSearchQuery: (query: string) => void

  unreadNotifications: number
  clearNotifications: () => void
}

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  toggleSidebar: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),

  searchQuery: '',
  setSearchQuery: (searchQuery) => set({ searchQuery }),

  unreadNotifications: 7,
  clearNotifications: () => set({ unreadNotifications: 0 }),
}))
