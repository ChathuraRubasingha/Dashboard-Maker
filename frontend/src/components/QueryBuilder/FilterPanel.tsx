import { useState } from 'react'
import type { FilterCondition, CanvasTable } from '../../types/queryBuilder'
import FilterRow from './FilterRow'

interface FilterPanelProps {
  filters: FilterCondition[]
  tables: CanvasTable[]
  onAddFilter: (filter: Omit<FilterCondition, 'id'>) => void
  onUpdateFilter: (filterId: string, updates: Partial<FilterCondition>) => void
  onRemoveFilter: (filterId: string) => void
}

export default function FilterPanel({
  filters,
  tables,
  onAddFilter,
  onUpdateFilter,
  onRemoveFilter,
}: FilterPanelProps) {
  const [showFieldSelector, setShowFieldSelector] = useState(false)

  const handleAddFilter = (canvasTableId: string, fieldId: number) => {
    const table = tables.find(t => t.id === canvasTableId)
    const field = table?.fields.find(f => f.id === fieldId)

    if (!table || !field) return

    onAddFilter({
      canvasTableId,
      fieldId,
      fieldName: field.display_name || field.name,
      tableName: table.tableName,
      baseType: field.base_type,
      operator: '=',
      value: null,
      logic: 'and',
    })
    setShowFieldSelector(false)
  }

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-700">Filters</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Add conditions to filter your data
          </p>
        </div>
        <button
          onClick={() => setShowFieldSelector(!showFieldSelector)}
          disabled={tables.length === 0}
          className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          + Add Filter
        </button>
      </div>

      {/* Field selector dropdown */}
      {showFieldSelector && tables.length > 0 && (
        <div className="px-3 py-2 border-b border-gray-200 bg-gray-50">
          <p className="text-xs text-gray-600 mb-2">Select a field to filter:</p>
          <div className="max-h-48 overflow-y-auto space-y-1">
            {tables.map((table) => (
              <div key={table.id}>
                <div className="text-xs font-medium text-gray-500 px-2 py-1">
                  {table.tableName} ({table.alias})
                </div>
                {table.fields.map((field) => (
                  <button
                    key={field.id}
                    onClick={() => handleAddFilter(table.id, field.id)}
                    className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-blue-50 rounded"
                  >
                    {field.display_name || field.name}
                    <span className="text-xs text-gray-400 ml-2">
                      {field.base_type.replace('type/', '')}
                    </span>
                  </button>
                ))}
              </div>
            ))}
          </div>
          <button
            onClick={() => setShowFieldSelector(false)}
            className="mt-2 text-xs text-gray-500 hover:text-gray-700"
          >
            Cancel
          </button>
        </div>
      )}

      <div className="flex-1 p-3 overflow-y-auto">
        {filters.length === 0 ? (
          <div className="text-center p-4">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
            </div>
            <p className="text-sm text-gray-500">No filters applied</p>
            <p className="text-xs text-gray-400 mt-1">
              Click "Add Filter" to add conditions
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filters.map((filter, index) => (
              <FilterRow
                key={filter.id}
                filter={filter}
                onUpdate={(updates) => onUpdateFilter(filter.id, updates)}
                onRemove={() => onRemoveFilter(filter.id)}
                isFirst={index === 0}
              />
            ))}
          </div>
        )}
      </div>

      {filters.length > 0 && (
        <div className="px-4 py-2 border-t border-gray-200 text-xs text-gray-500">
          {filters.length} filter{filters.length !== 1 ? 's' : ''} applied
        </div>
      )}
    </div>
  )
}
