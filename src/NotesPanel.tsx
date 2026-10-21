import { useEffect, useRef, useState } from 'react'

type Props = {
  pageNumber: number
  value: string
  onChange: (next: string) => void
}

/**
 * Per-slide notes editor. Debounces saves via the parent's onChange and
 * shows a brief "Saved" indicator so you know notes persist.
 */
export default function NotesPanel({ pageNumber, value, onChange }: Props) {
  const [text, setText] = useState(value)
  const [saved, setSaved] = useState(false)
  const timer = useRef<number | null>(null)

  // When the slide changes, swap in that slide's saved note.
  useEffect(() => {
    setText(value)
  }, [value, pageNumber])

  function handleChange(next: string) {
    setText(next)
    if (timer.current) window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      onChange(next)
      setSaved(true)
      window.setTimeout(() => setSaved(false), 1200)
    }, 400)
  }

  return (
    <div className="notes-panel">
      <div className="notes-header">
        <span>Notes — slide {pageNumber}</span>
        <span className={`saved-tag ${saved ? 'show' : ''}`}>Saved</span>
      </div>
      <textarea
        className="notes-textarea"
        placeholder={`Write notes for slide ${pageNumber}…`}
        value={text}
        onChange={(e) => handleChange(e.target.value)}
      />
    </div>
  )
}
