# Slide Notes

A local, no-backend note-taking app that lets you open a PDF, flip through it
like a slide deck, and take **per-slide notes**. Notes are saved automatically
in your browser's local storage, so reopening the same PDF restores them.

## Features

- **Open a PDF** from your computer (nothing is uploaded — everything stays in your browser).
- **Slide-deck viewer** — one page at a time, scaled to fit.
- **Navigation** — Prev / Next buttons, a jump-to-page box, a thumbnail strip, and keyboard arrows (← →, PageUp / PageDown).
- **Per-slide notes** — each page has its own notes area, auto-saved to local storage.
- **Note markers** — thumbnails with notes show a dot so you can spot annotated slides.
- **Recent decks** — the landing screen lists decks you've opened; reopen the same PDF to restore its notes, or forget one to delete it and its notes.
- **Export notes** — download all of a deck's notes as a Markdown file (`<deck>-notes.md`).
- **AI assistant** (optional, bring your own key) — summarize the current slide or ask questions about it, and insert the result into your notes.

## AI setup (optional)

The AI features call an OpenAI-compatible Chat Completions endpoint directly
from your browser:

1. Open a PDF, then click **Settings** in the AI panel (bottom-right).
2. Paste your API key. Optionally change the model (default `gpt-4o-mini`) or
   the base URL (default `https://api.openai.com/v1`) to point at another
   OpenAI-compatible provider.
3. Click **Save**.

Your key is stored only in this browser's local storage and is sent only to the
provider you configure — there is no backend in between.

## Running it in VS Code

1. Make sure you have [Node.js](https://nodejs.org/) 18+ installed.
2. Open this folder in VS Code and open a terminal.
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the dev server:
   ```bash
   npm run dev
   ```
5. Open the printed URL (usually http://localhost:5173) in your browser.

To build a production bundle: `npm run build`, then preview it with `npm run preview`.

## How notes are stored

Notes live in your browser's `localStorage`, keyed by the PDF's name, size, and
last-modified date. That means:

- Notes persist across reloads and restarts.
- Reopening the exact same file restores its notes.
- Notes are tied to the browser on your machine — they are not synced anywhere.

## Tech

- React + Vite + TypeScript
- [pdf.js](https://mozilla.github.io/pdf.js/) (`pdfjs-dist`) for rendering PDF pages
