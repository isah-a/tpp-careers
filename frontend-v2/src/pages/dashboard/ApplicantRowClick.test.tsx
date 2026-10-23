// @vitest-environment jsdom
import React from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { CandidatesPage } from './CandidatesPage'

let mockSearchParams = new URLSearchParams('fixture=true')
const mockNavigate = vi.fn()
let mockLocation = { search: '?fixture=true', pathname: '/dashboard/applicants' }

vi.mock('react-router-dom', () => ({
  useParams: () => ({}),
  useSearchParams: () => [mockSearchParams, vi.fn()],
  useNavigate: () => mockNavigate,
  useLocation: () => mockLocation,
  Link: ({ children, to, onClick, ...props }: any) => (
    <a
      href={to}
      onClick={e => {
        e.preventDefault()
        if (onClick) onClick(e)
        mockNavigate(to)
      }}
      {...props}
    >
      {children}
    </a>
  ),
}))

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    session: { user: { id: 'test-recruiter-uuid', email: 'recruiter@tpp.com' } },
    authorized: true,
    loading: false,
    signOut: vi.fn(),
  }),
}))

vi.mock('../../lib/supabase', () => ({
  isConfigured: true,
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockResolvedValue({ error: null }),
    })),
    rpc: vi.fn().mockResolvedValue({ error: null }),
    storage: {
      from: vi.fn(() => ({
        createSignedUrl: vi.fn().mockResolvedValue({
          data: { signedUrl: 'https://example.com/signed-cv.pdf' },
          error: null,
        }),
      })),
    },
  },
}))

describe('Applicant Row Click UX Behavior', () => {
  beforeEach(() => {
    mockNavigate.mockClear()
    mockSearchParams = new URLSearchParams('fixture=true')
    mockLocation = { search: '?fixture=true', pathname: '/dashboard/applicants' }
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem('tpp_dev_fixture', 'true')
    }
  })

  afterEach(() => {
    cleanup()
    if (typeof window !== 'undefined') {
      window.sessionStorage.clear()
    }
  })

  it('Requirement 1 & 2: Clicking on the table row (e.g. Email cell) opens candidate profile', async () => {
    render(<CandidatesPage />)

    // Find first candidate row's email cell
    const emailCell = screen.getByText('Philip@abc.io')
    expect(emailCell).toBeTruthy()

    // Click on the email cell
    fireEvent.click(emailCell)

    // Should navigate to candidate profile
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard/candidates/figma-1?fixture=true')
  })

  it('Requirement 1 & 2: Clicking on Applied On date cell opens candidate profile', async () => {
    render(<CandidatesPage />)

    const dateCells = screen.getAllByText('09 Feb 24')
    expect(dateCells.length).toBeGreaterThan(0)

    fireEvent.click(dateCells[0])

    expect(mockNavigate).toHaveBeenCalledWith('/dashboard/candidates/figma-1?fixture=true')
  })

  it('Requirement 1: Clicking candidate name link directly continues to navigate to candidate profile', async () => {
    render(<CandidatesPage />)

    const nameLink = screen.getByRole('link', { name: 'Philip Nwachukwu Mathew' })
    expect(nameLink).toBeTruthy()

    fireEvent.click(nameLink)

    expect(mockNavigate).toHaveBeenCalledWith('/dashboard/candidates/figma-1?fixture=true')
  })

  it('Requirement 3: Clicking checkbox selects row without triggering profile navigation', async () => {
    render(<CandidatesPage />)

    const checkbox = screen.getByLabelText('Select Philip Nwachukwu Mathew') as HTMLInputElement
    expect(checkbox).toBeTruthy()
    expect(checkbox.checked).toBe(false)

    fireEvent.click(checkbox)

    // Checkbox should be toggled
    expect(checkbox.checked).toBe(true)
    // Row navigation should NOT be called
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('Requirement 3: Clicking rating star updates rating without triggering profile navigation', async () => {
    render(<CandidatesPage />)

    const rateButtons = screen.getAllByLabelText('Rate 4 stars')
    expect(rateButtons.length).toBeGreaterThan(0)

    fireEvent.click(rateButtons[0])

    // Should not trigger candidate profile navigation
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('Requirement 3: Clicking stage transition badge opens menu without triggering profile navigation', async () => {
    render(<CandidatesPage />)

    const stageButtons = screen.getAllByTitle('Click to transition pipeline stage')
    expect(stageButtons.length).toBeGreaterThan(0)

    fireEvent.click(stageButtons[0])

    // Should not trigger profile navigation
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('Requirement 3: Clicking CV Download button triggers download without profile navigation', async () => {
    render(<CandidatesPage />)

    const downloadButtons = screen.getAllByRole('button', { name: 'Download' })
    expect(downloadButtons.length).toBeGreaterThan(0)

    fireEvent.click(downloadButtons[0])

    // Should not trigger profile navigation
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('Requirement 4: Pressing Enter on the row navigates to candidate profile', async () => {
    render(<CandidatesPage />)

    const rows = screen.getAllByRole('row')
    // Row 0 is header, Row 1 is first candidate
    const firstCandidateRow = rows[1]
    expect(firstCandidateRow).toBeTruthy()

    fireEvent.keyDown(firstCandidateRow, { key: 'Enter' })

    expect(mockNavigate).toHaveBeenCalledWith('/dashboard/candidates/figma-1?fixture=true')
  })
})
