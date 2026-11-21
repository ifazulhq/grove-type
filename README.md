# Grove Type

A bold, earthy typing speed game. Timed 15, 30, and 60 second rounds, live WPM and accuracy, personal bests per clock, and a shareable score card — wrapped in warm clay, ochre, and olive tones.

**Live site:** [ifazulhq.github.io/grove-type](https://ifazulhq.github.io/grove-type/)
**Vercel mirror:** [grove-type.vercel.app](https://grove-type.vercel.app)

## Features

- Timed rounds with a live countdown, WPM, and accuracy readout
- Personal bests tracked separately for each clock length
- Round history, total rounds, and words typed, saved locally
- Shareable 1080×1350 result card via Web Share, clipboard, or download
- Light and dark themes with a remembered preference
- Scroll reveals, floating keycaps, and reduced-motion support
- Fully responsive, tuned for phone screens
- All copy lives in one file for easy editing

## Run locally

No build step or dependencies — any static server works:

```bash
python -m http.server 5173
```

Then open <http://127.0.0.1:5173/>.

## Edit the copy

Every visible string — headings, buttons, mode names, results copy, footer, and the word bank — is in [`content.js`](content.js). Change the text there and reload the page.

Scores are stored in the visitor's browser under `localStorage`; no server or database is involved.

## Project structure

| File | Purpose |
| --- | --- |
| `index.html` | Page markup and dialogs |
| `styles.css` | Design system, themes, animations, responsive layout |
| `app.js` | Typing engine, scoring, results, share card, theme switching |
| `content.js` | All user-facing copy and the word list |

## Deployment

The site is static and deploys from the `main` branch:

- **GitHub Pages** — Settings → Pages → Deploy from branch, `main` / root
- **Vercel** — import the repository, no framework preset, no build command, output at the root

## Tech

Vanilla HTML, CSS, and JavaScript. Google Fonts (Fraunces, Outfit, Space Mono), Canvas for score cards, Web Share API with clipboard fallback, and the Web Storage API for records.
