import { useState, useEffect } from 'react'
import type { JoinType, JoinDefinition, CanvasTable } from '../../types/queryBuilder'
import { joinTypeLabels } from '../../types/queryBuilder'

interface JoinConfigModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (join: Omit<JoinDefinition, 'id'>) => void
  sourceTable: CanvasTable | null
  targetTable: CanvasTable | null
  existingJoin?: JoinDefinition
  tables: CanvasTable[]
}

export default function JoinConfigModal({
  isOpen,
  onClose,
  onSave,
  sourceTable,
  targetTable,
  existingJoin,
  tables,
}: JoinConfigModalProps) {
  const [joinType, setJoinType] = useState<JoinType>('left')
  const [sourceFieldId, setSourceFieldId] = useState<number | null>(null)
  const [targetFieldId, setTargetFieldId] = useState<number | null>(null)
  const [selectedTargetTableId, setSelectedTargetTableId] = useState<string | null>(null)

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      if (existingJoin) {
        setJoinType(existingJoin.joinType)
        setSourceFieldId(existingJoin.sourceFieldId)
        setTargetFieldId(existingJoin.targetFieldId)
        setSelectedTargetTableId(existingJoin.targetTableId)
      } else {
        setJoinType('left')
        setSourceFieldId(null)
        setTargetFieldId(null)
        setSelectedTargetTableId(targetTable?.id || null)

        // Auto-suggest join fields based on FK relationships
        if (sourceTable && targetTable) {
          autoSuggestJoinFields(sourceTable, targetTable)
        }
      }
    }
  }, [isOpen, existingJoin, sourceTable, targetTable])

  const autoSuggestJoinFields = (source: CanvasTable, target: CanvasTable) => {
    // Look for FK relationships
    for (const field of source.fields) {
      if (field.fk_target_field_id) {
        const targetField = target.fields.find(f => f.id === field.fk_target_field_id)
        if (targetField) {
          setSourceFieldId(field.id)
          setTargetFieldId(targetField.id)
          return
        }
      }
    }

    // Try reverse - target FK to source
    for (const field of target.fields) {
      if (field.fk_target_field_id) {
        const sourceField = source.fields.find(f => f.id === field.fk_target_field_id)
        if (sourceField) {
          setSourceFieldId(sourceField.id)
          setTargetFieldId(field.id)
          return
        }
      }
    }

    // Look for common field names (id patterns)
    const sourceIdField = source.fields.find(f => f.name === 'id' || f.name === 'ID')
    const targetFkField = target.fields.find(f =>
      f.name.toLowerCase() === `${source.tableName.toLowerCase()}_id` ||
      f.name.toLowerCase() === `${source.tableName.toLowerCase()}id`
    )
    if (sourceIdField && targetFkField) {
      setSourceFieldId(sourceIdField.id)
      setTargetFieldId(targetFkField.id)
      return
    }

    // Reverse pattern
    const targetIdField = target.fields.find(f => f.name === 'id' || f.name === 'ID')
    const sourceFkField = source.fields.find(f =>
      f.name.toLowerCase() === `${target.tableName.toLowerCase()}_id` ||
      f.name.toLowerCase() === `${target.tableName.toLowerCase()}id`
    )
    if (targetIdField && sourceFkField) {
      setSourceFieldId(sourceFkField.id)
      setTargetFieldId(targetIdField.id)
    }
  }

  const handleSave = () => {
    if (!sourceTable || !sourceFieldId || !targetFieldId) return

    const actualTargetTableId = selectedTargetTableId || targetTable?.id
    if (!actualTargetTableId) return

    onSave({
      sourceTableId: sourceTable.id,
      targetTableId: actualTargetTableId,
      sourceFieldId,
      targetFieldId,
      joinType,
    })
    onClose()
  }

  const availableTargetTables = tables.filter(t => t.id !== sourceTable?.id)
  const currentTargetTable = selectedTargetTableId
    ? tables.find(t => t.id === selectedTargetTableId)
    : targetTable

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            {existingJoin ? 'Edit Join' : 'Configure Join'}
          </h3>
        </div>

        <div className="px-6 py-4 space-y-4">
          {/* Join Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Join Type
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(Object.keys(joinTypeLabels) as JoinType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => setJoinType(type)}
                  className={`
                    px-3 py-2 text-sm rounded-lg border transition-colors
                    ${joinType === type
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300 text-gray-600'
                    }
                  `}
                >
                  {type.toUpperCase()}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-gray-500">
              {joinType === 'inner' && 'Returns rows when there is a match in both tables'}
              {joinType === 'left' && 'Returns all rows from source table, matched rows from target'}
              {joinType === 'right' && 'Returns all rows from target table, matched rows from source'}
              {joinType === 'full' && 'Returns all rows when there is a match in either table'}
            </p>
          </div>

          {/* Source Table & Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Source Table
            </label>
            <div className="flex gap-2">
              <div className="flex-1 px-3 py-2 bg-gray-100 rounded-lg text-sm text-gray-700">
                {sourceTable?.tableName || 'Select a table'}
                {sourceTable?.alias && ` (${sourceTable.alias})`}
              </div>
              <select
                value={sourceFieldId || ''}
                onChange={(e) => setSourceFieldId(Number(e.target.value))}
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select field...</option>
                {sourceTable?.fields.map((field) => (
                  <option key={field.id} value={field.id}>
                    {field.display_name || field.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Target Table & Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Target Table
            </label>
            <div className="flex gap-2">
              {targetTable ? (
                <div className="flex-1 px-3 py-2 bg-gray-100 rounded-lg text-sm text-gray-700">
                  {targetTable.tableName}
                  {targetTable.alias && ` (${targetTable.alias})`}
                </div>
              ) : (
                <select
                  value={selectedTargetTableId || ''}
                  onChange={(e) => {
                    setSelectedTargetTableId(e.target.value)
                    setTargetFieldId(null)
                  }}
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select table...</option>
                  {availableTargetTables.map((table) => (
                    <option key={table.id} value={table.id}>
                      {table.tableName} ({table.alias})
                    </option>
                  ))}
                </select>
              )}
              <select
                value={targetFieldId || ''}
                onChange={(e) => setTargetFieldId(Number(e.target.value))}
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={!currentTargetTable}
              >
                <option value="">Select field...</option>
                {currentTargetTable?.fields.map((field) => (
                  <option key={field.id} value={field.id}>
                    {field.display_name || field.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Join Preview */}
          {sourceFieldId && targetFieldId && currentTargetTable && (
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-700">
                <span className="font-medium">{sourceTable?.alias}</span>
                .{sourceTable?.fields.find(f => f.id === sourceFieldId)?.name}
                <span className="mx-2">=</span>
                <span className="font-medium">{currentTargetTable.alias}</span>
                .{currentTargetTable.fields.find(f => f.id === targetFieldId)?.name}
              </p>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!sourceFieldId || !targetFieldId || (!targetTable && !selectedTargetTableId)}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {existingJoin ? 'Update Join' : 'Create Join'}
          </button>
        </div>
      </div>
    </div>
  )
}
