import { useState } from 'react'
import { Edit2 } from 'lucide-react'
import type { VisualizationCustomization, VisualizationType, QueryResultColumn } from '../types'

interface CustomizationPanelProps {
  customization: Partial<VisualizationCustomization>
  visualizationType: VisualizationType
  onChange: (customization: Partial<VisualizationCustomization>) => void
  disabled?: boolean
  columns?: QueryResultColumn[] // For table column label editing
}

const COLOR_PALETTES: Record<string, string[]> = {
  default: ['#509EE3', '#88BF4D', '#A989C5', '#EF8C8C', '#F9D45C', '#F2A86F', '#98D9D9', '#7172AD'],
  ocean: ['#1a365d', '#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#dbeafe', '#eff6ff'],
  sunset: ['#7c2d12', '#c2410c', '#ea580c', '#f97316', '#fb923c', '#fdba74', '#fed7aa', '#ffedd5'],
  forest: ['#14532d', '#166534', '#22c55e', '#4ade80', '#86efac', '#bbf7d0', '#dcfce7', '#f0fdf4'],
  monochrome: ['#18181b', '#3f3f46', '#52525b', '#71717a', '#a1a1aa', '#d4d4d8', '#e4e4e7', '#f4f4f5'],
  warm: ['#dc2626', '#ea580c', '#f59e0b', '#eab308', '#84cc16', '#22c55e', '#10b981', '#14b8a6'],
  cool: ['#7c3aed', '#8b5cf6', '#a78bfa', '#6366f1', '#3b82f6', '#0ea5e9', '#06b6d4', '#14b8a6'],
}

const LEGEND_POSITIONS = [
  { value: 'top', label: 'Top' },
  { value: 'bottom', label: 'Bottom' },
  { value: 'left', label: 'Left' },
  { value: 'right', label: 'Right' },
]

export default function CustomizationPanel({
  customization,
  visualizationType,
  onChange,
  disabled = false,
  columns = [],
}: CustomizationPanelProps) {
  const isTableType = visualizationType === 'table'
  const isChartType = !isTableType

  const [activeTab, setActiveTab] = useState<'colors' | 'labels' | 'display' | 'table'>(
    isTableType ? 'table' : 'colors'
  )

  const updateCustomization = (updates: Partial<VisualizationCustomization>) => {
    onChange({ ...customization, ...updates })
  }

  const handleColorChange = (index: number, color: string) => {
    const newColors = [...(customization.custom_colors || COLOR_PALETTES.default)]
    newColors[index] = color
    updateCustomization({ custom_colors: newColors })
  }

  const handlePaletteSelect = (paletteName: string) => {
    updateCustomization({
      color_palette_name: paletteName,
      custom_colors: COLOR_PALETTES[paletteName],
    })
  }

  const handleColumnLabelChange = (columnName: string, newLabel: string) => {
    const newLabels = { ...(customization.custom_labels || {}) }
    if (newLabel.trim()) {
      newLabels[columnName] = newLabel
    } else {
      delete newLabels[columnName]
    }
    updateCustomization({ custom_labels: newLabels })
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${disabled ? 'opacity-60 pointer-events-none' : ''}`}>
      {/* Tab navigation */}
      <div className="flex border-b border-gray-200">
        {/* Table tab - only for table type */}
        {isTableType && (
          <button
            onClick={() => setActiveTab('table')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'table'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            Table
          </button>
        )}
        <button
          onClick={() => setActiveTab('colors')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'colors'
              ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          Colors
        </button>
        {isChartType && (
          <button
            onClick={() => setActiveTab('labels')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'labels'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            Labels
          </button>
        )}
        <button
          onClick={() => setActiveTab('display')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'display'
              ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          Display
        </button>
      </div>

      {/* Tab content */}
      <div className="p-4">
        {/* Table Tab - Column Labels */}
        {activeTab === 'table' && isTableType && (
          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Edit2 className="w-4 h-4 text-gray-500" />
                <label className="text-sm font-medium text-gray-700">
                  Column Labels
                </label>
              </div>
              <p className="text-xs text-gray-500 mb-3">
                Customize how column headers are displayed in the table.
              </p>

              {columns.length > 0 ? (
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-3 py-2 text-left text-gray-600 font-medium">Original Column</th>
                        <th className="px-3 py-2 text-left text-gray-600 font-medium">Custom Label</th>
                      </tr>
                    </thead>
                    <tbody>
                      {columns.map((col) => (
                        <tr key={col.name} className="border-t border-gray-100">
                          <td className="px-3 py-2 text-gray-500 font-mono text-xs">
                            {col.display_name}
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={customization.custom_labels?.[col.name] || ''}
                              onChange={(e) => handleColumnLabelChange(col.name, e.target.value)}
                              placeholder={col.display_name}
                              className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              disabled={disabled}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                  <p className="text-sm">No columns available</p>
                  <p className="text-xs mt-1">Run the query to see column options</p>
                </div>
              )}

              {/* Clear all custom labels */}
              {Object.keys(customization.custom_labels || {}).length > 0 && (
                <button
                  onClick={() => updateCustomization({ custom_labels: {} })}
                  className="mt-3 text-sm text-gray-500 hover:text-gray-700"
                  disabled={disabled}
                >
                  Reset all labels to default
                </button>
              )}
            </div>
          </div>
        )}

        {/* Colors Tab */}
        {activeTab === 'colors' && (
          <div className="space-y-4">
            {/* Color Palette Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Color Palette
              </label>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(COLOR_PALETTES).map(([name, colors]) => (
                  <button
                    key={name}
                    onClick={() => handlePaletteSelect(name)}
                    className={`p-2 rounded-lg border transition-all ${
                      customization.color_palette_name === name
                        ? 'border-blue-500 ring-2 ring-blue-200'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-xs font-medium text-gray-700 mb-1 capitalize">
                      {name}
                    </div>
                    <div className="flex gap-0.5">
                      {colors.slice(0, 6).map((color, idx) => (
                        <div
                          key={idx}
                          className="w-4 h-4 rounded-sm"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Colors */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Custom Colors
              </label>
              <div className="grid grid-cols-4 gap-2">
                {(customization.custom_colors || COLOR_PALETTES.default).map((color, index) => (
                  <div key={index} className="relative">
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => handleColorChange(index, e.target.value)}
                      className="w-full h-10 rounded-lg border border-gray-200 cursor-pointer"
                      disabled={disabled}
                    />
                    <span className="absolute bottom-1 left-1 text-[10px] text-white font-mono bg-black/30 px-1 rounded">
                      {index + 1}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Grid Color (for charts) */}
            {isChartType && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Grid Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={customization.grid_color || '#f0f0f0'}
                    onChange={(e) => updateCustomization({ grid_color: e.target.value })}
                    className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer"
                    disabled={disabled}
                  />
                  <input
                    type="text"
                    value={customization.grid_color || '#f0f0f0'}
                    onChange={(e) => updateCustomization({ grid_color: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono"
                    disabled={disabled}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Labels Tab (for charts only) */}
        {activeTab === 'labels' && isChartType && (
          <div className="space-y-4">
            {/* X-Axis Label */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                X-Axis Label
              </label>
              <input
                type="text"
                value={customization.x_axis_label || ''}
                onChange={(e) => updateCustomization({ x_axis_label: e.target.value || null })}
                placeholder="Enter X-axis label..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={disabled}
              />
            </div>

            {/* Y-Axis Label */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Y-Axis Label
              </label>
              <input
                type="text"
                value={customization.y_axis_label || ''}
                onChange={(e) => updateCustomization({ y_axis_label: e.target.value || null })}
                placeholder="Enter Y-axis label..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={disabled}
              />
            </div>

            {/* X-Axis Format */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                X-Axis Format
              </label>
              <select
                value={customization.x_axis_format || ''}
                onChange={(e) => updateCustomization({ x_axis_format: e.target.value || null })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={disabled}
              >
                <option value="">Auto</option>
                <option value="number">Number</option>
                <option value="currency">Currency</option>
                <option value="percent">Percentage</option>
                <option value="date">Date</option>
                <option value="datetime">Date & Time</option>
              </select>
            </div>

            {/* Y-Axis Format */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Y-Axis Format
              </label>
              <select
                value={customization.y_axis_format || ''}
                onChange={(e) => updateCustomization({ y_axis_format: e.target.value || null })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={disabled}
              >
                <option value="">Auto</option>
                <option value="number">Number</option>
                <option value="currency">Currency</option>
                <option value="percent">Percentage</option>
                <option value="compact">Compact (1K, 1M)</option>
              </select>
            </div>
          </div>
        )}

        {/* Display Tab */}
        {activeTab === 'display' && (
          <div className="space-y-4">
            {/* Show Legend */}
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">
                Show Legend
              </label>
              <button
                onClick={() => updateCustomization({ show_legend: !customization.show_legend })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  customization.show_legend !== false ? 'bg-blue-600' : 'bg-gray-200'
                }`}
                disabled={disabled}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    customization.show_legend !== false ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Legend Position */}
            {customization.show_legend !== false && isChartType && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Legend Position
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {LEGEND_POSITIONS.map((pos) => (
                    <button
                      key={pos.value}
                      onClick={() => updateCustomization({ legend_position: pos.value })}
                      className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                        (customization.legend_position || 'bottom') === pos.value
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      disabled={disabled}
                    >
                      {pos.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Show Grid (for charts) */}
            {isChartType && (
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">
                  Show Grid Lines
                </label>
                <button
                  onClick={() => updateCustomization({ show_grid: !customization.show_grid })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    customization.show_grid !== false ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                  disabled={disabled}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      customization.show_grid !== false ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            )}

            {/* Show Data Labels */}
            {isChartType && (
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">
                  Show Data Labels
                </label>
                <button
                  onClick={() => updateCustomization({ show_data_labels: !customization.show_data_labels })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    customization.show_data_labels ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                  disabled={disabled}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      customization.show_data_labels ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            )}

            {/* Enable Animations */}
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">
                Enable Animations
              </label>
              <button
                onClick={() => updateCustomization({ enable_animations: !customization.enable_animations })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  customization.enable_animations !== false ? 'bg-blue-600' : 'bg-gray-200'
                }`}
                disabled={disabled}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    customization.enable_animations !== false ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
