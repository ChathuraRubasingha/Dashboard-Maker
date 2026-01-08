import type { FilterCondition, FilterOperator } from '../../types/queryBuilder'
import { operatorLabels, getOperatorsForType } from '../../types/queryBuilder'

interface FilterRowProps {
  filter: FilterCondition
  onUpdate: (updates: Partial<FilterCondition>) => void
  onRemove: () => void
  isFirst: boolean
}

export default function FilterRow({ filter, onUpdate, onRemove, isFirst }: FilterRowProps) {
  const availableOperators = getOperatorsForType(filter.baseType)
  const isNullOperator = filter.operator === 'is-null' || filter.operator === 'not-null'

  const renderValueInput = () => {
    if (isNullOperator) {
      return null
    }

    // Determine input type based on base type
    const isNumeric = filter.baseType.includes('Integer') ||
                      filter.baseType.includes('Float') ||
                      filter.baseType.includes('Decimal') ||
                      filter.baseType.includes('Number')

    const isDate = filter.baseType.includes('Date') ||
                   filter.baseType.includes('Time')

    if (isNumeric) {
      return (
        <input
          type="number"
          value={filter.value as number || ''}
          onChange={(e) => onUpdate({ value: e.target.value ? Number(e.target.value) : null })}
          placeholder="Value"
          className="w-32 px-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      )
    }

    if (isDate) {
      return (
        <input
          type="date"
          value={filter.value as string || ''}
          onChange={(e) => onUpdate({ value: e.target.value })}
          className="w-40 px-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      )
    }

    return (
      <input
        type="text"
        value={filter.value as string || ''}
        onChange={(e) => onUpdate({ value: e.target.value })}
        placeholder="Value"
        className="w-32 px-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
    )
  }

  return (
    <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
      {/* Logic operator (AND/OR) */}
      {!isFirst && (
        <select
          value={filter.logic}
          onChange={(e) => onUpdate({ logic: e.target.value as 'and' | 'or' })}
          className="w-16 px-2 py-1.5 text-xs border border-gray-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="and">AND</option>
          <option value="or">OR</option>
        </select>
      )}
      {isFirst && <div className="w-16" />}

      {/* Field name */}
      <div className="flex items-center gap-1 min-w-0">
        <span className="text-xs text-gray-500 truncate">{filter.tableName}.</span>
        <span className="text-sm font-medium text-gray-700 truncate">{filter.fieldName}</span>
      </div>

      {/* Operator */}
      <select
        value={filter.operator}
        onChange={(e) => onUpdate({ operator: e.target.value as FilterOperator })}
        className="px-2 py-1.5 text-sm border border-gray-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
      >
        {availableOperators.map((op) => (
          <option key={op} value={op}>
            {operatorLabels[op]}
          </option>
        ))}
      </select>

      {/* Value input */}
      {renderValueInput()}

      {/* Remove button */}
      <button
        onClick={onRemove}
        className="p-1 text-gray-400 hover:text-red-500 ml-auto"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}
