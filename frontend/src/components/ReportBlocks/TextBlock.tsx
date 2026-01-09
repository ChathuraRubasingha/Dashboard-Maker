import { useState, useRef, useEffect } from 'react'
import { Bold, AlignLeft, AlignCenter, AlignRight } from 'lucide-react'
import clsx from 'clsx'
import type { TextBlockConfig } from '../../types'

interface TextBlockProps {
  config: TextBlockConfig
  isEditing: boolean
  onUpdate: (config: TextBlockConfig) => void
}

export default function TextBlock({ config, isEditing, onUpdate }: TextBlockProps) {
  const [showToolbar, setShowToolbar] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
    }
  }, [config.content])

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

  if (!isEditing) {
    // View mode
    if (!config.content) return null

    return (
      <div
        className="py-2"
        style={{
          fontSize: `${config.style.fontSize}px`,
          fontWeight: config.style.fontWeight,
          textAlign: config.style.textAlign,
          color: config.style.color,
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
      className="relative bg-white rounded-lg"
      onFocus={() => setShowToolbar(true)}
      onBlur={(e) => {
        // Only hide toolbar if focus moves outside this component
        if (!e.currentTarget.contains(e.relatedTarget)) {
          setShowToolbar(false)
        }
      }}
    >
      {/* Formatting toolbar */}
      {showToolbar && (
        <div className="absolute -top-10 left-0 flex items-center gap-1 bg-white border rounded-lg shadow-lg px-2 py-1 z-10">
          <select
            value={config.style.fontSize}
            onChange={(e) => setFontSize(Number(e.target.value))}
            className="text-sm border-none focus:ring-0 bg-transparent"
          >
            <option value={12}>12px</option>
            <option value={14}>14px</option>
            <option value={16}>16px</option>
            <option value={18}>18px</option>
            <option value={20}>20px</option>
            <option value={24}>24px</option>
            <option value={28}>28px</option>
            <option value={32}>32px</option>
          </select>
          <div className="w-px h-5 bg-gray-200 mx-1" />
          <button
            onClick={toggleBold}
            className={clsx(
              'p-1 rounded hover:bg-gray-100',
              config.style.fontWeight === 'bold' && 'bg-gray-100 text-blue-600'
            )}
          >
            <Bold className="w-4 h-4" />
          </button>
          <div className="w-px h-5 bg-gray-200 mx-1" />
          <button
            onClick={() => setAlignment('left')}
            className={clsx(
              'p-1 rounded hover:bg-gray-100',
              config.style.textAlign === 'left' && 'bg-gray-100 text-blue-600'
            )}
          >
            <AlignLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setAlignment('center')}
            className={clsx(
              'p-1 rounded hover:bg-gray-100',
              config.style.textAlign === 'center' && 'bg-gray-100 text-blue-600'
            )}
          >
            <AlignCenter className="w-4 h-4" />
          </button>
          <button
            onClick={() => setAlignment('right')}
            className={clsx(
              'p-1 rounded hover:bg-gray-100',
              config.style.textAlign === 'right' && 'bg-gray-100 text-blue-600'
            )}
          >
            <AlignRight className="w-4 h-4" />
          </button>
        </div>
      )}

      <textarea
        ref={textareaRef}
        value={config.content}
        onChange={(e) => handleContentChange(e.target.value)}
        placeholder="Type something..."
        className="w-full resize-none border-none focus:outline-none focus:ring-0 bg-transparent min-h-[40px]"
        style={{
          fontSize: `${config.style.fontSize}px`,
          fontWeight: config.style.fontWeight,
          textAlign: config.style.textAlign,
          color: config.style.color,
        }}
      />
    </div>
  )
}
