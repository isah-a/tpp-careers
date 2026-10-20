// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { sanitizeHtml, stripHtml } from './sanitize'

describe('sanitizeHtml', () => {
  it('preserves valid rich-text formatting tags (bold, italic, underline, lists, paragraphs)', () => {
    const input =
      '<p>Welcome to <strong>TPP Hire</strong>.</p>' +
      '<p>We offer <em>flexible</em> and <u>competitive</u> benefits.</p>' +
      '<ul><li>Engineering</li><li>Design<ul><li>UI/UX</li><li>Design Systems</li></ul></li></ul>' +
      '<ol><li>Screening</li><li>Interview</li></ol>'

    const output = sanitizeHtml(input)
    expect(output).toContain('<strong>TPP Hire</strong>')
    expect(output).toContain('<em>flexible</em>')
    expect(output).toContain('<u>competitive</u>')
    expect(output).toContain('<ul><li>Engineering</li><li>Design<ul><li>UI/UX</li><li>Design Systems</li></ul></li></ul>')
    expect(output).toContain('<ol><li>Screening</li><li>Interview</li></ol>')
  })

  it('strips malicious script tags and inline event handlers to prevent XSS vulnerabilities', () => {
    const malicious =
      '<p>Legitimate content</p>' +
      '<script>alert("pwned")</script>' +
      '<img src="invalid.jpg" onerror="alert(document.cookie)" />' +
      '<a href="javascript:alert(1)">Click here</a>'

    const cleaned = sanitizeHtml(malicious)
    expect(cleaned).not.toContain('<script>')
    expect(cleaned).not.toContain('onerror')
    expect(cleaned).not.toContain('javascript:')
    expect(cleaned).toContain('Legitimate content')
  })

  it('safely transforms legacy plain-text descriptions into HTML paragraphs', () => {
    const plainText = 'Lead strategic operations across client engagements.\n\nMinimum 5 years experience required.'
    const result = sanitizeHtml(plainText)
    expect(result).toContain('<p>Lead strategic operations across client engagements.</p>')
    expect(result).toContain('<p>Minimum 5 years experience required.</p>')
  })
})

describe('stripHtml', () => {
  it('removes all HTML tags and collapses whitespace for card snippet previews', () => {
    const html = '<p>Lead strategic <strong>growth</strong> initiatives.</p><ul><li>Team leadership</li></ul>'
    const text = stripHtml(html)
    expect(text).toBe('Lead strategic growth initiatives. Team leadership')
  })
})
