/**
 * Per-slide notes are keyed by a stable id derived from the PDF file
 * (name + size + last-modified) so that reopening the same file restores
 * the notes you wrote. Everything lives in localStorage — no backend.
 */

export type DeckMeta = {
  id: string
  name: string
  numPages: number
  lastOpened: number
}

const NOTES_PREFIX = 'slide-notes:notes:'
const DECKS_KEY = 'slide-notes:decks'

export function deckIdForFile(file: File): string {
  return `${file.name}::${file.size}::${file.lastModified}`
}

function notesKey(deckId: string): string {
  return NOTES_PREFIX + deckId
}

/** All notes for a deck: a map of page number -> note text. */
export type DeckNotes = Record<number, string>

export function loadNotes(deckId: string): DeckNotes {
  try {
    const raw = localStorage.getItem(notesKey(deckId))
    return raw ? (JSON.parse(raw) as DeckNotes) : {}
  } catch {
    return {}
  }
}

export function saveNotes(deckId: string, notes: DeckNotes): void {
  localStorage.setItem(notesKey(deckId), JSON.stringify(notes))
}

export function loadDecks(): DeckMeta[] {
  try {
    const raw = localStorage.getItem(DECKS_KEY)
    return raw ? (JSON.parse(raw) as DeckMeta[]) : []
  } catch {
    return []
  }
}

export function rememberDeck(meta: DeckMeta): void {
  const decks = loadDecks().filter((d) => d.id !== meta.id)
  decks.unshift(meta)
  // Keep the list tidy.
  localStorage.setItem(DECKS_KEY, JSON.stringify(decks.slice(0, 20)))
}

/** Forget a deck and its saved notes. */
export function removeDeck(deckId: string): void {
  const decks = loadDecks().filter((d) => d.id !== deckId)
  localStorage.setItem(DECKS_KEY, JSON.stringify(decks))
  localStorage.removeItem(notesKey(deckId))
}
