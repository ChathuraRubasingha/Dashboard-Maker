import { useState } from 'react'
import { Filter, Plus, X, ChevronDown, Search } from 'lucide-react'
import clsx from 'clsx'
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
  const [searchQuery, setSearchQuery] = useState('')

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
    setSearchQuery('')
  }

  // Filter fields based on search
  const getFilteredFields = (table: CanvasTable) => {
    if (!searchQuery) return table.fields
    return table.fields.filter(f =>
      (f.display_name || f.name).toLowerCase().includes(searchQuery.toLowerCase())
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl shadow-sm">
            <Filter className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-gray-900">Filters</h3>
            <p className="text-xs text-gray-500">Add conditions</p>
          </div>
          <button
            onClick={() => setShowFieldSelector(!showFieldSelector)}
            disabled={tables.length === 0}
            className={clsx(
              'inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all',
              tables.length === 0
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-orange-500 to-red-600 text-white hover:from-orange-600 hover:to-red-700 shadow-sm'
            )}
          >
            <Plus className="w-3.5 h-3.5" />
            Add
          </button>
        </div>
      </div>

      {/* Field selector dropdown */}
      {showFieldSelector && tables.length > 0 && (
        <div className="border-b border-gray-100 bg-gray-50/50">
          <div className="p-3">
            <div className="relative mb-2">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="Search fields..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400"
                autoFocus
              />
            </div>
            <div className="max-h-40 overflow-y-auto space-y-1">
              {tables.map((table) => {
                const filteredFields = getFilteredFields(table)
                if (filteredFields.length === 0) return null

                return (
                  <div key={table.id}>
                    <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 px-2 py-1.5">
                      <ChevronDown className="w-3 h-3" />
                      {table.tableName}
                      <span className="text-gray-400">({table.alias})</span>
                    </div>
                    {filteredFields.map((field) => (
                      <button
                        key={field.id}
                        onClick={() => handleAddFilter(table.id, field.id)}
                        className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-orange-50 hover:text-orange-700 rounded-lg transition-colors flex items-center justify-between group"
                      >
                        <span>{field.display_name || field.name}</span>
                        <span className="text-[10px] text-gray-400 group-hover:text-orange-500 bg-gray-100 group-hover:bg-orange-100 px-1.5 py-0.5 rounded">
                          {field.base_type.replace('type/', '')}
                        </span>
                      </button>
                    ))}
                  </div>
                )
              })}
            </div>
          </div>
          <div className="px-3 pb-3">
            <button
              onClick={() => {
                setShowFieldSelector(false)
                setSearchQuery('')
              }}
              className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
            >
              <X className="w-3 h-3" />
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Filter list */}
      <div className="flex-1 p-3 overflow-y-auto">
        {filters.length === 0 ? (
          <div className="text-center p-4">
            <div className="w-14 h-14 mx-auto mb-3 rounded-xl bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center">
              <Filter className="w-6 h-6 text-gray-300" />
            </div>
            <p className="text-sm font-medium text-gray-600 mb-1">No filters applied</p>
            <p className="text-xs text-gray-400">
              Click "Add" to add conditions
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

      {/* Footer stats */}
      {filters.length > 0 && (
        <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50/50">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">
              {filters.length} filter{filters.length !== 1 ? 's' : ''} in WHERE
            </span>
            <span className="text-orange-500 font-medium">
              {filters.length > 1 ? 'AND logic' : ''}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
