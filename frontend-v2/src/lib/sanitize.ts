import DOMPurify from 'dompurify'

// Resolve DOMPurify instance for both browser and DOM-simulated environments
function getPurifyInstance() {
  if (typeof (DOMPurify as any)?.sanitize === 'function') {
    return DOMPurify
  }
  if (typeof window !== 'undefined' && typeof DOMPurify === 'function') {
    return (DOMPurify as unknown as (win: Window) => typeof DOMPurify)(window)
  }
  return DOMPurify
}

/**
 * Sanitizes rich-text HTML using DOMPurify to prevent XSS attacks while
 * permitting standard text styling, lists, paragraphs, and links.
 */
export function sanitizeHtml(dirty?: string | null): string {
  if (!dirty) return ''

  // If text does not contain any HTML tags, convert plain linebreaks to HTML paragraphs
  if (!/<[a-z][\s\S]*>/i.test(dirty)) {
    const paragraphs = dirty
      .split(/\n\s*\n/)
      .map(p => {
        const lines = p.split('\n').map(line => line.trim()).filter(Boolean).join('<br />')
        return lines ? `<p>${lines}</p>` : ''
      })
      .filter(Boolean)
      .join('')

    return paragraphs || `<p>${dirty}</p>`
  }

  const purifier = getPurifyInstance()
  if (typeof purifier?.sanitize !== 'function') {
    return dirty
  }

  return purifier.sanitize(dirty, {
    ALLOWED_TAGS: [
      'p',
      'br',
      'strong',
      'b',
      'em',
      'i',
      'u',
      's',
      'strike',
      'ul',
      'ol',
      'li',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'blockquote',
      'a',
      'span',
    ],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
  })
}

/**
 * Strips all HTML tags to produce a clean plain-text string,
 * suitable for preview cards, meta descriptions, and summaries.
 */
export function stripHtml(dirty?: string | null): string {
  if (!dirty) return ''
  return dirty
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
