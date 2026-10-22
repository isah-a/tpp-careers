import { useState, useRef, useEffect, useCallback } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Download,
  RotateCcw,
  Loader2,
  AlertCircle,
  FileText
} from 'lucide-react'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'

// Configure PDF.js worker
if (typeof window !== 'undefined') {
  pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'
}

export interface PdfResumeViewerProps {
  url: string
  candidateName?: string
  onDownload?: () => void
  className?: string
}

export function PdfResumeViewer({
  url,
  candidateName = 'Candidate',
  onDownload,
  className = ''
}: PdfResumeViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewerWrapperRef = useRef<HTMLDivElement>(null)

  const [numPages, setNumPages] = useState<number | null>(null)
  const [pageNumber, setPageNumber] = useState<number>(1)
  const [scale, setScale] = useState<number>(1.0)
  const [containerWidth, setContainerWidth] = useState<number>(700)
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false)
  const [pageInput, setPageInput] = useState<string>('1')
  const [loading, setLoading] = useState<boolean>(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Measure container width for fit-to-width calculation
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const updateWidth = () => {
      const rect = el.getBoundingClientRect()
      if (rect.width > 0) {
        // Leave 32px breathing room for padding/borders
        setContainerWidth(Math.floor(rect.width - 32))
      }
    }

    updateWidth()

    if (typeof ResizeObserver === 'undefined') return

    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          setContainerWidth(Math.floor(entry.contentRect.width - 32))
        }
      }
    })

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Listen for fullscreen change
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement))
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  // Update input text when page changes
  useEffect(() => {
    setPageInput(String(pageNumber))
  }, [pageNumber])

  const handleDocumentLoadSuccess = useCallback(({ numPages: nextNumPages }: { numPages: number }) => {
    setNumPages(nextNumPages)
    setPageNumber(1)
    setLoading(false)
    setLoadError(null)
  }, [])

  const handleDocumentLoadError = useCallback((err: Error) => {
    console.error('[PdfResumeViewer] Failed to load PDF:', err)
    setLoadError(err.message || 'Failed to load PDF document')
    setLoading(false)
  }, [])

  const goToPrevPage = () => {
    setPageNumber(prev => Math.max(1, prev - 1))
  }

  const goToNextPage = () => {
    setPageNumber(prev => (numPages ? Math.min(numPages, prev + 1) : prev + 1))
  }

  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPageInput(e.target.value)
  }

  const handlePageInputSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const target = parseInt(pageInput, 10)
    if (!isNaN(target) && numPages && target >= 1 && target <= numPages) {
      setPageNumber(target)
    } else {
      setPageInput(String(pageNumber))
    }
  }

  const zoomIn = () => {
    setScale(s => Math.min(2.5, +(s + 0.25).toFixed(2)))
  }

  const zoomOut = () => {
    setScale(s => Math.max(0.6, +(s - 0.25).toFixed(2)))
  }

  const resetZoom = () => {
    setScale(1.0)
  }

  const toggleFullscreen = async () => {
    const target = viewerWrapperRef.current
    if (!target) return

    try {
      if (!document.fullscreenElement) {
        await target.requestFullscreen()
      } else {
        await document.exitFullscreen()
      }
    } catch (err) {
      console.warn('[PdfResumeViewer] Fullscreen toggle error:', err)
      // Fallback: toggle internal state
      setIsFullscreen(prev => !prev)
    }
  }

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
      e.preventDefault()
      goToPrevPage()
    } else if (e.key === 'ArrowRight' || e.key === 'PageDown') {
      e.preventDefault()
      goToNextPage()
    }
  }

  const calculatedWidth = Math.max(300, Math.floor(containerWidth * scale))

  return (
    <div
      ref={viewerWrapperRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className={`flex flex-col rounded-xl overflow-hidden border border-gray-200 bg-[#323639] outline-none ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none border-0' : 'flex-1 min-h-[620px]'
      } ${className}`}
      aria-label={`${candidateName} Resume Document Viewer`}
    >
      {/* Top Application-Controlled Toolbar (NO native browser toolbar/sidebar) */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-[#202124] text-gray-200 border-b border-[#3c4043] select-none text-xs">
        {/* Left: Page Navigation Controls */}
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            type="button"
            onClick={goToPrevPage}
            disabled={pageNumber <= 1 || loading}
            aria-label="Previous Page"
            className="p-1 rounded-md hover:bg-[#3c4043] disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer text-gray-300 hover:text-white"
          >
            <ChevronLeft size={16} />
          </button>

          <form onSubmit={handlePageInputSubmit} className="flex items-center gap-1.5">
            <span className="text-[11px] text-gray-400">Page</span>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={pageInput}
              onChange={handlePageInputChange}
              onBlur={handlePageInputSubmit}
              aria-label="Current Page Number"
              className="w-9 h-6 px-1 text-center bg-[#2c2f33] border border-[#3c4043] rounded text-white font-mono text-xs focus:outline-none focus:border-[#5C00DD]"
            />
            <span className="text-[11px] text-gray-400">of {numPages ?? '—'}</span>
          </form>

          <button
            type="button"
            onClick={goToNextPage}
            disabled={!numPages || pageNumber >= numPages || loading}
            aria-label="Next Page"
            className="p-1 rounded-md hover:bg-[#3c4043] disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer text-gray-300 hover:text-white"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Middle: Zoom Controls */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={zoomOut}
            disabled={scale <= 0.6 || loading}
            aria-label="Zoom Out"
            title="Zoom Out"
            className="p-1 rounded-md hover:bg-[#3c4043] disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer text-gray-300 hover:text-white"
          >
            <ZoomOut size={15} />
          </button>

          <button
            type="button"
            onClick={resetZoom}
            aria-label="Reset Zoom to Fit Width"
            title="Fit to Width"
            className="px-2 py-0.5 rounded-md hover:bg-[#3c4043] font-mono text-[11px] text-gray-300 hover:text-white transition-colors cursor-pointer"
          >
            {Math.round(scale * 100)}%
          </button>

          <button
            type="button"
            onClick={zoomIn}
            disabled={scale >= 2.5 || loading}
            aria-label="Zoom In"
            title="Zoom In"
            className="p-1 rounded-md hover:bg-[#3c4043] disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer text-gray-300 hover:text-white"
          >
            <ZoomIn size={15} />
          </button>

          {scale !== 1.0 && (
            <button
              type="button"
              onClick={resetZoom}
              title="Reset Zoom"
              aria-label="Reset Zoom"
              className="p-1 rounded-md hover:bg-[#3c4043] text-gray-400 hover:text-white transition-colors cursor-pointer"
            >
              <RotateCcw size={13} />
            </button>
          )}
        </div>

        {/* Right: Fullscreen & Download Controls */}
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            type="button"
            onClick={toggleFullscreen}
            aria-label={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            className="p-1 rounded-md hover:bg-[#3c4043] transition-colors cursor-pointer text-gray-300 hover:text-white"
          >
            {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>

          {onDownload && (
            <button
              type="button"
              onClick={onDownload}
              aria-label="Download CV"
              title="Download CV"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#5C00DD] hover:bg-[#4900B0] text-white font-medium text-[11px] transition-colors cursor-pointer shadow-xs"
            >
              <Download size={13} />
              <span className="hidden sm:inline">Download</span>
            </button>
          )}
        </div>
      </div>

      {/* PDF Canvas Viewport */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto p-4 flex justify-center items-start bg-[#525659] min-h-[560px]"
      >
        {loadError ? (
          <div className="flex flex-col items-center justify-center p-8 text-center bg-white rounded-xl shadow-md my-auto max-w-md">
            <AlertCircle size={36} className="text-amber-500 mb-2" />
            <p className="text-sm font-semibold text-gray-900">Document Preview Unavailable</p>
            <p className="text-xs text-gray-500 mt-1">
              Could not display this resume in the browser viewer. You can download the file directly.
            </p>
            {onDownload && (
              <button
                type="button"
                onClick={onDownload}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-[#5C00DD] hover:bg-[#4900B0] text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                <Download size={14} />
                <span>Download Resume</span>
              </button>
            )}
          </div>
        ) : (
          <Document
            file={url}
            onLoadSuccess={handleDocumentLoadSuccess}
            onLoadError={handleDocumentLoadError}
            loading={
              <div className="flex flex-col items-center justify-center py-20 text-gray-300">
                <Loader2 size={28} className="animate-spin text-[#5C00DD] mb-2" />
                <span className="text-xs font-medium">Loading document...</span>
              </div>
            }
            error={
              <div className="flex flex-col items-center justify-center p-8 text-center bg-white rounded-xl shadow-md my-auto max-w-md">
                <FileText size={36} className="text-amber-500 mb-2" />
                <p className="text-sm font-semibold text-gray-900">Failed to render resume</p>
                <p className="text-xs text-gray-500 mt-1">
                  The document could not be loaded or parsed.
                </p>
                {onDownload && (
                  <button
                    type="button"
                    onClick={onDownload}
                    className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-[#5C00DD] hover:bg-[#4900B0] text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                  >
                    <Download size={14} />
                    <span>Download File</span>
                  </button>
                )}
              </div>
            }
            className="flex flex-col items-center shadow-2xl"
          >
            <div className="bg-white rounded-sm overflow-hidden shadow-lg border border-gray-300/40">
              <Page
                pageNumber={pageNumber}
                width={calculatedWidth}
                renderTextLayer={true}
                renderAnnotationLayer={true}
                loading={
                  <div className="flex items-center justify-center p-16 text-gray-400">
                    <Loader2 size={20} className="animate-spin text-[#5C00DD] mr-2" />
                    <span className="text-xs">Rendering page {pageNumber}...</span>
                  </div>
                }
              />
            </div>
          </Document>
        )}
      </div>
    </div>
  )
}
