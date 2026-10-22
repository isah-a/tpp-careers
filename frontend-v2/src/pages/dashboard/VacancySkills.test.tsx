// @vitest-environment jsdom
import React from 'react'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { VacancyEditorPage } from './VacancyEditorPage'
import { JobDetailsPage } from './JobDetailsPage'
import { vacancyDraftSchema, vacancySchema } from '../../lib/validation'

// Track route params for testing
let mockParams: { id?: string } = {}
let mockSearchParams: URLSearchParams = new URLSearchParams()
const mockNavigate = vi.fn()

// Mock react-router-dom completely to avoid duplicate React instances across nested node_modules
vi.mock('react-router-dom', () => ({
  useParams: () => mockParams,
  useSearchParams: () => [mockSearchParams, vi.fn()],
  useNavigate: () => mockNavigate,
  Link: ({ children, to, ...props }: any) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}))

const EMPTY_SKILLS_UUID = '00000000-0000-0000-0000-000000000002'

// Mock supabase client
vi.mock('../../lib/supabase', () => {
  return {
    isConfigured: true,
    supabase: {
      from: vi.fn((table: string) => {
        if (table === 'vacancies') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn((col: string, val: string) => {
              if (val === 'vac-saved-skills') {
                return {
                  single: vi.fn().mockResolvedValue({
                    data: {
                      id: 'vac-saved-skills',
                      title: 'Backend Engineer',
                      slug: 'backend-engineer',
                      client_name: 'TPP Careers',
                      department: 'Engineering',
                      location: 'Lagos, Nigeria',
                      employment_type: 'Full-time',
                      workplace_type: 'hybrid',
                      skills: ['Python', 'Django', 'Docker'],
                      description: '<p>Backend engineering role description</p>',
                      requirements: '<p>Backend engineering requirements</p>',
                      benefits: ['Health insurance'],
                      status: 'active',
                      screening_questions: [],
                    },
                    error: null,
                  }),
                }
              }
              if (val === EMPTY_SKILLS_UUID) {
                return {
                  single: vi.fn().mockResolvedValue({
                    data: {
                      id: EMPTY_SKILLS_UUID,
                      title: 'General Manager',
                      slug: 'general-manager',
                      client_name: 'TPP Careers',
                      department: 'Operations',
                      location: 'Abuja, Nigeria',
                      employment_type: 'Full-time',
                      workplace_type: 'onsite',
                      skills: [],
                      description: '<p>General manager role description</p>',
                      requirements: '<p>General manager requirements</p>',
                      benefits: [],
                      status: 'active',
                      screening_questions: [],
                    },
                    error: null,
                  }),
                }
              }
              return {
                single: vi.fn().mockResolvedValue({ data: null, error: new Error('Not found') }),
              }
            }),
          }
        }
        if (table === 'applications') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({ data: [], error: null }),
          }
        }
        if (table === 'recruiters') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
            maybeSingle: vi.fn().mockResolvedValue({ data: { user_id: 'rec-1', role: 'admin' }, error: null }),
          }
        }
        if (table === 'vacancy_collaborators') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({ data: [], error: null }),
          }
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
        }
      }),
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
        onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
      },
    },
  }
})

// Mock AuthContext
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    session: { user: { id: 'rec-1', email: 'hr@tpp.com' } },
    authorized: true,
    loading: false,
    signOut: vi.fn(),
  }),
}))

describe('Vacancy Skills Defaults and Lifecycle', () => {
  beforeEach(() => {
    mockParams = {}
    mockSearchParams = new URLSearchParams()
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('Requirement 1 & 2: New vacancies start with an empty skills array, without Figma presets', async () => {
    mockParams = {} // new vacancy has no id

    render(<VacancyEditorPage />)

    await waitFor(() => {
      expect(screen.getByText('Skills')).toBeTruthy()
    })

    // Input placeholder indicates empty skills array
    const skillInput = screen.getByPlaceholderText('Type a skill and press Enter...')
    expect(skillInput).toBeTruthy()

    // Must NOT contain Figma hardcoded skills
    expect(screen.queryByText('Ecosystem Thinker')).toBeNull()
    expect(screen.queryByText('Strong communication')).toBeNull()
    expect(screen.queryByText('High on Execution')).toBeNull()
  })

  it('Requirement 4: Skill tag input handles Enter, comma, duplicate avoidance, and removal', async () => {
    mockParams = {}

    render(<VacancyEditorPage />)

    const input = screen.getByPlaceholderText('Type a skill and press Enter...')

    // Add with Enter
    fireEvent.change(input, { target: { value: 'React' } })
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' })

    await waitFor(() => {
      expect(screen.getByText('React')).toBeTruthy()
    })

    // Add with comma
    fireEvent.change(input, { target: { value: 'TypeScript' } })
    fireEvent.keyDown(input, { key: ',', code: 'Comma' })

    await waitFor(() => {
      expect(screen.getByText('TypeScript')).toBeTruthy()
    })

    // Avoid duplicate
    fireEvent.change(input, { target: { value: 'React' } })
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' })
    const reactTags = screen.getAllByText('React')
    expect(reactTags).toHaveLength(1)

    // Remove skill tag
    const removeBtn = screen.getByLabelText('Remove React')
    fireEvent.click(removeBtn)

    await waitFor(() => {
      expect(screen.queryByText('React')).toBeNull()
      expect(screen.getByText('TypeScript')).toBeTruthy()
    })
  })

  it('Requirement 3: Existing vacancies continue loading their saved skills correctly when editing', async () => {
    mockParams = { id: 'vac-saved-skills' }

    render(<VacancyEditorPage />)

    await waitFor(() => {
      expect(screen.getByText('Python')).toBeTruthy()
      expect(screen.getByText('Django')).toBeTruthy()
      expect(screen.getByText('Docker')).toBeTruthy()
    })
  })

  it('Requirement 5: Vacancy validation passes when skills array is empty', () => {
    const draftPayload = {
      title: 'Senior Product Manager',
      slug: 'senior-product-manager',
      client_name: 'TPP Careers',
      description: 'Role overview for product lead with over 5 years experience.',
      requirements: 'Degree and track record required.',
      location: 'Lagos, Nigeria',
      employment_type: 'Full-time',
      workplace_type: 'hybrid' as const,
      compensation_min: null,
      compensation_max: null,
      compensation_currency: 'NGN',
      start_date: null,
      deadline: null,
      skills: [], // EMPTY SKILLS ARRAY
      benefits: [],
      status: 'draft' as const,
    }

    const draftResult = vacancyDraftSchema.safeParse(draftPayload)
    expect(draftResult.success).toBe(true)

    const publishPayload = {
      ...draftPayload,
      description: 'Comprehensive role description with more than twenty characters for publishing.',
      requirements: 'Comprehensive requirements with more than ten characters.',
      status: 'active' as const,
    }

    const publishResult = vacancySchema.safeParse(publishPayload)
    expect(publishResult.success).toBe(true)
  })

  it('Requirement 6: Navigating from Edit Job to Create Job does not carry over the previous vacancy skills', async () => {
    // 1. First render in edit mode
    mockParams = { id: 'vac-saved-skills' }
    const { rerender } = render(<VacancyEditorPage />)

    await waitFor(() => {
      expect(screen.getByText('Python')).toBeTruthy()
      expect(screen.getByText('Django')).toBeTruthy()
      expect(screen.getByText('Docker')).toBeTruthy()
    })

    // 2. Simulate navigating to Create Job (id becomes undefined)
    mockParams = {}
    rerender(<VacancyEditorPage />)

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Type a skill and press Enter...')).toBeTruthy()
      expect(screen.queryByText('Python')).toBeNull()
      expect(screen.queryByText('Django')).toBeNull()
      expect(screen.queryByText('Docker')).toBeNull()
      expect(screen.queryByText('Ecosystem Thinker')).toBeNull()
      expect(screen.queryByText('Strong communication')).toBeNull()
      expect(screen.queryByText('High on Execution')).toBeNull()
    })
  })

  it('JobDetailsPage: Real vacancy with empty skills displays "No skills specified" without hardcoded fallback', async () => {
    mockParams = { id: EMPTY_SKILLS_UUID }

    render(<JobDetailsPage />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: 'General Manager' })).toBeTruthy()
    })

    // Must show "No skills specified"
    expect(screen.getByText('No skills specified')).toBeTruthy()

    // Must NOT show hardcoded Figma fallback skills
    expect(screen.queryByText('Ecosystem Thinker')).toBeNull()
    expect(screen.queryByText('Strong communication')).toBeNull()
    expect(screen.queryByText('High on Execution')).toBeNull()
  })
})
