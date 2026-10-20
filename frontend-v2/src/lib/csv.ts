import type { Application, ScreeningQuestion } from '../types'

export function safeCsvCell(value: unknown): string {
  let text = String(value ?? '')
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`
  return `"${text.replace(/"/g, '""')}"`
}

export function applicationsToCsv(rows: Application[], questions: ScreeningQuestion[]): string {
  const header = ['Full name', 'Email', 'Phone', 'Date applied', ...questions.map(q => q.label)]
  return [
    header,
    ...rows.map(a => [
      a.full_name,
      a.email,
      a.phone,
      a.created_at,
      ...questions.map(q => a.answers[q.id || String(q.sort_order)] ?? '')
    ])
  ]
    .map(row => row.map(safeCsvCell).join(','))
    .join('\r\n')
}
