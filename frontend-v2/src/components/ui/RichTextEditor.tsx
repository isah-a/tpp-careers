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

  // Synchronize when content is updated externally (e.g. after async DB load)
  useEffect(() => {
    if (!editor || isUpdatingRef.current) return

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

  return (
    <div
      className={`rounded-xl border border-gray-200 overflow-hidden bg-white focus-within:ring-2 focus-within:ring-[#5C00DD] focus-within:border-transparent transition-all shadow-2xs ${className}`}
    >
      {/* Visual Formatting Toolbar matching Jobs-2.png */}
      <div className="bg-gray-50 border-b border-gray-200 px-3 py-2 flex items-center gap-1 select-none">
        <button
          type="button"
          onMouseDown={e => e.preventDefault()}
          onClick={() => editor?.chain().focus().toggleBold().run()}
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
          onMouseDown={e => e.preventDefault()}
          onClick={() => editor?.chain().focus().toggleItalic().run()}
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
          onMouseDown={e => e.preventDefault()}
          onClick={() => editor?.chain().focus().toggleUnderline().run()}
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
          onMouseDown={e => e.preventDefault()}
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
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
          onMouseDown={e => e.preventDefault()}
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
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
      <div style={{ minHeight }} className="overflow-y-auto cursor-text" onClick={() => editor?.commands.focus()}>
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}
