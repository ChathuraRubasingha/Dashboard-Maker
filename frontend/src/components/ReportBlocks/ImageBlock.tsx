import { useState, useRef } from 'react'
import { Settings, Upload, X, Image as ImageIcon } from 'lucide-react'
import type { ImageBlockConfig } from '../../types'

interface ImageBlockProps {
  config: ImageBlockConfig
  isEditing: boolean
  onUpdate: (config: ImageBlockConfig) => void
}

export default function ImageBlock({
  config,
  isEditing,
  onUpdate,
}: ImageBlockProps) {
  const [showSettings, setShowSettings] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      processFile(file)
    }
  }

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file')
      return
    }

    // Max 5MB
    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be less than 5MB')
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const base64 = event.target?.result as string
      onUpdate({ ...config, src: base64, alt: file.name })
    }
    reader.readAsDataURL(file)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) {
      processFile(file)
    }
  }

  const shadowClasses = {
    none: '',
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-lg',
    xl: 'shadow-xl',
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header with settings */}
      {isEditing && config.src && (
        <div className="px-4 py-2 border-b border-gray-100 flex items-center justify-between bg-gray-50">
          <span className="text-sm text-gray-500 truncate max-w-[200px]">{config.alt || 'Image'}</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-1.5 hover:bg-gray-200 rounded transition-colors"
            >
              <Settings className="w-4 h-4 text-gray-400" />
            </button>
            <button
              onClick={() => onUpdate({ ...config, src: '', alt: '' })}
              className="p-1.5 hover:bg-red-100 rounded transition-colors"
            >
              <X className="w-4 h-4 text-gray-400 hover:text-red-500" />
            </button>
          </div>
        </div>
      )}

      {/* Settings panel */}
      {showSettings && isEditing && (
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Object Fit</label>
              <select
                value={config.objectFit}
                onChange={(e) => onUpdate({ ...config, objectFit: e.target.value as ImageBlockConfig['objectFit'] })}
                className="w-full px-3 py-1.5 border rounded-lg text-sm"
              >
                <option value="contain">Contain</option>
                <option value="cover">Cover</option>
                <option value="fill">Fill</option>
                <option value="none">None</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Shadow</label>
              <select
                value={config.shadow}
                onChange={(e) => onUpdate({ ...config, shadow: e.target.value as ImageBlockConfig['shadow'] })}
                className="w-full px-3 py-1.5 border rounded-lg text-sm"
              >
                <option value="none">None</option>
                <option value="sm">Small</option>
                <option value="md">Medium</option>
                <option value="lg">Large</option>
                <option value="xl">Extra Large</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Opacity ({Math.round(config.opacity * 100)}%)</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={config.opacity}
                onChange={(e) => onUpdate({ ...config, opacity: parseFloat(e.target.value) })}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Border Radius ({config.borderRadius}px)</label>
              <input
                type="range"
                min="0"
                max="50"
                value={config.borderRadius}
                onChange={(e) => onUpdate({ ...config, borderRadius: parseInt(e.target.value) })}
                className="w-full"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Border Width</label>
              <input
                type="number"
                min="0"
                max="10"
                value={config.borderWidth}
                onChange={(e) => onUpdate({ ...config, borderWidth: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-1.5 border rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Border Color</label>
              <input
                type="color"
                value={config.borderColor}
                onChange={(e) => onUpdate({ ...config, borderColor: e.target.value })}
                className="w-full h-8 rounded border cursor-pointer"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Alt Text</label>
            <input
              type="text"
              value={config.alt}
              onChange={(e) => onUpdate({ ...config, alt: e.target.value })}
              placeholder="Describe the image..."
              className="w-full px-3 py-1.5 border rounded-lg text-sm"
            />
          </div>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full px-4 py-2 text-sm text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
          >
            Replace Image
          </button>
        </div>
      )}

      {/* Image content or upload area */}
      {config.src ? (
        <div className="p-4">
          <img
            src={config.src}
            alt={config.alt}
            className={`w-full h-auto ${shadowClasses[config.shadow]}`}
            style={{
              objectFit: config.objectFit,
              opacity: config.opacity,
              borderRadius: `${config.borderRadius}px`,
              border: config.borderWidth > 0 ? `${config.borderWidth}px solid ${config.borderColor}` : undefined,
            }}
          />
        </div>
      ) : isEditing ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`p-8 flex flex-col items-center justify-center cursor-pointer transition-colors ${
            isDragging ? 'bg-purple-50 border-purple-300' : 'bg-gray-50 hover:bg-gray-100'
          }`}
        >
          <div className={`p-4 rounded-full ${isDragging ? 'bg-purple-100' : 'bg-gray-200'} mb-4`}>
            {isDragging ? (
              <Upload className="w-8 h-8 text-purple-600" />
            ) : (
              <ImageIcon className="w-8 h-8 text-gray-400" />
            )}
          </div>
          <p className="text-sm font-medium text-gray-700 mb-1">
            {isDragging ? 'Drop image here' : 'Click or drag to upload'}
          </p>
          <p className="text-xs text-gray-500">PNG, JPG, GIF up to 5MB</p>
        </div>
      ) : (
        <div className="p-8 flex flex-col items-center justify-center bg-gray-50">
          <ImageIcon className="w-8 h-8 text-gray-300 mb-2" />
          <p className="text-sm text-gray-400">No image</p>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  )
}
