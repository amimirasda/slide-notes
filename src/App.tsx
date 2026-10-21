import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import { loadPdf, extractPageText } from './pdf'
import {
  deckIdForFile,
  loadNotes,
  saveNotes,
  rememberDeck,
  loadDecks,
  removeDeck,
  type DeckMeta,
  type DeckNotes,
} from './storage'
import { exportNotes } from './exporter'
import SlideViewer from './SlideViewer'
import NotesPanel from './NotesPanel'
import AiPanel from './AiPanel'

export default function App() {
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null)
  const [deckId, setDeckId] = useState<string | null>(null)
  const [fileName, setFileName] = useState('')
  const [numPages, setNumPages] = useState(0)
  const [page, setPage] = useState(1)
  const [notes, setNotes] = useState<DeckNotes>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [recent, setRecent] = useState<DeckMeta[]>(() => loadDecks())
  const fileInputRef = useRef<HTMLInputElement>(null)

  const openFile = useCallback(async (file: File) => {
    if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
      setError('Please choose a PDF file.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const { doc: loaded, numPages: n } = await loadPdf(file)
      const id = deckIdForFile(file)
      setDoc(loaded)
      setDeckId(id)
      setFileName(file.name)
      setNumPages(n)
      setPage(1)
      setNotes(loadNotes(id))
      rememberDeck({ id, name: file.name, numPages: n, lastOpened: Date.now() })
      setRecent(loadDecks())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not open PDF.')
    } finally {
      setLoading(false)
    }
  }, [])

  function handleFilePicked(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) void openFile(file)
    e.target.value = '' // allow re-picking the same file
  }

  function handleForgetDeck(id: string) {
    removeDeck(id)
    setRecent(loadDecks())
  }

  const goTo = useCallback(
    (next: number) => {
      setPage((p) => {
        const target = Math.min(Math.max(next, 1), numPages || 1)
        return target || p
      })
    },
    [numPages],
  )

  // Keyboard navigation: arrows / page keys move between slides.
  useEffect(() => {
    if (!doc) return
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'TEXTAREA' || tag === 'INPUT') return // don't steal typing
      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault()
        goTo(page + 1)
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault()
        goTo(page - 1)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [doc, page, goTo])

  const handleNoteChange = useCallback(
    (text: string) => {
      if (!deckId) return
      setNotes((prev) => {
        const next = { ...prev, [page]: text }
        saveNotes(deckId, next)
        return next
      })
    },
    [deckId, page],
  )

  // Append AI output to the current slide's notes.
  const appendToNotes = useCallback(
    (text: string) => {
      if (!deckId) return
      setNotes((prev) => {
        const existing = prev[page] ?? ''
        const combined = existing.trim() ? `${existing.trim()}\n\n${text}` : text
        const next = { ...prev, [page]: combined }
        saveNotes(deckId, next)
        return next
      })
    },
    [deckId, page],
  )

  // Provide the current slide's text to the AI panel on demand.
  const getSlideText = useCallback(async () => {
    if (!doc) return ''
    return extractPageText(doc, page)
  }, [doc, page])

  const notedPages = useMemo(
    () =>
      new Set(
        Object.entries(notes)
          .filter(([, v]) => (v ?? '').trim().length > 0)
          .map(([k]) => Number(k)),
      ),
    [notes],
  )

  if (!doc) {
    return (
      <div className="landing">
        <div className="landing-card">
          <h1>Slide Notes</h1>
          <p>Open a PDF and flip through it like a slide deck, taking notes on each slide.</p>
          <button className="primary-btn" onClick={() => fileInputRef.current?.click()}>
            {loading ? 'Opening…' : 'Open PDF'}
          </button>
          {error && <p className="error-text">{error}</p>}
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,.pdf"
            onChange={handleFilePicked}
            hidden
          />

          {recent.length > 0 && (
            <div className="recent">
              <h2>Recent decks</h2>
              <p className="recent-hint">
                Reopen the same PDF file to restore its notes.
              </p>
              <ul>
                {recent.map((d) => (
                  <li key={d.id}>
                    <span className="recent-name" title={d.name}>
                      {d.name}
                    </span>
                    <span className="recent-meta">{d.numPages} slides</span>
                    <button
                      className="link-btn danger"
                      onClick={() => handleForgetDeck(d.id)}
                      title="Forget this deck and its notes"
                    >
                      Forget
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      <header className="toolbar">
        <div className="file-name" title={fileName}>
          {fileName}
        </div>
        <div className="nav">
          <button onClick={() => goTo(page - 1)} disabled={page <= 1}>
            ‹ Prev
          </button>
          <span className="page-count">
            <input
              type="number"
              min={1}
              max={numPages}
              value={page}
              onChange={(e) => goTo(Number(e.target.value))}
            />
            / {numPages}
          </span>
          <button onClick={() => goTo(page + 1)} disabled={page >= numPages}>
            Next ›
          </button>
        </div>
        <button
          className="ghost-btn"
          onClick={() => exportNotes(fileName, numPages, notes)}
          title="Download all notes as Markdown"
        >
          Export notes
        </button>
        <button className="ghost-btn" onClick={() => fileInputRef.current?.click()}>
          Open another
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,.pdf"
          onChange={handleFilePicked}
          hidden
        />
      </header>

      <main className="workspace">
        <section className="viewer-pane">
          <SlideViewer doc={doc} pageNumber={page} />
          <div className="thumb-strip">
            {Array.from({ length: numPages }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                className={`thumb ${n === page ? 'active' : ''} ${
                  notedPages.has(n) ? 'has-note' : ''
                }`}
                onClick={() => goTo(n)}
                title={notedPages.has(n) ? `Slide ${n} (has notes)` : `Slide ${n}`}
              >
                {n}
              </button>
            ))}
          </div>
        </section>

        <aside className="notes-pane">
          <NotesPanel pageNumber={page} value={notes[page] ?? ''} onChange={handleNoteChange} />
          <AiPanel
            pageNumber={page}
            getSlideText={getSlideText}
            onInsertToNotes={appendToNotes}
          />
        </aside>
      </main>
    </div>
  )
}
