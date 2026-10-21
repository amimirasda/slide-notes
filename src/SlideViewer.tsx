import { useEffect, useRef, useState } from 'react'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import { renderPage } from './pdf'

type Props = {
  doc: PDFDocumentProxy
  pageNumber: number
}

/**
 * Renders the current PDF page to a canvas, re-rendering when the page
 * changes or the container is resized.
 */
export default function SlideViewer({ doc, pageNumber }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [rendering, setRendering] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const container = containerRef.current
    const canvas = canvasRef.current
    if (!container || !canvas) return

    async function draw() {
      // Non-null: guarded above, re-read for TS narrowing in async scope.
      const c = containerRef.current!
      const cv = canvasRef.current!
      const width = c.clientWidth
      if (width === 0) return
      setRendering(true)
      setError(null)
      try {
        await renderPage(doc, pageNumber, cv, width)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
      } finally {
        if (!cancelled) setRendering(false)
      }
    }

    void draw()

    // Re-render on container resize so slides always fill the available width.
    const ro = new ResizeObserver(() => void draw())
    ro.observe(container)

    return () => {
      cancelled = true
      ro.disconnect()
    }
  }, [doc, pageNumber])

  return (
    <div className="slide-stage" ref={containerRef}>
      {error ? (
        <div className="slide-error">Failed to render page: {error}</div>
      ) : (
        <canvas
          ref={canvasRef}
          className="slide-canvas"
          style={{ opacity: rendering ? 0.6 : 1 }}
        />
      )}
    </div>
  )
}
