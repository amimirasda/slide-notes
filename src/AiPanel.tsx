import { useEffect, useState } from 'react'
import {
  askAboutSlide,
  isAiConfigured,
  loadAiSettings,
  saveAiSettings,
  summarizeSlide,
  type AiSettings,
} from './ai'

type Props = {
  pageNumber: number
  /** Lazily fetch the current slide's extracted text. */
  getSlideText: () => Promise<string>
  /** Append AI output into the current slide's notes. */
  onInsertToNotes: (text: string) => void
}

export default function AiPanel({ pageNumber, getSlideText, onInsertToNotes }: Props) {
  const [configured, setConfigured] = useState(isAiConfigured())
  const [showSettings, setShowSettings] = useState(!isAiConfigured())
  const [settings, setSettings] = useState<AiSettings>(loadAiSettings())

  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [busy, setBusy] = useState<null | 'summary' | 'ask'>(null)
  const [error, setError] = useState<string | null>(null)

  // Clear transient output when switching slides.
  useEffect(() => {
    setAnswer('')
    setError(null)
  }, [pageNumber])

  function handleSaveSettings() {
    saveAiSettings(settings)
    setConfigured(isAiConfigured())
    setShowSettings(false)
  }

  async function runSummarize() {
    setBusy('summary')
    setError(null)
    setAnswer('')
    try {
      const text = await getSlideText()
      const result = await summarizeSlide(text)
      setAnswer(result)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(null)
    }
  }

  async function runAsk() {
    if (!question.trim()) return
    setBusy('ask')
    setError(null)
    setAnswer('')
    try {
      const text = await getSlideText()
      const result = await askAboutSlide(question.trim(), text)
      setAnswer(result)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="ai-panel">
      <div className="ai-header">
        <span>AI</span>
        <button className="link-btn" onClick={() => setShowSettings((s) => !s)}>
          {showSettings ? 'Close settings' : 'Settings'}
        </button>
      </div>

      {showSettings && (
        <div className="ai-settings">
          <label>
            API key
            <input
              type="password"
              placeholder="sk-…"
              value={settings.apiKey}
              onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
            />
          </label>
          <label>
            Model
            <input
              type="text"
              value={settings.model}
              onChange={(e) => setSettings({ ...settings, model: e.target.value })}
            />
          </label>
          <label>
            Base URL (OpenAI-compatible)
            <input
              type="text"
              value={settings.baseUrl}
              onChange={(e) => setSettings({ ...settings, baseUrl: e.target.value })}
            />
          </label>
          <button className="primary-btn small" onClick={handleSaveSettings}>
            Save
          </button>
          <p className="hint">
            Your key is stored only in this browser and sent directly to the
            provider you configure.
          </p>
        </div>
      )}

      {!showSettings && !configured && (
        <p className="hint">Add an API key in settings to enable AI features.</p>
      )}

      {configured && !showSettings && (
        <>
          <div className="ai-actions">
            <button className="ghost-btn" onClick={runSummarize} disabled={busy !== null}>
              {busy === 'summary' ? 'Summarizing…' : 'Summarize slide'}
            </button>
          </div>

          <div className="ai-ask">
            <input
              type="text"
              placeholder="Ask about this slide…"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void runAsk()
              }}
            />
            <button className="ghost-btn" onClick={runAsk} disabled={busy !== null}>
              {busy === 'ask' ? '…' : 'Ask'}
            </button>
          </div>

          {error && <p className="error-text small">{error}</p>}

          {answer && (
            <div className="ai-answer">
              <pre>{answer}</pre>
              <button className="link-btn" onClick={() => onInsertToNotes(answer)}>
                + Add to notes
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
