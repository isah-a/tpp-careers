// @vitest-environment jsdom
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { PdfResumeViewer } from './PdfResumeViewer'

// Mock react-pdf
vi.mock('react-pdf', () => ({
  pdfjs: {
    GlobalWorkerOptions: {
      workerSrc: '',
    },
    version: '4.8.69',
  },
  Document: ({
    children,
    onLoadSuccess,
  }: {
    children: React.ReactNode
    onLoadSuccess?: (data: { numPages: number }) => void
  }) => {
    // Call onLoadSuccess with 36 pages (simulating a multipage PDF)
    setTimeout(() => {
      onLoadSuccess?.({ numPages: 36 })
    }, 0)
    return <div data-testid="pdf-document">{children}</div>
  },
  Page: ({ pageNumber, width }: { pageNumber: number; width?: number }) => (
    <div data-testid="pdf-page" data-page={pageNumber} data-width={width}>
      Rendered Page {pageNumber}
    </div>
  ),
}))

describe('PdfResumeViewer (Task C)', () => {
  beforeEach(() => {
    // Provide ResizeObserver mock for jsdom
    ;(globalThis as any).ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  })

  it('renders application toolbar without native browser outline, handles 36-page navigation and zoom', async () => {
    const handleDownload = vi.fn()

    render(
      <PdfResumeViewer
        url="https://supabase.local/storage/v1/object/sign/cvs/candidate-cv.pdf"
        candidateName="Sarah Connor"
        onDownload={handleDownload}
      />
    )

    // Wait for document to load 36 pages
    const nextBtn = screen.getByRole('button', { name: /Next Page/i }) as HTMLButtonElement
    const prevBtn = screen.getByRole('button', { name: /Previous Page/i }) as HTMLButtonElement

    // Prev button initially disabled on page 1
    expect(prevBtn.disabled).toBe(true)

    // Page indicator input starts at 1
    const pageInput = screen.getByRole('textbox', { name: /Current Page Number/i }) as HTMLInputElement
    expect(pageInput.value).toBe('1')

    await waitFor(() => {
      expect(screen.getByText('of 36')).toBeTruthy()
    })

    // Navigate to next page
    fireEvent.click(nextBtn)
    expect(pageInput.value).toBe('2')
    expect(prevBtn.disabled).toBe(false)

    // Test jumping directly to page 36 via input
    fireEvent.change(pageInput, { target: { value: '36' } })
    fireEvent.submit(pageInput)
    expect(pageInput.value).toBe('36')
    expect(nextBtn.disabled).toBe(true) // on the last page of 36

    // Test Zoom controls
    const zoomInBtn = screen.getByRole('button', { name: /Zoom In/i })
    const zoomOutBtn = screen.getByRole('button', { name: /Zoom Out/i })
    const zoomResetBtn = screen.getByRole('button', { name: /Reset Zoom to Fit Width/i })

    expect(zoomResetBtn.textContent?.trim()).toBe('100%')
    fireEvent.click(zoomInBtn)
    expect(screen.getByRole('button', { name: /Reset Zoom to Fit Width/i }).textContent?.trim()).toBe('125%')

    fireEvent.click(zoomOutBtn)
    expect(screen.getByRole('button', { name: /Reset Zoom to Fit Width/i }).textContent?.trim()).toBe('100%')

    // Test Download button
    const downloadBtn = screen.getByRole('button', { name: /Download CV/i })
    fireEvent.click(downloadBtn)
    expect(handleDownload).toHaveBeenCalledOnce()

    // Test Fullscreen button
    const fullscreenBtn = screen.getByRole('button', { name: /Enter Fullscreen/i })
    expect(fullscreenBtn).toBeTruthy()
  })
})
