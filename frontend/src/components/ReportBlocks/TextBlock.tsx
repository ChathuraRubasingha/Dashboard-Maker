import { useState, useRef, useEffect } from 'react'
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Type,
  Highlighter,
} from 'lucide-react'
import clsx from 'clsx'
import type { TextBlockConfig, TextBlockStyle } from '../../types'

interface TextBlockProps {
  config: TextBlockConfig
  isEditing: boolean
  onUpdate: (config: TextBlockConfig) => void
}

const FONT_SIZES = [
  { value: 10, label: '10' },
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
  { value: 64, label: '64' },
  { value: 72, label: '72' },
]

const FONT_FAMILIES = [
  { value: 'inherit', label: 'Default' },
  { value: 'Arial, sans-serif', label: 'Arial' },
  { value: 'Georgia, serif', label: 'Georgia' },
  { value: 'Times New Roman, serif', label: 'Times New Roman' },
  { value: 'Courier New, monospace', label: 'Courier New' },
  { value: 'Verdana, sans-serif', label: 'Verdana' },
  { value: 'Trebuchet MS, sans-serif', label: 'Trebuchet' },
  { value: 'Impact, sans-serif', label: 'Impact' },
]

const FONT_WEIGHTS = [
  { value: '100', label: 'Thin' },
  { value: '200', label: 'Extra Light' },
  { value: '300', label: 'Light' },
  { value: 'normal', label: 'Normal' },
  { value: '500', label: 'Medium' },
  { value: '600', label: 'Semi Bold' },
  { value: 'bold', label: 'Bold' },
  { value: '800', label: 'Extra Bold' },
  { value: '900', label: 'Black' },
]

const COLORS = [
  '#000000', '#1f2937', '#374151', '#6b7280', '#9ca3af', '#d1d5db', '#f3f4f6', '#ffffff',
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e', '#10b981', '#14b8a6',
  '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
]

const LINE_HEIGHTS = [
  { value: 1, label: '1' },
  { value: 1.25, label: '1.25' },
  { value: 1.5, label: '1.5' },
  { value: 1.75, label: '1.75' },
  { value: 2, label: '2' },
]

export default function TextBlock({ config, isEditing, onUpdate }: TextBlockProps) {
  const [showToolbar, setShowToolbar] = useState(false)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [showBgColorPicker, setShowBgColorPicker] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
    }
  }, [config.content])

  // Close color pickers when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowColorPicker(false)
        setShowBgColorPicker(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const updateStyle = (updates: Partial<TextBlockStyle>) => {
    onUpdate({
      ...config,
      style: { ...config.style, ...updates },
    })
  }

  const handleContentChange = (content: string) => {
    onUpdate({ ...config, content })
  }

  const toggleBold = () => {
    const isBold = config.style.fontWeight === 'bold' || config.style.fontWeight === '700'
    updateStyle({ fontWeight: isBold ? 'normal' : 'bold' })
  }

  const toggleItalic = () => {
    updateStyle({ fontStyle: config.style.fontStyle === 'italic' ? 'normal' : 'italic' })
  }

  const toggleUnderline = () => {
    updateStyle({ textDecoration: config.style.textDecoration === 'underline' ? 'none' : 'underline' })
  }

  const toggleStrikethrough = () => {
    updateStyle({ textDecoration: config.style.textDecoration === 'line-through' ? 'none' : 'line-through' })
  }

  // Determine if this is a heading based on font size
  const isHeading = config.style.fontSize >= 24
  const fontStyle = config.style.fontStyle || 'normal'
  const textDecoration = config.style.textDecoration || 'none'
  const fontFamily = config.style.fontFamily || 'inherit'
  const lineHeight = config.style.lineHeight || (isHeading ? 1.2 : 1.6)
  const letterSpacing = config.style.letterSpacing || 0
  const backgroundColor = config.style.backgroundColor || 'transparent'
  const padding = config.style.padding || 0
  const borderRadius = config.style.borderRadius || 0
  const isBold = config.style.fontWeight === 'bold' || config.style.fontWeight === '700'

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
          fontFamily: fontFamily,
          lineHeight: lineHeight,
          letterSpacing: `${letterSpacing}px`,
          textDecoration: textDecoration,
          backgroundColor: backgroundColor,
          padding: padding > 0 ? `${padding}px` : undefined,
          borderRadius: borderRadius > 0 ? `${borderRadius}px` : undefined,
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
        if (!e.currentTarget.contains(e.relatedTarget)) {
          setShowToolbar(false)
          setShowColorPicker(false)
          setShowBgColorPicker(false)
        }
      }}
    >
      {/* Main formatting toolbar */}
      <div
        className={clsx(
          'absolute -top-12 left-0 flex items-center gap-0.5 bg-white border border-gray-200 rounded-lg shadow-lg px-1.5 py-1 z-20 transition-all',
          showToolbar ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
        )}
      >
        {/* Font family dropdown */}
        <select
          value={fontFamily}
          onChange={(e) => updateStyle({ fontFamily: e.target.value })}
          className="text-xs border-none focus:ring-0 bg-transparent px-1 py-1 rounded hover:bg-gray-100 cursor-pointer w-24"
        >
          {FONT_FAMILIES.map((font) => (
            <option key={font.value} value={font.value}>
              {font.label}
            </option>
          ))}
        </select>

        {/* Font size dropdown */}
        <select
          value={config.style.fontSize}
          onChange={(e) => updateStyle({ fontSize: Number(e.target.value) })}
          className="text-xs border-none focus:ring-0 bg-transparent px-1 py-1 rounded hover:bg-gray-100 cursor-pointer w-14"
        >
          {FONT_SIZES.map((size) => (
            <option key={size.value} value={size.value}>
              {size.label}
            </option>
          ))}
        </select>

        <div className="w-px h-5 bg-gray-200 mx-0.5" />

        {/* Bold */}
        <button
          onClick={toggleBold}
          className={clsx(
            'p-1.5 rounded hover:bg-gray-100 transition-colors',
            isBold && 'bg-purple-100 text-purple-600'
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
            fontStyle === 'italic' && 'bg-purple-100 text-purple-600'
          )}
          title="Italic (Ctrl+I)"
        >
          <Italic className="w-4 h-4" />
        </button>

        {/* Underline */}
        <button
          onClick={toggleUnderline}
          className={clsx(
            'p-1.5 rounded hover:bg-gray-100 transition-colors',
            textDecoration === 'underline' && 'bg-purple-100 text-purple-600'
          )}
          title="Underline (Ctrl+U)"
        >
          <Underline className="w-4 h-4" />
        </button>

        {/* Strikethrough */}
        <button
          onClick={toggleStrikethrough}
          className={clsx(
            'p-1.5 rounded hover:bg-gray-100 transition-colors',
            textDecoration === 'line-through' && 'bg-purple-100 text-purple-600'
          )}
          title="Strikethrough"
        >
          <Strikethrough className="w-4 h-4" />
        </button>

        <div className="w-px h-5 bg-gray-200 mx-0.5" />

        {/* Alignment */}
        <button
          onClick={() => updateStyle({ textAlign: 'left' })}
          className={clsx(
            'p-1.5 rounded hover:bg-gray-100 transition-colors',
            config.style.textAlign === 'left' && 'bg-purple-100 text-purple-600'
          )}
          title="Align left"
        >
          <AlignLeft className="w-4 h-4" />
        </button>
        <button
          onClick={() => updateStyle({ textAlign: 'center' })}
          className={clsx(
            'p-1.5 rounded hover:bg-gray-100 transition-colors',
            config.style.textAlign === 'center' && 'bg-purple-100 text-purple-600'
          )}
          title="Align center"
        >
          <AlignCenter className="w-4 h-4" />
        </button>
        <button
          onClick={() => updateStyle({ textAlign: 'right' })}
          className={clsx(
            'p-1.5 rounded hover:bg-gray-100 transition-colors',
            config.style.textAlign === 'right' && 'bg-purple-100 text-purple-600'
          )}
          title="Align right"
        >
          <AlignRight className="w-4 h-4" />
        </button>
        <button
          onClick={() => updateStyle({ textAlign: 'justify' })}
          className={clsx(
            'p-1.5 rounded hover:bg-gray-100 transition-colors',
            config.style.textAlign === 'justify' && 'bg-purple-100 text-purple-600'
          )}
          title="Justify"
        >
          <AlignJustify className="w-4 h-4" />
        </button>

        <div className="w-px h-5 bg-gray-200 mx-0.5" />

        {/* Text color picker */}
        <div className="relative">
          <button
            onClick={() => {
              setShowColorPicker(!showColorPicker)
              setShowBgColorPicker(false)
            }}
            className="p-1.5 rounded hover:bg-gray-100 transition-colors flex items-center gap-1"
            title="Text color"
          >
            <Type className="w-4 h-4" />
            <div
              className="w-3 h-3 rounded-sm border border-gray-300"
              style={{ backgroundColor: config.style.color }}
            />
          </button>
          {showColorPicker && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-2 z-30">
              <div className="grid grid-cols-8 gap-1">
                {COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => {
                      updateStyle({ color })
                      setShowColorPicker(false)
                    }}
                    className={clsx(
                      'w-5 h-5 rounded border-2 transition-transform hover:scale-110',
                      config.style.color === color ? 'border-purple-500' : 'border-transparent'
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Background color picker */}
        <div className="relative">
          <button
            onClick={() => {
              setShowBgColorPicker(!showBgColorPicker)
              setShowColorPicker(false)
            }}
            className="p-1.5 rounded hover:bg-gray-100 transition-colors flex items-center gap-1"
            title="Background color"
          >
            <Highlighter className="w-4 h-4" />
            <div
              className="w-3 h-3 rounded-sm border border-gray-300"
              style={{ backgroundColor: backgroundColor === 'transparent' ? '#ffffff' : backgroundColor }}
            />
          </button>
          {showBgColorPicker && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-2 z-30">
              <button
                onClick={() => {
                  updateStyle({ backgroundColor: 'transparent' })
                  setShowBgColorPicker(false)
                }}
                className="w-full text-xs text-gray-500 hover:bg-gray-100 px-2 py-1 rounded mb-1"
              >
                No background
              </button>
              <div className="grid grid-cols-8 gap-1">
                {COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => {
                      updateStyle({ backgroundColor: color })
                      setShowBgColorPicker(false)
                    }}
                    className={clsx(
                      'w-5 h-5 rounded border-2 transition-transform hover:scale-110',
                      backgroundColor === color ? 'border-purple-500' : 'border-transparent'
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="w-px h-5 bg-gray-200 mx-0.5" />

        {/* Advanced toggle */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={clsx(
            'p-1.5 rounded hover:bg-gray-100 transition-colors text-xs font-medium',
            showAdvanced && 'bg-purple-100 text-purple-600'
          )}
          title="More options"
        >
          More
        </button>
      </div>

      {/* Advanced options panel */}
      {showToolbar && showAdvanced && (
        <div className="absolute -top-24 left-0 flex items-center gap-2 bg-white border border-gray-200 rounded-lg shadow-lg px-2 py-1.5 z-20">
          {/* Font weight */}
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-500">Weight:</span>
            <select
              value={config.style.fontWeight}
              onChange={(e) => updateStyle({ fontWeight: e.target.value as TextBlockStyle['fontWeight'] })}
              className="text-xs border-none focus:ring-0 bg-transparent px-1 py-0.5 rounded hover:bg-gray-100 cursor-pointer"
            >
              {FONT_WEIGHTS.map((weight) => (
                <option key={weight.value} value={weight.value}>
                  {weight.label}
                </option>
              ))}
            </select>
          </div>

          <div className="w-px h-4 bg-gray-200" />

          {/* Line height */}
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-500">Line:</span>
            <select
              value={lineHeight}
              onChange={(e) => updateStyle({ lineHeight: parseFloat(e.target.value) })}
              className="text-xs border-none focus:ring-0 bg-transparent px-1 py-0.5 rounded hover:bg-gray-100 cursor-pointer"
            >
              {LINE_HEIGHTS.map((lh) => (
                <option key={lh.value} value={lh.value}>
                  {lh.label}
                </option>
              ))}
            </select>
          </div>

          <div className="w-px h-4 bg-gray-200" />

          {/* Letter spacing */}
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-500">Spacing:</span>
            <input
              type="number"
              min="-5"
              max="20"
              value={letterSpacing}
              onChange={(e) => updateStyle({ letterSpacing: parseFloat(e.target.value) || 0 })}
              className="w-12 text-xs border border-gray-200 focus:ring-1 focus:ring-purple-500 rounded px-1 py-0.5"
            />
          </div>

          <div className="w-px h-4 bg-gray-200" />

          {/* Padding */}
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-500">Pad:</span>
            <input
              type="number"
              min="0"
              max="50"
              value={padding}
              onChange={(e) => updateStyle({ padding: parseInt(e.target.value) || 0 })}
              className="w-12 text-xs border border-gray-200 focus:ring-1 focus:ring-purple-500 rounded px-1 py-0.5"
            />
          </div>

          {/* Border radius */}
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-500">Radius:</span>
            <input
              type="number"
              min="0"
              max="50"
              value={borderRadius}
              onChange={(e) => updateStyle({ borderRadius: parseInt(e.target.value) || 0 })}
              className="w-12 text-xs border border-gray-200 focus:ring-1 focus:ring-purple-500 rounded px-1 py-0.5"
            />
          </div>
        </div>
      )}

      {/* Text input */}
      <div
        style={{
          backgroundColor: backgroundColor,
          padding: padding > 0 ? `${padding}px` : undefined,
          borderRadius: borderRadius > 0 ? `${borderRadius}px` : undefined,
        }}
      >
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
            fontFamily: fontFamily,
            lineHeight: lineHeight,
            letterSpacing: `${letterSpacing}px`,
            textDecoration: textDecoration,
          }}
          onKeyDown={(e) => {
            if (e.ctrlKey || e.metaKey) {
              if (e.key === 'b') {
                e.preventDefault()
                toggleBold()
              }
              if (e.key === 'i') {
                e.preventDefault()
                toggleItalic()
              }
              if (e.key === 'u') {
                e.preventDefault()
                toggleUnderline()
              }
            }
          }}
        />
      </div>
    </div>
  )
}
