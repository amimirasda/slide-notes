/**
 * Lightweight, bring-your-own-key AI client for summarizing slides and
 * answering questions about them. Calls an OpenAI-compatible Chat Completions
 * endpoint directly from the browser. The key and settings live in
 * localStorage — nothing is sent anywhere except the provider you configure.
 */

const SETTINGS_KEY = 'slide-notes:ai-settings'

export type AiSettings = {
  apiKey: string
  baseUrl: string
  model: string
}

const DEFAULTS: Omit<AiSettings, 'apiKey'> = {
  baseUrl: 'https://api.openai.com/v1',
  model: 'gpt-4o-mini',
}

export function loadAiSettings(): AiSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    const parsed = raw ? (JSON.parse(raw) as Partial<AiSettings>) : {}
    return {
      apiKey: parsed.apiKey ?? '',
      baseUrl: parsed.baseUrl?.trim() || DEFAULTS.baseUrl,
      model: parsed.model?.trim() || DEFAULTS.model,
    }
  } catch {
    return { apiKey: '', ...DEFAULTS }
  }
}

export function saveAiSettings(settings: AiSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}

export function isAiConfigured(): boolean {
  return loadAiSettings().apiKey.trim().length > 0
}

type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string }

/** Core call to the chat completions endpoint. */
async function chat(messages: ChatMessage[]): Promise<string> {
  const { apiKey, baseUrl, model } = loadAiSettings()
  if (!apiKey.trim()) {
    throw new Error('No API key set. Open AI settings and add your key.')
  }

  const url = `${baseUrl.replace(/\/+$/, '')}/chat/completions`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, messages, temperature: 0.3 }),
  })

  if (!res.ok) {
    let detail = ''
    try {
      const err = await res.json()
      detail = err?.error?.message ?? JSON.stringify(err)
    } catch {
      detail = await res.text().catch(() => '')
    }
    throw new Error(`AI request failed (${res.status}): ${detail || res.statusText}`)
  }

  const data = await res.json()
  const content: unknown = data?.choices?.[0]?.message?.content
  if (typeof content !== 'string') {
    throw new Error('AI response had no text content.')
  }
  return content.trim()
}

// Keep prompts from blowing past context limits on very dense pages.
function clip(text: string, max = 8000): string {
  return text.length > max ? text.slice(0, max) + '…' : text
}

/** Summarize the text of a single slide into concise bullet points. */
export async function summarizeSlide(slideText: string): Promise<string> {
  if (!slideText.trim()) {
    throw new Error('This slide has no extractable text to summarize.')
  }
  return chat([
    {
      role: 'system',
      content:
        'You summarize a single presentation slide. Reply with 2-5 concise ' +
        'bullet points capturing the key ideas. No preamble.',
    },
    { role: 'user', content: clip(slideText) },
  ])
}

/** Answer a question using the current slide's text as context. */
export async function askAboutSlide(
  question: string,
  slideText: string,
): Promise<string> {
  return chat([
    {
      role: 'system',
      content:
        'You answer questions about the given presentation slide. Use the ' +
        'slide text as your primary source. If the answer is not in the ' +
        'slide, say so briefly and then answer from general knowledge if you can.',
    },
    {
      role: 'user',
      content: `Slide text:\n"""\n${clip(slideText)}\n"""\n\nQuestion: ${question}`,
    },
  ])
}
