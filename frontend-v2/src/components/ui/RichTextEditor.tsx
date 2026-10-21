import { useEffect, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Placeholder from '@tiptap/extension-placeholder'
import { Bold, Italic, List, ListOrdered, Underline as UnderlineIcon } from 'lucide-react'

interface RichTextEditorProps {
  content: string
  onChange: (value: string) => void
  placeholder?: string
  minHeight?: string
  className?: string
  disabled?: boolean
}

/**
 * Converts legacy plain-text content into HTML paragraphs so existing
 * vacancy descriptions remain readable and formatted.
 */
function toHtml(raw?: string): string {
  if (!raw) return '<p></p>'
  if (/<[a-z][\s\S]*>/i.test(raw)) return raw

  const paragraphs = raw
    .split(/\n\s*\n/)
    .map(p => {
      const lines = p
        .split('\n')
        .map(l => l.trim())
        .filter(Boolean)
        .join('<br />')
      return lines ? `<p>${lines}</p>` : ''
    })
    .filter(Boolean)

  return paragraphs.length > 0 ? paragraphs.join('') : `<p>${raw}</p>`
}

export function RichTextEditor({
  content,
  onChange,
  placeholder = 'Enter content...',
  minHeight = '140px',
  className = '',
  disabled = false,
}: RichTextEditorProps) {
  const isUpdatingRef = useRef(false)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false,
        },
      }),
      Underline,
      Placeholder.configure({
        placeholder,
        emptyEditorClass: 'is-editor-empty',
      }),
    ],
    content: toHtml(content),
    editable: !disabled,
    editorProps: {
      attributes: {
        class:
          'tiptap-content p-4 text-sm text-gray-800 focus:outline-none focus:ring-0 leading-relaxed font-normal min-h-full',
      },
    },
    onUpdate: ({ editor }) => {
      isUpdatingRef.current = true
      if (editor.isEmpty) {
        onChange('')
      } else {
        onChange(editor.getHTML())
      }
      setTimeout(() => {
        isUpdatingRef.current = false
      }, 0)
    },
  })

  // Synchronize when content is updated externally (e.g. after async DB load or template switch)
  useEffect(() => {
    // If the editor is actively focused or currently performing an internal update,
    // do not overwrite content to preserve the user's cursor position and active selection.
    if (!editor || isUpdatingRef.current || editor.isFocused) return

    const currentHtml = editor.getHTML()
    const targetHtml = toHtml(content)

    // Only update if target differs from current editor content
    if (content !== undefined && currentHtml !== targetHtml) {
      const plainText = content.trim()
      const editorText = editor.getText().trim()

      if (plainText !== editorText && (!editor.isEmpty || plainText !== '')) {
        editor.commands.setContent(targetHtml, { emitUpdate: false })
      }
    }
  }, [content, editor])

  useEffect(() => {
    if (editor) {
      editor.setEditable(!disabled)
    }
  }, [disabled, editor])

  // Helper to execute formatting actions immediately on mousedown
  // to preserve the active selection without stealing focus
  const createToolbarAction = (action: (chain: any) => any) => {
    return {
      onMouseDown: (e: React.MouseEvent) => {
        e.preventDefault()
        if (!editor || disabled) return
        action(editor.chain()).run()
      },
      onClick: (e: React.MouseEvent) => {
        e.preventDefault()
        // Handle keyboard navigation (Enter/Space on focused button has detail === 0)
        if (e.detail === 0 && editor && !disabled) {
          action(editor.chain()).run()
        }
      },
    }
  }

  return (
    <div
      className={`rounded-xl border border-gray-200 overflow-hidden bg-white focus-within:ring-2 focus-within:ring-[#5C00DD] focus-within:border-transparent transition-all shadow-2xs ${className}`}
    >
      {/* Visual Formatting Toolbar matching Jobs-2.png */}
      <div className="bg-gray-50 border-b border-gray-200 px-3 py-2 flex items-center gap-1 select-none">
        <button
          type="button"
          {...createToolbarAction(chain => chain.toggleBold().focus())}
          disabled={!editor || disabled}
          className={`p-1.5 rounded transition-colors ${
            editor?.isActive('bold')
              ? 'bg-[#5C00DD]/15 text-[#5C00DD] font-bold'
              : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'
          }`}
          title="Bold (Ctrl+B)"
        >
          <Bold size={14} />
        </button>

        <button
          type="button"
          {...createToolbarAction(chain => chain.toggleItalic().focus())}
          disabled={!editor || disabled}
          className={`p-1.5 rounded transition-colors ${
            editor?.isActive('italic')
              ? 'bg-[#5C00DD]/15 text-[#5C00DD] font-bold'
              : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'
          }`}
          title="Italic (Ctrl+I)"
        >
          <Italic size={14} />
        </button>

        <button
          type="button"
          {...createToolbarAction(chain => chain.toggleUnderline().focus())}
          disabled={!editor || disabled}
          className={`p-1.5 rounded transition-colors ${
            editor?.isActive('underline')
              ? 'bg-[#5C00DD]/15 text-[#5C00DD] font-bold'
              : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'
          }`}
          title="Underline (Ctrl+U)"
        >
          <UnderlineIcon size={14} />
        </button>

        <span className="w-px h-4 bg-gray-300 mx-1.5" />

        <button
          type="button"
          {...createToolbarAction(chain => chain.toggleBulletList().focus())}
          disabled={!editor || disabled}
          className={`p-1.5 rounded transition-colors ${
            editor?.isActive('bulletList')
              ? 'bg-[#5C00DD]/15 text-[#5C00DD] font-bold'
              : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'
          }`}
          title="Bulleted List"
        >
          <List size={14} />
        </button>

        <button
          type="button"
          {...createToolbarAction(chain => chain.toggleOrderedList().focus())}
          disabled={!editor || disabled}
          className={`p-1.5 rounded transition-colors ${
            editor?.isActive('orderedList')
              ? 'bg-[#5C00DD]/15 text-[#5C00DD] font-bold'
              : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'
          }`}
          title="Numbered List"
        >
          <ListOrdered size={14} />
        </button>
      </div>

      {/* Editor Content Area */}
      <div
        style={{ minHeight }}
        className="overflow-y-auto cursor-text"
        onClick={e => {
          if (e.target === e.currentTarget) {
            editor?.commands.focus('end')
          }
        }}
      >
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}
