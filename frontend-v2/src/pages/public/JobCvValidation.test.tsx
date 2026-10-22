// @vitest-environment jsdom
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { JobPage } from './JobPage'

const mockNavigate = vi.fn()

vi.mock('react-router-dom', () => ({
  useParams: () => ({ slug: 'senior-frontend-engineer' }),
  useNavigate: () => mockNavigate,
  Link: ({ children, to, ...props }: any) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}))

// Mock Supabase
vi.mock('../../lib/supabase', () => ({
  isConfigured: true,
  supabase: {
    from: vi.fn((table: string) => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'vac-1',
              title: 'Senior Frontend Engineer',
              slug: 'senior-frontend-engineer',
              status: 'active',
              description: 'Build amazing software',
              requirements: 'React, TypeScript',
              location: 'Remote',
              employment_type: 'Full-time',
              client_name: 'TPP Tech',
              workplace_type: 'remote',
              compensation_currency: 'USD',
            },
            error: null,
          }),
          order: vi.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        })),
      })),
    })),
    functions: {
      invoke: vi.fn(),
    },
  },
}))

describe('Public Application Immediate CV Validation (Task A)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('rejects an oversized file immediately upon file input change and shows inline error', async () => {
    render(<JobPage />)

    // Wait for vacancy form to load
    await waitFor(() => {
      expect(screen.getByText('Senior Frontend Engineer')).toBeTruthy()
    })

    const fileInput = document.querySelector('input[type="file"][name="cv"]') as HTMLInputElement
    expect(fileInput).toBeTruthy()

    // 1. Select a 6MB PDF file (exceeds 5MB limit)
    const oversizedFile = new File([new Uint8Array(6 * 1024 * 1024)], 'large_portfolio.pdf', {
      type: 'application/pdf',
    })

    fireEvent.change(fileInput, { target: { files: [oversizedFile] } })

    // Inline error must be displayed directly below the upload control
    const errorEl = await screen.findByRole('alert')
    expect(errorEl.textContent).toContain('CV must be 5 MB or smaller')

    // Must NOT display the invalid file as successfully attached
    expect(screen.queryByText('large_portfolio.pdf')).toBeNull()
    expect(screen.getByText('Invalid file selected')).toBeTruthy()

    // 2. Select an unsupported file extension (.exe)
    const invalidFormatFile = new File(['fake'], 'virus.exe', { type: 'application/octet-stream' })
    fireEvent.change(fileInput, { target: { files: [invalidFormatFile] } })

    const alertEl = screen.getByRole('alert')
    expect(alertEl.textContent).toContain('Only PDF and DOCX files are accepted')
    expect(screen.queryByText('virus.exe')).toBeNull()

    // 3. Clear error and display attachment when a valid PDF is selected
    const validFile = new File([new Uint8Array(1024 * 500)], 'my_clean_resume.pdf', {
      type: 'application/pdf',
    })
    fireEvent.change(fileInput, { target: { files: [validFile] } })

    // The inline error must be cleared
    await waitFor(() => {
      expect(screen.queryByText('Only PDF and DOCX files are accepted')).toBeNull()
      expect(screen.queryByText('CV must be 5 MB or smaller')).toBeNull()
    })

    // Display the attached file name and size
    expect(screen.getByText('my_clean_resume.pdf')).toBeTruthy()
    expect(screen.getByText(/MB • Click to replace/i)).toBeTruthy()
  })

  it('keeps submit button disabled when no file or an invalid file is selected', async () => {
    render(<JobPage />)

    await waitFor(() => {
      expect(screen.getByText('Senior Frontend Engineer')).toBeTruthy()
    })

    const submitBtn = screen.getByRole('button', { name: /Attach CV to continue|Complete verification/i }) as HTMLButtonElement
    expect(submitBtn.disabled).toBe(true)
  })
})
