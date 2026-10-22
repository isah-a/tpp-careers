// @vitest-environment jsdom
import React from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { PipelinePage } from './PipelinePage'

// Mock react-router-dom
let mockSearchParams = new URLSearchParams()
vi.mock('react-router-dom', () => ({
  useSearchParams: () => [mockSearchParams, vi.fn()],
  Link: ({ children, to, ...props }: any) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}))

// Mock AuthContext
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    session: { user: { id: 'rec-1', email: 'hr@tpp.com' } },
    authorized: true,
    loading: false,
    signOut: vi.fn(),
  }),
}))

// Captured DnD Context props to simulate real drag-and-drop events in tests
let capturedDndProps: any = {}

vi.mock('@dnd-kit/core', () => {
  return {
    DndContext: (props: any) => {
      capturedDndProps = props
      return (
        <div data-testid="dnd-context">
          {props.children}
        </div>
      )
    },
    DragOverlay: ({ children }: any) => <div data-testid="drag-overlay">{children}</div>,
    useSensor: vi.fn(),
    useSensors: vi.fn(() => []),
    PointerSensor: {},
    KeyboardSensor: {},
    closestCorners: vi.fn(),
    pointerWithin: vi.fn(),
    rectIntersection: vi.fn(),
    useDraggable: ({ id, data, disabled }: any) => ({
      attributes: { role: 'button', 'data-draggable-id': id, 'aria-disabled': disabled },
      listeners: {},
      setNodeRef: vi.fn(),
      isDragging: false,
    }),
    useDroppable: ({ id, data }: any) => ({
      setNodeRef: vi.fn(),
      isOver: false,
    }),
  }
})

// Test candidate records
const initialTestCandidates = [
  {
    id: 'app-1',
    vacancy_id: 'vac-1',
    full_name: 'Pristia Candra',
    email: 'pristia@test.com',
    phone: '+234 801 111 2222',
    stage: 'screening',
    created_at: '2024-02-09T10:00:00Z',
    stage_updated_at: '2024-02-09T10:00:00Z',
    vacancies: { id: 'vac-1', title: 'Senior Project Manager', slug: 'senior-project-manager', department: 'Operations', location: 'Lagos, Nigeria' },
    application_reviews: [{ reviewer_id: 'rec-1', rating: 4 }],
  },
  {
    id: 'app-2',
    vacancy_id: 'vac-1',
    full_name: 'Amara Okafor',
    email: 'amara@test.com',
    phone: '+234 802 222 3333',
    stage: 'review',
    created_at: '2024-02-09T11:00:00Z',
    stage_updated_at: '2024-02-09T11:00:00Z',
    vacancies: { id: 'vac-1', title: 'Senior Project Manager', slug: 'senior-project-manager', department: 'Operations', location: 'Lagos, Nigeria' },
    application_reviews: [],
  },
]

let rpcHandler = vi.fn().mockResolvedValue({ data: null, error: null })

// Mock supabase
vi.mock('../../lib/supabase', () => ({
  isConfigured: true,
  supabase: {
    from: vi.fn((table: string) => {
      if (table === 'applications') {
        return {
          select: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({
            data: initialTestCandidates,
            error: null,
          }),
        }
      }
      return {
        select: vi.fn().mockReturnThis(),
      }
    }),
    rpc: (...args: any[]) => rpcHandler(...args),
  },
}))

describe('Recruitment Pipeline Drag-and-Drop and Stage Transitions', () => {
  beforeEach(() => {
    mockSearchParams = new URLSearchParams()
    capturedDndProps = {}
    rpcHandler = vi.fn().mockResolvedValue({ data: null, error: null })
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('Requirement 3 & 4: Renders 6 stage columns, counters, grip handles, and fallback dropdowns', async () => {
    render(<PipelinePage />)

    await waitFor(() => {
      expect(screen.getByText('Pristia Candra')).toBeTruthy()
      expect(screen.getByText('Amara Okafor')).toBeTruthy()
    })

    // 6 stage column headers
    expect(screen.getByRole('region', { name: /Screening stage/i })).toBeTruthy()
    expect(screen.getByRole('region', { name: /Review stage/i })).toBeTruthy()
    expect(screen.getByRole('region', { name: /Interview stage/i })).toBeTruthy()
    expect(screen.getByRole('region', { name: /Offer stage/i })).toBeTruthy()
    expect(screen.getByRole('region', { name: /Hired stage/i })).toBeTruthy()
    expect(screen.getByRole('region', { name: /Rejected stage/i })).toBeTruthy()

    // Drag handle title exists on candidate cards
    const dragHandles = screen.getAllByTitle('Drag candidate to move stage')
    expect(dragHandles.length).toBeGreaterThanOrEqual(2)

    // Keyboard-accessible dropdown fallback is present on each card
    const selectDropdowns = screen.getAllByLabelText(/Move .* to another stage/i)
    expect(selectDropdowns.length).toBeGreaterThanOrEqual(2)
  })

  it('Requirement 1 & 5: Dragging and dropping into an empty column moves the candidate and updates counts', async () => {
    render(<PipelinePage />)

    await waitFor(() => {
      expect(screen.getByText('Pristia Candra')).toBeTruthy()
    })

    // Interview stage starts with 0 candidates
    expect(screen.getByRole('region', { name: /Interview stage, 0 candidates/i })).toBeTruthy()

    // Simulate drag and drop end event: Pristia (app-1) dropped into 'interview' column
    capturedDndProps.onDragEnd({
      active: { id: 'app-1' },
      over: { id: 'interview' },
    })

    await waitFor(() => {
      expect(rpcHandler).toHaveBeenCalledWith('transition_application_stage', {
        p_application_id: 'app-1',
        p_to_stage: 'interview',
        p_note: null,
      })
    })

    // Column counts update immediately
    await waitFor(() => {
      expect(screen.getByRole('region', { name: /Interview stage, 1 candidates/i })).toBeTruthy()
      expect(screen.getByRole('region', { name: /Screening stage, 0 candidates/i })).toBeTruthy()
    })
  })

  it('Requirement 6: Dragging to Rejected prompts confirmation modal; canceling leaves candidate in original stage', async () => {
    render(<PipelinePage />)

    await waitFor(() => {
      expect(screen.getByText('Pristia Candra')).toBeTruthy()
    })

    // Simulate dropping Pristia (app-1) into 'rejected' column
    capturedDndProps.onDragEnd({
      active: { id: 'app-1' },
      over: { id: 'rejected' },
    })

    // Confirmation modal appears
    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: /Confirm Candidate Rejection/i })).toBeTruthy()
      expect(screen.getByText(/Rejection is a terminal outcome/i)).toBeTruthy()
    })

    // Click Cancel
    const cancelBtn = screen.getByRole('button', { name: /Cancel/i })
    fireEvent.click(cancelBtn)

    // Modal dismissed, RPC was NOT called, candidate stays in screening
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(rpcHandler).not.toHaveBeenCalled()
    expect(screen.getByRole('region', { name: /Screening stage, 1 candidates/i })).toBeTruthy()
  })

  it('Requirement 6: Confirming rejection executes transition to Rejected', async () => {
    render(<PipelinePage />)

    await waitFor(() => {
      expect(screen.getByText('Pristia Candra')).toBeTruthy()
    })

    // Simulate dropping Pristia (app-1) into 'rejected' column
    capturedDndProps.onDragEnd({
      active: { id: 'app-1' },
      over: { id: 'rejected' },
    })

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: /Confirm Candidate Rejection/i })).toBeTruthy()
    })

    // Click Confirm Reject Candidate
    const confirmBtn = screen.getByRole('button', { name: /Reject Candidate/i })
    fireEvent.click(confirmBtn)

    await waitFor(() => {
      expect(rpcHandler).toHaveBeenCalledWith('transition_application_stage', {
        p_application_id: 'app-1',
        p_to_stage: 'rejected',
        p_note: null,
      })
    })

    // Candidate moved to Rejected and rejected counter incremented
    await waitFor(() => {
      expect(screen.getByRole('region', { name: /Rejected stage, 1 candidates/i })).toBeTruthy()
      expect(screen.getByRole('region', { name: /Screening stage, 0 candidates/i })).toBeTruthy()
    })
  })

  it('Requirement 10 & 11: Server rejection rolls back stage and displays error banner', async () => {
    // Mock unauthorized error from Supabase RPC
    rpcHandler = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'unauthorized: candidate stage transitions restricted to assigned recruiters' },
    })

    render(<PipelinePage />)

    await waitFor(() => {
      expect(screen.getByText('Pristia Candra')).toBeTruthy()
    })

    // Attempt to move to Offer via drag-drop
    capturedDndProps.onDragEnd({
      active: { id: 'app-1' },
      over: { id: 'offer' },
    })

    // Displays error banner
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeTruthy()
      expect(screen.getByText(/unauthorized: candidate stage transitions restricted to assigned recruiters/i)).toBeTruthy()
    })

    // Pristia remains in screening; Offer column is still 0
    expect(screen.getByRole('region', { name: /Screening stage, 1 candidates/i })).toBeTruthy()
    expect(screen.getByRole('region', { name: /Offer stage, 0 candidates/i })).toBeTruthy()
  })

  it('Requirement 11 & 12: In-flight move prevents duplicate submissions and dropdown remains functional', async () => {
    // Create a slow RPC that doesn't immediately resolve
    let resolveRpc: any
    rpcHandler = vi.fn().mockImplementation(() => new Promise((resolve) => {
      resolveRpc = resolve
    }))

    render(<PipelinePage />)

    await waitFor(() => {
      expect(screen.getByText('Pristia Candra')).toBeTruthy()
    })

    const pristiaSelect = screen.getByLabelText('Move Pristia Candra to another stage') as HTMLSelectElement
    fireEvent.change(pristiaSelect, { target: { value: 'review' } })

    // While move is in flight, the select dropdown is disabled
    await waitFor(() => {
      expect(pristiaSelect.disabled).toBe(true)
    })

    // Second move attempt is blocked while in flight
    capturedDndProps.onDragEnd({
      active: { id: 'app-1' },
      over: { id: 'hired' },
    })
    expect(rpcHandler).toHaveBeenCalledTimes(1)

    // Complete first RPC
    resolveRpc({ data: null, error: null })

    await waitFor(() => {
      const updatedSelect = screen.getByLabelText('Move Pristia Candra to another stage') as HTMLSelectElement
      expect(updatedSelect.disabled).toBe(false)
    })
  })
})
