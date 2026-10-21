import type { DeckNotes } from './storage'

/** Build a Markdown document from a deck's per-slide notes. */
export function notesToMarkdown(
  fileName: string,
  numPages: number,
  notes: DeckNotes,
): string {
  const title = fileName.replace(/\.pdf$/i, '')
  const lines: string[] = [`# Notes — ${title}`, '']

  const pagesWithNotes = Array.from({ length: numPages }, (_, i) => i + 1).filter(
    (n) => (notes[n] ?? '').trim().length > 0,
  )

  if (pagesWithNotes.length === 0) {
    lines.push('_No notes yet._')
    return lines.join('\n')
  }

  for (const n of pagesWithNotes) {
    lines.push(`## Slide ${n}`, '', notes[n].trim(), '')
  }

  return lines.join('\n').trimEnd() + '\n'
}

/** Trigger a browser download of the given text as a file. */
export function downloadText(filename: string, text: string): void {
  const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/** Convenience: export a deck's notes as a downloaded .md file. */
export function exportNotes(
  fileName: string,
  numPages: number,
  notes: DeckNotes,
): void {
  const md = notesToMarkdown(fileName, numPages, notes)
  const base = fileName.replace(/\.pdf$/i, '') || 'notes'
  downloadText(`${base}-notes.md`, md)
}
