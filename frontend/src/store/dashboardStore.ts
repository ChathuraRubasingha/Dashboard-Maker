import { create } from 'zustand'
import type { Dashboard, DashboardCard, GridLayout } from '../types'

interface DashboardState {
  // Current dashboard
  currentDashboard: Dashboard | null
  isEditing: boolean
  hasUnsavedChanges: boolean

  // Layout state
  layouts: { [breakpoint: string]: GridLayout[] }
  currentBreakpoint: string

  // Filter state
  activeFilters: { [filterId: number]: unknown }

  // Actions
  setCurrentDashboard: (dashboard: Dashboard | null) => void
  setEditing: (editing: boolean) => void
  setHasUnsavedChanges: (hasChanges: boolean) => void

  // Layout actions
  setLayouts: (layouts: { [breakpoint: string]: GridLayout[] }) => void
  setCurrentBreakpoint: (breakpoint: string) => void
  updateCardLayout: (cardId: string, layout: Partial<GridLayout>) => void

  // Card actions
  addCard: (card: DashboardCard) => void
  updateCard: (cardId: number, updates: Partial<DashboardCard>) => void
  removeCard: (cardId: number) => void

  // Filter actions
  setActiveFilter: (filterId: number, value: unknown) => void
  clearFilters: () => void

  // Reset
  reset: () => void
}

const initialState = {
  currentDashboard: null,
  isEditing: false,
  hasUnsavedChanges: false,
  layouts: {},
  currentBreakpoint: 'lg',
  activeFilters: {},
}

export const useDashboardStore = create<DashboardState>((set, get) => ({
  ...initialState,

  setCurrentDashboard: (dashboard) => {
    if (dashboard) {
      // Convert cards to grid layouts for all breakpoints
      const cardLayouts = dashboard.cards.map((card) => ({
        i: String(card.id),
        x: card.position_x,
        y: card.position_y,
        w: card.width,
        h: card.height,
        minW: 2,
        minH: 2,
      }))

      // Initialize layouts for all breakpoints (responsive)
      const layouts: { [breakpoint: string]: GridLayout[] } = {
        lg: cardLayouts,
        md: cardLayouts.map(l => ({ ...l, w: Math.min(l.w, 10) })),
        sm: cardLayouts.map(l => ({ ...l, w: Math.min(l.w, 6), x: Math.min(l.x, 6 - Math.min(l.w, 6)) })),
        xs: cardLayouts.map(l => ({ ...l, w: Math.min(l.w, 4), x: 0 })),
      }
      set({ currentDashboard: dashboard, layouts, hasUnsavedChanges: false })
    } else {
      set({ currentDashboard: null, layouts: {}, hasUnsavedChanges: false })
    }
  },

  setEditing: (editing) => set({ isEditing: editing }),

  setHasUnsavedChanges: (hasChanges) => set({ hasUnsavedChanges: hasChanges }),

  setLayouts: (layouts) => set({ layouts, hasUnsavedChanges: true }),

  setCurrentBreakpoint: (breakpoint) => set({ currentBreakpoint: breakpoint }),

  updateCardLayout: (cardId, layout) => {
    const { layouts, currentBreakpoint, currentDashboard } = get()
    const currentLayouts = layouts[currentBreakpoint] || []
    const updatedLayouts = currentLayouts.map((l) =>
      l.i === cardId ? { ...l, ...layout } : l
    )

    // Also update the card in the dashboard
    if (currentDashboard) {
      const updatedCards = currentDashboard.cards.map((card) =>
        String(card.id) === cardId
          ? {
              ...card,
              position_x: layout.x ?? card.position_x,
              position_y: layout.y ?? card.position_y,
              width: layout.w ?? card.width,
              height: layout.h ?? card.height,
            }
          : card
      )
      set({
        layouts: { ...layouts, [currentBreakpoint]: updatedLayouts },
        currentDashboard: { ...currentDashboard, cards: updatedCards },
        hasUnsavedChanges: true,
      })
    } else {
      set({
        layouts: { ...layouts, [currentBreakpoint]: updatedLayouts },
        hasUnsavedChanges: true,
      })
    }
  },

  addCard: (card) => {
    const { currentDashboard, layouts } = get()
    if (!currentDashboard) return

    const newLayout: GridLayout = {
      i: String(card.id),
      x: card.position_x,
      y: card.position_y,
      w: card.width,
      h: card.height,
      minW: 2,
      minH: 2,
    }

    // Add to all breakpoints
    const updatedLayouts = {
      lg: [...(layouts.lg || []), newLayout],
      md: [...(layouts.md || []), { ...newLayout, w: Math.min(newLayout.w, 10) }],
      sm: [...(layouts.sm || []), { ...newLayout, w: Math.min(newLayout.w, 6), x: 0 }],
      xs: [...(layouts.xs || []), { ...newLayout, w: Math.min(newLayout.w, 4), x: 0 }],
    }

    set({
      currentDashboard: {
        ...currentDashboard,
        cards: [...currentDashboard.cards, card],
      },
      layouts: updatedLayouts,
      hasUnsavedChanges: true,
    })
  },

  updateCard: (cardId, updates) => {
    const { currentDashboard } = get()
    if (!currentDashboard) return

    const updatedCards = currentDashboard.cards.map((card) =>
      card.id === cardId ? { ...card, ...updates } : card
    )

    set({
      currentDashboard: { ...currentDashboard, cards: updatedCards },
      hasUnsavedChanges: true,
    })
  },

  removeCard: (cardId) => {
    const { currentDashboard, layouts } = get()
    if (!currentDashboard) return

    const updatedCards = currentDashboard.cards.filter((card) => card.id !== cardId)
    const cardIdStr = String(cardId)

    // Remove from all breakpoints
    const updatedLayouts = {
      lg: (layouts.lg || []).filter((l) => l.i !== cardIdStr),
      md: (layouts.md || []).filter((l) => l.i !== cardIdStr),
      sm: (layouts.sm || []).filter((l) => l.i !== cardIdStr),
      xs: (layouts.xs || []).filter((l) => l.i !== cardIdStr),
    }

    set({
      currentDashboard: { ...currentDashboard, cards: updatedCards },
      layouts: updatedLayouts,
      hasUnsavedChanges: true,
    })
  },

  setActiveFilter: (filterId, value) => {
    set((state) => ({
      activeFilters: { ...state.activeFilters, [filterId]: value },
    }))
  },

  clearFilters: () => set({ activeFilters: {} }),

  reset: () => set(initialState),
}))
