// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { SuccessPage } from './SuccessPage'

let mockLocationState: any = null

vi.mock('react-router-dom', () => ({
  useLocation: () => ({ pathname: '/application-success', state: mockLocationState }),
  Link: ({ children, to, ...props }: any) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}))

describe('SuccessPage (frontend-v2 Task B)', () => {
  beforeEach(() => {
    mockLocationState = null
  })

  it('renders approved heading, supporting text, Lucide icon, and return link', () => {
    render(<SuccessPage />)

    // Heading in title case
    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading.textContent?.trim()).toBe('Application submitted successfully')

    // Exact approved supporting text
    expect(
      screen.getByText(
        "Thank you for applying. Your application has been received, and our recruitment team will review it. If you're shortlisted, we'll contact you using the details you provided."
      )
    ).toBeTruthy()

    // Clear "Return to careers" button linking to /
    const returnLink = screen.getByRole('link', { name: /return to careers/i })
    expect(returnLink).toBeTruthy()
    expect(returnLink.getAttribute('href')).toBe('/')

    // Should NOT contain the old lowercase task_alt text
    expect(screen.queryByText('task_alt')).toBeNull()
    expect(screen.queryByText('application received successfully')).toBeNull()
  })

  it('renders role badge when role state is passed in navigation', () => {
    mockLocationState = { role: 'Principal Security Engineer' }
    render(<SuccessPage />)

    expect(screen.getByText(/Role: Principal Security Engineer/i)).toBeTruthy()
  })
})
