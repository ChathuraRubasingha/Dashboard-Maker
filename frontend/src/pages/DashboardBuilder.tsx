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
} from 'lucide-react'
import clsx from 'clsx'
import { dashboardService } from '../services/dashboardService'
import { useDashboardStore } from '../store/dashboardStore'
import DashboardCard from '../components/DashboardCard'
import AddCardModal from '../components/AddCardModal'
import type { GridLayout } from '../types'

import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'

const ResponsiveGridLayout = WidthProvider(Responsive)

export default function DashboardBuilder() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

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
    },
  })

  const removeCardMutation = useMutation({
    mutationFn: (data: { dashboardId: number; cardId: number }) =>
      dashboardService.removeCard(data.dashboardId, data.cardId),
    onSuccess: (_, variables) => {
      removeCard(variables.cardId)
      queryClient.invalidateQueries({ queryKey: ['dashboard', dashboardId] })
    },
  })

  const handleLayoutChange = useCallback(
    (_layout: GridLayout[], allLayouts: { [key: string]: GridLayout[] }) => {
      if (!isEditing) return
      setLayouts(allLayouts)
      setHasUnsavedChanges(true)
    },
    [isEditing, setLayouts, setHasUnsavedChanges]
  )

  const handleSave = async () => {
    if (!currentDashboard || !dashboardId) return

    setIsSaving(true)
    try {
      // Save card positions
      const cardsToUpdate = currentDashboard.cards.map((card) => {
        const layout = layouts.lg?.find((l) => l.i === String(card.id))
        return {
          id: card.id,
          position_x: layout?.x ?? card.position_x,
          position_y: layout?.y ?? card.position_y,
          width: layout?.w ?? card.width,
          height: layout?.h ?? card.height,
        }
      })

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
    if (dashboardId && confirm('Remove this card from the dashboard?')) {
      removeCardMutation.mutate({ dashboardId, cardId })
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!currentDashboard) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Dashboard not found</p>
        <button
          onClick={() => navigate('/dashboards')}
          className="mt-4 text-blue-600 hover:underline"
        >
          Go back to dashboards
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen -m-4 lg:-m-6">
      {/* Toolbar */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-200 px-4 lg:px-6">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/dashboards')}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <h1 className="text-lg font-semibold text-gray-900">{currentDashboard.name}</h1>
            {hasUnsavedChanges && (
              <span className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">
                Unsaved changes
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  <Plus className="w-4 h-4" />
                  Add Card
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving || !hasUnsavedChanges}
                  className={clsx(
                    'flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg',
                    hasUnsavedChanges
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-100 text-gray-400'
                  )}
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  <Eye className="w-4 h-4" />
                  Preview
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setEditing(true)}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-lg"
                >
                  <Edit3 className="w-4 h-4" />
                  Edit
                </button>
              </>
            )}
            <button className="p-2 hover:bg-gray-100 rounded-lg">
              <Share2 className="w-5 h-5 text-gray-600" />
            </button>
            <button className="p-2 hover:bg-gray-100 rounded-lg">
              <Settings className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>
      </div>

      {/* Dashboard Canvas */}
      <div
        className="p-4 lg:p-6 min-h-[calc(100vh-3.5rem)]"
        style={{ backgroundColor: currentDashboard.background_color }}
      >
        {currentDashboard.cards.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-96 bg-white rounded-lg border-2 border-dashed border-gray-300">
            <p className="text-gray-500 mb-4">No cards in this dashboard</p>
            {isEditing && (
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
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
            margin={currentDashboard.layout_config?.margin || [10, 10]}
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
    </div>
  )
}
