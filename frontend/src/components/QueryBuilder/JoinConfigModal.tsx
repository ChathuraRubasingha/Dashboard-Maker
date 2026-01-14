import { useState, useEffect } from 'react'
import { X, Link2, ArrowRight, Table, Columns, Sparkles, Check } from 'lucide-react'
import clsx from 'clsx'
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

  // Join type descriptions and icons
  const joinTypeInfo: Record<JoinType, { description: string; icon: string }> = {
    inner: { description: 'Only matching rows from both tables', icon: '⋂' },
    left: { description: 'All from source + matching from target', icon: '◐' },
    right: { description: 'All from target + matching from source', icon: '◑' },
    full: { description: 'All rows from both tables', icon: '⋃' },
  }

  const isValid = sourceFieldId && targetFieldId && (targetTable || selectedTargetTableId)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop with blur */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="relative px-5 py-4 bg-gradient-to-r from-amber-500 to-orange-600">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl">
              <Link2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">
                {existingJoin ? 'Edit Join' : 'Configure Join'}
              </h3>
              <p className="text-xs text-white/80">Link tables together</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Join Type Selection */}
          <div>
            <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 uppercase tracking-wider mb-3">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Join Type
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(Object.keys(joinTypeLabels) as JoinType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => setJoinType(type)}
                  className={clsx(
                    'relative flex flex-col items-center gap-1 px-2 py-3 rounded-xl border-2 transition-all',
                    joinType === type
                      ? 'border-amber-500 bg-amber-50 shadow-sm'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  )}
                >
                  <span className={clsx(
                    'text-lg font-bold',
                    joinType === type ? 'text-amber-600' : 'text-gray-400'
                  )}>
                    {joinTypeInfo[type].icon}
                  </span>
                  <span className={clsx(
                    'text-[10px] font-semibold uppercase',
                    joinType === type ? 'text-amber-700' : 'text-gray-500'
                  )}>
                    {type}
                  </span>
                  {joinType === type && (
                    <div className="absolute -top-1 -right-1 p-0.5 bg-amber-500 rounded-full">
                      <Check className="w-2.5 h-2.5 text-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-gray-500 text-center">
              {joinTypeInfo[joinType].description}
            </p>
          </div>

          {/* Tables Connection Visual */}
          <div className="flex items-center gap-3">
            {/* Source Table */}
            <div className="flex-1">
              <label className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
                <Table className="w-3 h-3" />
                Source
              </label>
              <div className="px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs font-semibold text-blue-700 truncate">
                  {sourceTable?.tableName || 'No table'}
                </p>
                {sourceTable?.alias && (
                  <p className="text-[10px] text-blue-500">{sourceTable.alias}</p>
                )}
              </div>
            </div>

            {/* Connection Arrow */}
            <div className="flex flex-col items-center pt-5">
              <div className="p-1.5 bg-amber-100 rounded-full">
                <ArrowRight className="w-4 h-4 text-amber-600" />
              </div>
            </div>

            {/* Target Table */}
            <div className="flex-1">
              <label className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
                <Table className="w-3 h-3" />
                Target
              </label>
              {targetTable ? (
                <div className="px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <p className="text-xs font-semibold text-emerald-700 truncate">
                    {targetTable.tableName}
                  </p>
                  {targetTable.alias && (
                    <p className="text-[10px] text-emerald-500">{targetTable.alias}</p>
                  )}
                </div>
              ) : (
                <select
                  value={selectedTargetTableId || ''}
                  onChange={(e) => {
                    setSelectedTargetTableId(e.target.value)
                    setTargetFieldId(null)
                  }}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-400"
                >
                  <option value="">Select table...</option>
                  {availableTargetTables.map((table) => (
                    <option key={table.id} value={table.id}>
                      {table.tableName} ({table.alias})
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Field Selection */}
          <div className="grid grid-cols-2 gap-3">
            {/* Source Field */}
            <div>
              <label className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
                <Columns className="w-3 h-3" />
                Source Field
              </label>
              <select
                value={sourceFieldId || ''}
                onChange={(e) => setSourceFieldId(Number(e.target.value))}
                className={clsx(
                  'w-full px-3 py-2.5 border rounded-lg text-xs transition-all',
                  'focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-400',
                  sourceFieldId
                    ? 'border-blue-300 bg-blue-50/50'
                    : 'border-gray-200'
                )}
              >
                <option value="">Select field...</option>
                {sourceTable?.fields.map((field) => (
                  <option key={field.id} value={field.id}>
                    {field.display_name || field.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Target Field */}
            <div>
              <label className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
                <Columns className="w-3 h-3" />
                Target Field
              </label>
              <select
                value={targetFieldId || ''}
                onChange={(e) => setTargetFieldId(Number(e.target.value))}
                disabled={!currentTargetTable}
                className={clsx(
                  'w-full px-3 py-2.5 border rounded-lg text-xs transition-all',
                  'focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-400',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  targetFieldId
                    ? 'border-emerald-300 bg-emerald-50/50'
                    : 'border-gray-200'
                )}
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
          {isValid && (
            <div className="p-3 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl">
              <div className="flex items-center gap-2 mb-1">
                <Link2 className="w-3.5 h-3.5 text-amber-600" />
                <span className="text-[10px] font-semibold text-amber-700 uppercase tracking-wider">
                  Join Condition
                </span>
              </div>
              <p className="text-xs text-gray-700 font-mono bg-white/60 px-2 py-1.5 rounded-md">
                <span className="text-blue-600 font-semibold">{sourceTable?.alias}</span>
                <span className="text-gray-400">.</span>
                <span className="text-blue-700">{sourceTable?.fields.find(f => f.id === sourceFieldId)?.name}</span>
                <span className="mx-2 text-amber-600 font-bold">=</span>
                <span className="text-emerald-600 font-semibold">{currentTargetTable?.alias}</span>
                <span className="text-gray-400">.</span>
                <span className="text-emerald-700">{currentTargetTable?.fields.find(f => f.id === targetFieldId)?.name}</span>
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!isValid}
            className={clsx(
              'inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition-all',
              isValid
                ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:from-amber-600 hover:to-orange-700 shadow-md shadow-amber-500/25'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            )}
          >
            <Check className="w-3.5 h-3.5" />
            {existingJoin ? 'Update Join' : 'Create Join'}
          </button>
        </div>
      </div>
    </div>
  )
}
