import * as pdfjsLib from 'pdfjs-dist'
// Vite resolves this to a bundled URL for the worker.
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl

export type LoadedPdf = {
  doc: pdfjsLib.PDFDocumentProxy
  numPages: number
}

/** Read a File into a PDF document proxy. */
export async function loadPdf(file: File): Promise<LoadedPdf> {
  const data = await file.arrayBuffer()
  const doc = await pdfjsLib.getDocument({ data }).promise
  return { doc, numPages: doc.numPages }
}

/**
 * Render a single 1-indexed page into the given canvas, scaled to fit the
 * provided container width. Returns the rendered dimensions.
 */
export async function renderPage(
  doc: pdfjsLib.PDFDocumentProxy,
  pageNumber: number,
  canvas: HTMLCanvasElement,
  containerWidth: number,
): Promise<void> {
  const page = await doc.getPage(pageNumber)

  // Base viewport at scale 1, then scale to fill the available width.
  const baseViewport = page.getViewport({ scale: 1 })
  const scale = containerWidth / baseViewport.width
  const viewport = page.getViewport({ scale })

  // Account for high-DPI displays so slides look crisp.
  const dpr = window.devicePixelRatio || 1
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not get 2D canvas context')

  canvas.width = Math.floor(viewport.width * dpr)
  canvas.height = Math.floor(viewport.height * dpr)
  canvas.style.width = `${Math.floor(viewport.width)}px`
  canvas.style.height = `${Math.floor(viewport.height)}px`

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

  // pdf.js v5+ accepts a `canvas` field in addition to `canvasContext`.
  // Depending on the exact patch release, the published types may not declare
  // `canvas`, so we pass it through without tripping strict type checking.
  const renderParams = {
    canvas,
    canvasContext: ctx,
    viewport,
  } as Parameters<typeof page.render>[0]

  await page.render(renderParams).promise
}

/** Extract the plain text content of a single 1-indexed page. */
export async function extractPageText(
  doc: pdfjsLib.PDFDocumentProxy,
  pageNumber: number,
): Promise<string> {
  const page = await doc.getPage(pageNumber)
  const content = await page.getTextContent()
  // Each item is a text fragment; join with spaces and collapse whitespace.
  const text = content.items
    .map((item) => ('str' in item ? item.str : ''))
    .join(' ')
  return text.replace(/\s+/g, ' ').trim()
}
