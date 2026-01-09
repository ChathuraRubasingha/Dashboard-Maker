import { Settings } from 'lucide-react'
import { useState } from 'react'
import clsx from 'clsx'
import type { DividerBlockConfig } from '../../types'

interface DividerBlockProps {
  config: DividerBlockConfig
  isEditing: boolean
  onUpdate: (config: DividerBlockConfig) => void
}

export default function DividerBlock({ config, isEditing, onUpdate }: DividerBlockProps) {
  const [showSettings, setShowSettings] = useState(false)

  const borderStyle = {
    solid: 'border-solid',
    dashed: 'border-dashed',
    dotted: 'border-dotted',
  }

  return (
    <div className="relative group">
      {/* Settings toggle (editing mode) */}
      {isEditing && (
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="absolute -right-8 top-1/2 -translate-y-1/2 p-1 bg-white border rounded opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Settings className="w-4 h-4 text-gray-400" />
        </button>
      )}

      {/* Settings panel */}
      {showSettings && isEditing && (
        <div className="mb-2 p-3 bg-gray-50 rounded-lg border space-y-3">
          <div>
            <label className="block text-sm text-gray-700 mb-1">Style</label>
            <div className="flex gap-2">
              {(['solid', 'dashed', 'dotted'] as const).map((style) => (
                <button
                  key={style}
                  onClick={() => onUpdate({ ...config, style })}
                  className={clsx(
                    'flex-1 py-1.5 text-sm border rounded capitalize',
                    config.style === style
                      ? 'bg-blue-50 border-blue-500 text-blue-700'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  )}
                >
                  {style}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">Color</label>
            <input
              type="color"
              value={config.color}
              onChange={(e) => onUpdate({ ...config, color: e.target.value })}
              className="w-full h-8 rounded cursor-pointer"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">
              Margin: {config.margin}px
            </label>
            <input
              type="range"
              min={0}
              max={60}
              value={config.margin}
              onChange={(e) => onUpdate({ ...config, margin: Number(e.target.value) })}
              className="w-full"
            />
          </div>
        </div>
      )}

      {/* Divider */}
      <div
        style={{ marginTop: config.margin, marginBottom: config.margin }}
      >
        <hr
          className={clsx('border-t-2', borderStyle[config.style])}
          style={{ borderColor: config.color }}
        />
      </div>
    </div>
  )
}
