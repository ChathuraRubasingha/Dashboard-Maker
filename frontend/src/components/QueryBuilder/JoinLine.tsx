import { useState } from 'react'
import type { JoinDefinition, Position } from '../../types/queryBuilder'
import { joinTypeLabels } from '../../types/queryBuilder'

interface JoinLineProps {
  join: JoinDefinition
  sourcePosition: Position
  targetPosition: Position
  onRemove: () => void
  onEdit: () => void
}

export default function JoinLine({
  join,
  sourcePosition,
  targetPosition,
  onRemove,
  onEdit,
}: JoinLineProps) {
  const [isHovered, setIsHovered] = useState(false)

  // Calculate control points for bezier curve
  const midX = (sourcePosition.x + targetPosition.x) / 2
  const controlOffset = Math.min(100, Math.abs(targetPosition.x - sourcePosition.x) / 3)

  const pathD = `
    M ${sourcePosition.x} ${sourcePosition.y}
    C ${sourcePosition.x + controlOffset} ${sourcePosition.y},
      ${targetPosition.x - controlOffset} ${targetPosition.y},
      ${targetPosition.x} ${targetPosition.y}
  `

  // Position for the label
  const labelX = midX
  const labelY = (sourcePosition.y + targetPosition.y) / 2

  return (
    <g
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ pointerEvents: 'all' }}
    >
      {/* Invisible wider path for easier hover */}
      <path
        d={pathD}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
        style={{ cursor: 'pointer' }}
      />

      {/* Visible path */}
      <path
        d={pathD}
        fill="none"
        stroke={isHovered ? '#3b82f6' : '#9ca3af'}
        strokeWidth={isHovered ? 3 : 2}
        strokeDasharray={join.joinType === 'inner' ? 'none' : '5,5'}
        markerEnd="url(#arrowhead)"
      />

      {/* Arrow definition */}
      <defs>
        <marker
          id="arrowhead"
          markerWidth="10"
          markerHeight="7"
          refX="9"
          refY="3.5"
          orient="auto"
        >
          <polygon
            points="0 0, 10 3.5, 0 7"
            fill={isHovered ? '#3b82f6' : '#9ca3af'}
          />
        </marker>
      </defs>

      {/* Join type label */}
      <foreignObject
        x={labelX - 50}
        y={labelY - 14}
        width={100}
        height={28}
        style={{ overflow: 'visible' }}
      >
        <div
          className={`
            flex items-center justify-center gap-1 px-2 py-1 rounded text-xs font-medium
            ${isHovered ? 'bg-blue-500 text-white' : 'bg-white text-gray-600 border border-gray-200'}
            shadow-sm cursor-pointer transition-colors
          `}
          onClick={onEdit}
        >
          <span>{joinTypeLabels[join.joinType]}</span>
          {isHovered && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onRemove()
              }}
              className="ml-1 text-white hover:text-red-200"
            >
              ×
            </button>
          )}
        </div>
      </foreignObject>

      {/* Connection points */}
      <circle
        cx={sourcePosition.x}
        cy={sourcePosition.y}
        r={isHovered ? 6 : 4}
        fill={isHovered ? '#3b82f6' : '#9ca3af'}
      />
      <circle
        cx={targetPosition.x}
        cy={targetPosition.y}
        r={isHovered ? 6 : 4}
        fill={isHovered ? '#3b82f6' : '#9ca3af'}
      />
    </g>
  )
}
