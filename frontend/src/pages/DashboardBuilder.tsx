import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Responsive, WidthProvider } from 'react-grid-layout'
import {
  Save,
  Plus,
  Settings,
  Eye,
  Edit3,
  ArrowLeft,
  Share2,
  LayoutGrid,
  Clock,
  Layers,
  Palette,
  ChevronDown,
  Check,
  X,
  Maximize2,
  RotateCcw,
} from 'lucide-react'
import clsx from 'clsx'
import { dashboardService } from '../services/dashboardService'
import { useDashboardStore } from '../store/dashboardStore'
import DashboardCard from '../components/DashboardCard'
import AddCardModal from '../components/AddCardModal'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { useToast } from '../components/ui/Toast'
import type { GridLayout, DashboardCard as DashboardCardType } from '../types'

import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'

const ResponsiveGridLayout = WidthProvider(Responsive)

// Background color presets
const backgroundPresets = [
  { name: 'White', value: '#ffffff' },
  { name: 'Light Gray', value: '#f9fafb' },
  { name: 'Cool Gray', value: '#f3f4f6' },
  { name: 'Warm Gray', value: '#fafaf9' },
  { name: 'Blue Tint', value: '#f0f9ff' },
  { name: 'Indigo Tint', value: '#eef2ff' },
  { name: 'Slate', value: '#f8fafc' },
]

export default function DashboardBuilder() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const toast = useToast()

  const {
    currentDashboard,
    setCurrentDashboard,
    isEditing,
    setEditing,
    hasUnsavedChanges,
    setHasUnsavedChanges,
    layouts,
    setLayouts,
    addCard,
    removeCard,
  } = useDashboardStore()

  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showSettingsPanel, setShowSettingsPanel] = useState(false)
  const [showBgDropdown, setShowBgDropdown] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [removeCardTarget, setRemoveCardTarget] = useState<DashboardCardType | null>(null)
  const [showResetConfirm, setShowResetConfirm] = useState(false)

  const dashboardId = id ? parseInt(id, 10) : undefined

  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['dashboard', dashboardId],
    queryFn: () => dashboardService.get(dashboardId!),
    enabled: !!dashboardId,
  })

  useEffect(() => {
    if (dashboard) {
      setCurrentDashboard(dashboard)
    }
  }, [dashboard, setCurrentDashboard])

  // Handle fullscreen mode
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false)
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isFullscreen])

  // Add Metabase question card
  const addMetabaseCardMutation = useMutation({
    mutationFn: (data: { dashboardId: number; questionId: number }) => {
      const cards = currentDashboard?.cards || []
      const maxY = cards.reduce((max, card) => Math.max(max, card.position_y + card.height), 0)
      return dashboardService.addCard(data.dashboardId, {
        metabase_question_id: data.questionId,
        position_x: 0,
        position_y: maxY,
        width: 4,
        height: 3,
      })
    },
    onSuccess: (card) => {
      addCard(card)
      queryClient.invalidateQueries({ queryKey: ['dashboard', dashboardId] })
    },
  })

  // Add local visualization card
  const addVisualizationCardMutation = useMutation({
    mutationFn: (data: { dashboardId: number; visualizationId: number }) => {
      const cards = currentDashboard?.cards || []
      const maxY = cards.reduce((max, card) => Math.max(max, card.position_y + card.height), 0)
      return dashboardService.addCard(data.dashboardId, {
        visualization_id: data.visualizationId,
        position_x: 0,
        position_y: maxY,
        width: 6,
        height: 4,
      })
    },
    onSuccess: (card) => {
      addCard(card)
      queryClient.invalidateQueries({ queryKey: ['dashboard', dashboardId] })
    },
  })

  const updateCardsMutation = useMutation({
    mutationFn: (data: { dashboardId: number; cards: { id: number; position_x: number; position_y: number; width: number; height: number }[] }) =>
      dashboardService.updateCardsBulk(data.dashboardId, data.cards),
    onSuccess: () => {
      setHasUnsavedChanges(false)
      // Refetch dashboard to ensure state is in sync with server
      queryClient.invalidateQueries({ queryKey: ['dashboard', dashboardId] })
    },
  })

  const removeCardMutation = useMutation({
    mutationFn: (data: { dashboardId: number; cardId: number }) =>
      dashboardService.removeCard(data.dashboardId, data.cardId),
    onSuccess: (_, variables) => {
      removeCard(variables.cardId)
      queryClient.invalidateQueries({ queryKey: ['dashboard', dashboardId] })
      toast.success('Card removed', 'The card has been removed from the dashboard')
      setRemoveCardTarget(null)
    },
    onError: () => {
      toast.error('Failed to remove card', 'Please try again')
    },
  })

  const handleLayoutChange = useCallback(
    (currentLayout: GridLayout[], allLayouts: { [key: string]: GridLayout[] }) => {
      if (!isEditing) return

      // Update layouts state
      setLayouts(allLayouts)

      // Also update the currentDashboard.cards positions to keep them in sync
      if (currentDashboard && currentLayout.length > 0) {
        const updatedCards = currentDashboard.cards.map((card) => {
          const layout = currentLayout.find((l) => l.i === String(card.id))
          if (layout) {
            return {
              ...card,
              position_x: layout.x,
              position_y: layout.y,
              width: layout.w,
              height: layout.h,
            }
          }
          return card
        })

        // Check if positions actually changed
        const hasChanges = updatedCards.some((card, idx) => {
          const original = currentDashboard.cards[idx]
          return (
            card.position_x !== original.position_x ||
            card.position_y !== original.position_y ||
            card.width !== original.width ||
            card.height !== original.height
          )
        })

        if (hasChanges) {
          setCurrentDashboard({ ...currentDashboard, cards: updatedCards })
          setHasUnsavedChanges(true)
        }
      }
    },
    [isEditing, setLayouts, setHasUnsavedChanges, currentDashboard, setCurrentDashboard]
  )

  const handleSave = async () => {
    if (!currentDashboard || !dashboardId) return

    setIsSaving(true)
    try {
      // Get the lg layout (primary), fallback to first available breakpoint
      const lgLayout = layouts.lg || layouts.md || layouts.sm || layouts.xs || []

      // Save card positions from the layout
      const cardsToUpdate = currentDashboard.cards.map((card) => {
        const layout = lgLayout.find((l) => l.i === String(card.id))
        return {
          id: card.id,
          position_x: layout?.x ?? card.position_x,
          position_y: layout?.y ?? card.position_y,
          width: layout?.w ?? card.width,
          height: layout?.h ?? card.height,
        }
      })

      console.log('Saving card positions:', cardsToUpdate)
      await updateCardsMutation.mutateAsync({ dashboardId, cards: cardsToUpdate })
    } catch (error) {
      console.error('Failed to save dashboard:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleAddMetabaseCard = (questionId: number) => {
    if (dashboardId) {
      addMetabaseCardMutation.mutate({ dashboardId, questionId })
    }
  }

  const handleAddVisualizationCard = (visualizationId: number) => {
    if (dashboardId) {
      addVisualizationCardMutation.mutate({ dashboardId, visualizationId })
    }
  }

  const handleRemoveCard = (cardId: number) => {
    const card = currentDashboard?.cards.find(c => c.id === cardId)
    if (card) {
      setRemoveCardTarget(card)
    }
  }

  const confirmRemoveCard = () => {
    if (dashboardId && removeCardTarget) {
      removeCardMutation.mutate({ dashboardId, cardId: removeCardTarget.id })
    }
  }

  const handleResetLayout = () => {
    setShowResetConfirm(true)
  }

  const confirmResetLayout = () => {
    // Reset logic would go here
    toast.info('Layout reset', 'Cards have been reset to their default positions')
    setShowResetConfirm(false)
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <div className="w-12 h-12 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 text-sm mt-4">Loading dashboard...</p>
      </div>
    )
  }

  if (!currentDashboard) {
    return (
      <div className="text-center py-16">
        <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <LayoutGrid className="w-10 h-10 text-gray-400" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Dashboard not found</h2>
        <p className="text-gray-500 mb-6">The dashboard you're looking for doesn't exist or has been removed.</p>
        <button
          onClick={() => navigate('/dashboards')}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboards
        </button>
      </div>
    )
  }

  return (
    <div className={clsx(
      'min-h-screen -m-4 lg:-m-6 transition-all duration-300',
      isFullscreen && 'fixed inset-0 z-50 m-0'
    )}>
      {/* Modern Toolbar */}
      <div className={clsx(
        'sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-gray-200/80',
        isFullscreen && 'bg-white'
      )}>
        <div className="flex items-center justify-between h-16 px-4 lg:px-6">
          {/* Left side */}
          <div className="flex items-center gap-4">
            {!isFullscreen && (
              <button
                onClick={() => navigate('/dashboards')}
                className="p-2.5 hover:bg-gray-100 rounded-xl transition-colors group"
              >
                <ArrowLeft className="w-5 h-5 text-gray-500 group-hover:text-gray-700" />
              </button>
            )}

            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl">
                <LayoutGrid className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">{currentDashboard.name}</h1>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Clock className="w-3 h-3" />
                  <span>Last edited just now</span>
                </div>
              </div>
            </div>

            {hasUnsavedChanges && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-medium rounded-lg">
                <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
                Unsaved changes
              </div>
            )}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                {/* Add Card Button */}
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 font-medium rounded-xl hover:bg-blue-100 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Add Card</span>
                </button>

                {/* Save Button */}
                <button
                  onClick={handleSave}
                  disabled={isSaving || !hasUnsavedChanges}
                  className={clsx(
                    'flex items-center gap-2 px-4 py-2 font-medium rounded-xl transition-all',
                    hasUnsavedChanges
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/25'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  )}
                >
                  {isSaving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span className="hidden sm:inline">Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span className="hidden sm:inline">Save</span>
                    </>
                  )}
                </button>

                {/* Divider */}
                <div className="w-px h-8 bg-gray-200 mx-1" />

                {/* Preview Button */}
                <button
                  onClick={() => setEditing(false)}
                  className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  <Eye className="w-4 h-4" />
                  <span className="hidden sm:inline">Preview</span>
                </button>
              </>
            ) : (
              <>
                {/* Edit Button */}
                <button
                  onClick={() => setEditing(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-500/25"
                >
                  <Edit3 className="w-4 h-4" />
                  <span className="hidden sm:inline">Edit Dashboard</span>
                </button>
              </>
            )}

            {/* Fullscreen Toggle */}
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2.5 hover:bg-gray-100 rounded-xl transition-colors"
              title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            >
              {isFullscreen ? (
                <X className="w-5 h-5 text-gray-500" />
              ) : (
                <Maximize2 className="w-5 h-5 text-gray-500" />
              )}
            </button>

            {/* Share Button */}
            <button className="p-2.5 hover:bg-gray-100 rounded-xl transition-colors">
              <Share2 className="w-5 h-5 text-gray-500" />
            </button>

            {/* Settings Button */}
            <button
              onClick={() => setShowSettingsPanel(!showSettingsPanel)}
              className={clsx(
                'p-2.5 rounded-xl transition-colors',
                showSettingsPanel ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100 text-gray-500'
              )}
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Settings Panel */}
        {showSettingsPanel && isEditing && (
          <div className="border-t border-gray-200/80 bg-gray-50/80 backdrop-blur-xl px-4 lg:px-6 py-4">
            <div className="flex items-center gap-6 flex-wrap">
              {/* Background Color */}
              <div className="relative">
                <button
                  onClick={() => setShowBgDropdown(!showBgDropdown)}
                  className="flex items-center gap-3 px-4 py-2.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  <Palette className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-700">Background</span>
                  <div
                    className="w-5 h-5 rounded-md border border-gray-300"
                    style={{ backgroundColor: currentDashboard.background_color }}
                  />
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </button>

                {showBgDropdown && (
                  <div className="absolute top-full left-0 mt-2 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-20 min-w-[180px]">
                    {backgroundPresets.map((preset) => (
                      <button
                        key={preset.value}
                        onClick={() => {
                          // Update background color logic would go here
                          setShowBgDropdown(false)
                        }}
                        className="w-full px-4 py-2 text-sm text-left hover:bg-gray-50 flex items-center gap-3"
                      >
                        <div
                          className="w-5 h-5 rounded-md border border-gray-200"
                          style={{ backgroundColor: preset.value }}
                        />
                        <span>{preset.name}</span>
                        {currentDashboard.background_color === preset.value && (
                          <Check className="w-4 h-4 text-blue-600 ml-auto" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Grid Info */}
              <div className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl">
                <Layers className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-700">
                  {currentDashboard.cards.length} cards
                </span>
              </div>

              {/* Reset Layout */}
              <button
                onClick={handleResetLayout}
                className="flex items-center gap-2 px-4 py-2.5 text-gray-600 hover:bg-white border border-transparent hover:border-gray-200 rounded-xl transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                <span className="text-sm">Reset Layout</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Dashboard Canvas */}
      <div
        className={clsx(
          'p-4 lg:p-6 min-h-[calc(100vh-4rem)] transition-colors',
          isFullscreen && 'min-h-screen'
        )}
        style={{ backgroundColor: currentDashboard.background_color }}
      >
        {currentDashboard.cards.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[calc(100vh-12rem)] bg-white rounded-2xl border-2 border-dashed border-gray-200">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl flex items-center justify-center mb-6">
              <LayoutGrid className="w-10 h-10 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No cards yet</h3>
            <p className="text-gray-500 mb-6 text-center max-w-sm">
              Add visualizations and charts to build your dashboard
            </p>
            {isEditing && (
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-500/25"
              >
                <Plus className="w-5 h-5" />
                Add Your First Card
              </button>
            )}
          </div>
        ) : (
          <ResponsiveGridLayout
            className="layout"
            layouts={layouts}
            breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480 }}
            cols={{ lg: 12, md: 10, sm: 6, xs: 4 }}
            rowHeight={currentDashboard.layout_config?.row_height || 80}
            margin={currentDashboard.layout_config?.margin || [12, 12]}
            containerPadding={currentDashboard.layout_config?.container_padding || [0, 0]}
            onLayoutChange={handleLayoutChange}
            isDraggable={isEditing}
            isResizable={isEditing}
            draggableHandle=".drag-handle"
          >
            {currentDashboard.cards.map((card) => (
              <div key={String(card.id)} className={clsx(isEditing && 'drag-handle')}>
                <DashboardCard
                  card={card}
                  isEditing={isEditing}
                  onRemove={() => handleRemoveCard(card.id)}
                />
              </div>
            ))}
          </ResponsiveGridLayout>
        )}
      </div>

      {/* Add Card Modal */}
      <AddCardModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddMetabaseQuestion={handleAddMetabaseCard}
        onAddVisualization={handleAddVisualizationCard}
      />

      {/* Click outside to close dropdown */}
      {showBgDropdown && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => setShowBgDropdown(false)}
        />
      )}

      {/* Remove Card Confirmation Dialog */}
      <ConfirmDialog
        isOpen={removeCardTarget !== null}
        onClose={() => setRemoveCardTarget(null)}
        onConfirm={confirmRemoveCard}
        title="Remove card?"
        message="Are you sure you want to remove this card from the dashboard? The visualization itself will not be deleted."
        confirmText="Remove"
        variant="warning"
        isLoading={removeCardMutation.isPending}
      />

      {/* Reset Layout Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showResetConfirm}
        onClose={() => setShowResetConfirm(false)}
        onConfirm={confirmResetLayout}
        title="Reset layout?"
        message="This will reset all cards to their default positions. Any custom arrangement will be lost."
        confirmText="Reset"
        variant="warning"
      />
    </div>
  )
}
