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
    <div className="flex flex-col h-full overflow-hidden">
      {/* Compact Header */}
      <div className="px-2 py-1.5 border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-1 bg-gradient-to-br from-orange-500 to-red-600 rounded-md">
            <Filter className="w-3 h-3 text-white" />
          </div>
          <h3 className="text-xs font-semibold text-gray-900 flex-1">Filters</h3>
          <button
            onClick={() => setShowFieldSelector(!showFieldSelector)}
            disabled={tables.length === 0}
            className={clsx(
              'inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded-md transition-all',
              tables.length === 0
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-orange-500 to-red-600 text-white hover:from-orange-600 hover:to-red-700'
            )}
          >
            <Plus className="w-3 h-3" />
            Add
          </button>
        </div>
      </div>

      {/* Field selector dropdown */}
      {showFieldSelector && tables.length > 0 && (
        <div className="border-b border-gray-100 bg-gray-50/50 flex-shrink-0">
          <div className="p-2">
            <div className="relative mb-1.5">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
              <input
                type="text"
                placeholder="Search fields..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-6 pr-2 py-1 bg-white border border-gray-200 rounded-md text-[10px] placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-orange-500/20 focus:border-orange-400"
                autoFocus
              />
            </div>
            <div className="max-h-24 overflow-y-auto space-y-0.5">
              {tables.map((table) => {
                const filteredFields = getFilteredFields(table)
                if (filteredFields.length === 0) return null

                return (
                  <div key={table.id}>
                    <div className="flex items-center gap-1 text-[10px] font-medium text-gray-500 px-1.5 py-1">
                      <ChevronDown className="w-2.5 h-2.5" />
                      {table.tableName}
                    </div>
                    {filteredFields.map((field) => (
                      <button
                        key={field.id}
                        onClick={() => handleAddFilter(table.id, field.id)}
                        className="w-full text-left px-2 py-1 text-[10px] text-gray-700 hover:bg-orange-50 hover:text-orange-700 rounded-md transition-colors flex items-center justify-between group"
                      >
                        <span className="truncate">{field.display_name || field.name}</span>
                        <span className="text-[9px] text-gray-400 group-hover:text-orange-500 bg-gray-100 group-hover:bg-orange-100 px-1 py-0.5 rounded flex-shrink-0">
                          {field.base_type.replace('type/', '')}
                        </span>
                      </button>
                    ))}
                  </div>
                )
              })}
            </div>
            <button
              onClick={() => {
                setShowFieldSelector(false)
                setSearchQuery('')
              }}
              className="mt-1.5 text-[10px] text-gray-500 hover:text-gray-700 flex items-center gap-0.5"
            >
              <X className="w-2.5 h-2.5" />
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Filter list */}
      <div className="flex-1 min-h-0 p-2 overflow-y-auto">
        {filters.length === 0 ? (
          <div className="text-center p-2">
            <div className="w-10 h-10 mx-auto mb-2 rounded-lg bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center">
              <Filter className="w-4 h-4 text-gray-300" />
            </div>
            <p className="text-xs font-medium text-gray-600 mb-0.5">No filters</p>
            <p className="text-[10px] text-gray-400">
              Click "Add" to filter
            </p>
          </div>
        ) : (
          <div className="space-y-1">
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
    </div>
  )
}
