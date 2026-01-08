import { useState, useEffect } from 'react'
import { MoreVertical, Maximize2, Minimize2, RefreshCw, Trash2, Settings } from 'lucide-react'
import clsx from 'clsx'
import type { DashboardCard as DashboardCardType, QueryResult } from '../types'
import { metabaseService } from '../services/metabaseService'
import ChartRenderer from './ChartRenderer'

interface Props {
  card: DashboardCardType
  isEditing: boolean
  onRemove?: () => void
  onSettings?: () => void
}

export default function DashboardCard({ card, isEditing, onRemove, onSettings }: Props) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<QueryResult | null>(null)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const fetchData = async () => {
    if (!card.metabase_question_id) return

    setIsLoading(true)
    setError(null)

    try {
      const result = await metabaseService.executeQuestion(card.metabase_question_id)
      setData(result)
    } catch (err) {
      setError('Failed to load data')
      console.error('Error fetching card data:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [card.metabase_question_id])

  const cardStyle = card.custom_styling || {
    border_radius: 8,
    border_color: '#e2e8f0',
    border_width: 1,
    shadow: 'sm',
    background_color: '#ffffff',
    padding: 16,
  }

  const shadowClasses = {
    none: '',
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-lg',
  }

  return (
    <div
      className={clsx(
        'h-full flex flex-col overflow-hidden',
        shadowClasses[cardStyle.shadow as keyof typeof shadowClasses] || 'shadow-sm',
        isEditing && 'cursor-move'
      )}
      style={{
        borderRadius: cardStyle.border_radius,
        borderWidth: cardStyle.border_width,
        borderColor: cardStyle.border_color,
        borderStyle: 'solid',
        backgroundColor: cardStyle.background_color,
      }}
    >
      {/* Header */}
      {card.show_title && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h3 className="text-sm font-medium text-gray-900 truncate">
            {card.title_override || `Question ${card.metabase_question_id}`}
          </h3>
          <div className="relative flex items-center gap-1">
            <button
              onClick={() => fetchData()}
              className="p-1 rounded hover:bg-gray-100"
              title="Refresh"
            >
              <RefreshCw className={clsx('w-4 h-4 text-gray-500', isLoading && 'animate-spin')} />
            </button>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-1 rounded hover:bg-gray-100"
            >
              <MoreVertical className="w-4 h-4 text-gray-500" />
            </button>

            {/* Dropdown menu */}
            {isMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setIsMenuOpen(false)}
                />
                <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                  <button
                    onClick={() => {
                      setIsFullscreen(!isFullscreen)
                      setIsMenuOpen(false)
                    }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    {isFullscreen ? (
                      <Minimize2 className="w-4 h-4" />
                    ) : (
                      <Maximize2 className="w-4 h-4" />
                    )}
                    {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                  </button>
                  {isEditing && (
                    <>
                      <button
                        onClick={() => {
                          onSettings?.()
                          setIsMenuOpen(false)
                        }}
                        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <Settings className="w-4 h-4" />
                        Settings
                      </button>
                      <button
                        onClick={() => {
                          onRemove?.()
                          setIsMenuOpen(false)
                        }}
                        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                        Remove
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto" style={{ padding: cardStyle.padding }}>
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-sm text-red-600">{error}</p>
            <button
              onClick={fetchData}
              className="mt-2 text-sm text-blue-600 hover:underline"
            >
              Try again
            </button>
          </div>
        ) : data ? (
          <ChartRenderer data={data} type="table" />
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-gray-500">No data</p>
          </div>
        )}
      </div>
    </div>
  )
}
