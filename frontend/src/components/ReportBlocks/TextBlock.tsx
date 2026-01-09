import { useState, useRef, useEffect } from 'react'
import {
  Bold,
  Italic,
  AlignLeft,
  AlignCenter,
  AlignRight,
} from 'lucide-react'
import clsx from 'clsx'
import type { TextBlockConfig } from '../../types'

interface TextBlockProps {
  config: TextBlockConfig
  isEditing: boolean
  onUpdate: (config: TextBlockConfig) => void
}

const FONT_SIZES = [
  { value: 12, label: '12' },
  { value: 14, label: '14' },
  { value: 16, label: '16' },
  { value: 18, label: '18' },
  { value: 20, label: '20' },
  { value: 24, label: '24' },
  { value: 28, label: '28' },
  { value: 32, label: '32' },
  { value: 36, label: '36' },
  { value: 48, label: '48' },
]

const COLORS = [
  '#000000',
  '#374151',
  '#6B7280',
  '#9CA3AF',
  '#EF4444',
  '#F97316',
  '#EAB308',
  '#22C55E',
  '#3B82F6',
  '#8B5CF6',
  '#EC4899',
]

export default function TextBlock({ config, isEditing, onUpdate }: TextBlockProps) {
  const [showToolbar, setShowToolbar] = useState(false)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
    }
  }, [config.content])

  // Close color picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowColorPicker(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleContentChange = (content: string) => {
    onUpdate({ ...config, content })
  }

  const toggleBold = () => {
    onUpdate({
      ...config,
      style: {
        ...config.style,
        fontWeight: config.style.fontWeight === 'bold' ? 'normal' : 'bold',
      },
    })
  }

  const toggleItalic = () => {
    onUpdate({
      ...config,
      style: {
        ...config.style,
        fontStyle: config.style.fontStyle === 'italic' ? 'normal' : 'italic',
      },
    })
  }

  const setAlignment = (textAlign: 'left' | 'center' | 'right') => {
    onUpdate({
      ...config,
      style: { ...config.style, textAlign },
    })
  }

  const setFontSize = (fontSize: number) => {
    onUpdate({
      ...config,
      style: { ...config.style, fontSize },
    })
  }

  const setColor = (color: string) => {
    onUpdate({
      ...config,
      style: { ...config.style, color },
    })
    setShowColorPicker(false)
  }

  // Determine if this is a heading based on font size
  const isHeading = config.style.fontSize >= 24
  const fontStyle = config.style.fontStyle || 'normal'

  if (!isEditing) {
    // View mode
    if (!config.content) return null

    return (
      <div
        className="py-2"
        style={{
          fontSize: `${config.style.fontSize}px`,
          fontWeight: config.style.fontWeight,
          fontStyle: fontStyle,
          textAlign: config.style.textAlign,
          color: config.style.color,
          lineHeight: isHeading ? 1.2 : 1.6,
        }}
      >
        {config.content.split('\n').map((line, i) => (
          <p key={i} className={i > 0 ? 'mt-2' : ''}>
            {line || '\u00A0'}
          </p>
        ))}
      </div>
    )
  }

  // Edit mode
  return (
    <div
      ref={containerRef}
      className="relative bg-white rounded-lg"
      onFocus={() => setShowToolbar(true)}
      onBlur={(e) => {
        // Only hide toolbar if focus moves outside this component
        if (!e.currentTarget.contains(e.relatedTarget)) {
          setShowToolbar(false)
          setShowColorPicker(false)
        }
      }}
    >
      {/* Floating formatting toolbar */}
      <div
        className={clsx(
          'absolute -top-12 left-0 flex items-center gap-0.5 bg-white border border-gray-200 rounded-lg shadow-lg px-1.5 py-1 z-20 transition-all',
          showToolbar ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
        )}
      >
        {/* Font size dropdown */}
        <select
          value={config.style.fontSize}
          onChange={(e) => setFontSize(Number(e.target.value))}
          className="text-sm border-none focus:ring-0 bg-transparent px-2 py-1 rounded hover:bg-gray-100 cursor-pointer"
        >
          {FONT_SIZES.map((size) => (
            <option key={size.value} value={size.value}>
              {size.label}px
            </option>
          ))}
        </select>

        <div className="w-px h-5 bg-gray-200 mx-1" />

        {/* Bold */}
        <button
          onClick={toggleBold}
          className={clsx(
            'p-1.5 rounded hover:bg-gray-100 transition-colors',
            config.style.fontWeight === 'bold' && 'bg-blue-100 text-blue-600'
          )}
          title="Bold (Ctrl+B)"
        >
          <Bold className="w-4 h-4" />
        </button>

        {/* Italic */}
        <button
          onClick={toggleItalic}
          className={clsx(
            'p-1.5 rounded hover:bg-gray-100 transition-colors',
            fontStyle === 'italic' && 'bg-blue-100 text-blue-600'
          )}
          title="Italic (Ctrl+I)"
        >
          <Italic className="w-4 h-4" />
        </button>

        <div className="w-px h-5 bg-gray-200 mx-1" />

        {/* Alignment */}
        <button
          onClick={() => setAlignment('left')}
          className={clsx(
            'p-1.5 rounded hover:bg-gray-100 transition-colors',
            config.style.textAlign === 'left' && 'bg-blue-100 text-blue-600'
          )}
          title="Align left"
        >
          <AlignLeft className="w-4 h-4" />
        </button>
        <button
          onClick={() => setAlignment('center')}
          className={clsx(
            'p-1.5 rounded hover:bg-gray-100 transition-colors',
            config.style.textAlign === 'center' && 'bg-blue-100 text-blue-600'
          )}
          title="Align center"
        >
          <AlignCenter className="w-4 h-4" />
        </button>
        <button
          onClick={() => setAlignment('right')}
          className={clsx(
            'p-1.5 rounded hover:bg-gray-100 transition-colors',
            config.style.textAlign === 'right' && 'bg-blue-100 text-blue-600'
          )}
          title="Align right"
        >
          <AlignRight className="w-4 h-4" />
        </button>

        <div className="w-px h-5 bg-gray-200 mx-1" />

        {/* Color picker */}
        <div className="relative">
          <button
            onClick={() => setShowColorPicker(!showColorPicker)}
            className="p-1.5 rounded hover:bg-gray-100 transition-colors flex items-center gap-1"
            title="Text color"
          >
            <div
              className="w-4 h-4 rounded border border-gray-300"
              style={{ backgroundColor: config.style.color }}
            />
          </button>
          {showColorPicker && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-2 z-30">
              <div className="grid grid-cols-5 gap-1">
                {COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => setColor(color)}
                    className={clsx(
                      'w-6 h-6 rounded border-2 transition-transform hover:scale-110',
                      config.style.color === color ? 'border-blue-500' : 'border-transparent'
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Text input */}
      <textarea
        ref={textareaRef}
        value={config.content}
        onChange={(e) => handleContentChange(e.target.value)}
        placeholder={isHeading ? 'Heading...' : 'Type something...'}
        className={clsx(
          'w-full resize-none border-none focus:outline-none focus:ring-0 bg-transparent',
          'placeholder:text-gray-300 min-h-[32px]'
        )}
        style={{
          fontSize: `${config.style.fontSize}px`,
          fontWeight: config.style.fontWeight,
          fontStyle: fontStyle,
          textAlign: config.style.textAlign,
          color: config.style.color,
          lineHeight: isHeading ? 1.2 : 1.6,
        }}
        onKeyDown={(e) => {
          // Keyboard shortcuts
          if (e.ctrlKey || e.metaKey) {
            if (e.key === 'b') {
              e.preventDefault()
              toggleBold()
            }
            if (e.key === 'i') {
              e.preventDefault()
              toggleItalic()
            }
          }
        }}
      />
    </div>
  )
}
