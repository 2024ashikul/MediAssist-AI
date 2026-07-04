# MediAssist AI — Frontend

React + Vite single-page app for MediAssist AI. Talks exclusively to the FastAPI backend over
`fetch` — no server-side rendering, no separate state management library. See the
[root README](../README.md) for how this fits into the overall system.

## Layout

```
frontend/
├── src/
│   ├── App.jsx                 Top-level state: active view, chat history, language, backend health
│   ├── api.js                  Every fetch call to the backend, in one place
│   ├── components/
│   │   ├── ChatWindow.jsx / ChatInput.jsx / MessageBubble.jsx    Chat UI
│   │   ├── TriageModal.jsx                                       Structured symptom follow-up questions
│   │   ├── VisionChecker.jsx / OcrChecker.jsx                    Image upload flows (Gemini)
│   │   ├── MedicineFinder.jsx                                    Search + detail view over the medicine DB
│   │   ├── HospitalFinder.jsx                                    District/specialist → Google Maps search
│   │   ├── BmiCalculator.jsx                                     Client-side BMI calculation
│   │   ├── EmergencyHelplines.jsx                                Static emergency numbers
│   │   ├── Sidebar.jsx / QuickToolsBar.jsx                       Navigation
│   │   └── Panel.jsx                                             Collapsible section wrapper
│   ├── data/staticData.js       Bilingual UI strings, districts, specialist types, helpline numbers
│   └── main.jsx
├── index.html
├── tailwind.config.js
├── vite.config.js
└── Dockerfile
```

## Setup

```bash
cd frontend
npm install

cp .env.example .env
# defaults to VITE_API_BASE_URL=http://localhost:8000, correct for local dev against the backend

npm run dev
```

Open `http://localhost:5173`.

### Environment variables

| Variable | Purpose |
|---|---|
| `VITE_API_BASE_URL` | Base URL for every backend call in `api.js`. Falls back to `http://<current-hostname>:8000` if unset, which is convenient when testing from another device on the same network. |

## How state flows

`App.jsx` owns the state that needs to survive across views: `messages` (what's rendered),
`chatHistory` (the human/ai pairs sent back to the backend on every `/api/chat` call, mirroring
what the RAG pipeline expects), `visionContext` / `ocrContext` (set once an image has been
analyzed, then attached to the next chat message), and `language` (drives both UI strings and
which language the backend is asked to respond in). Individual feature components
(`VisionChecker`, `OcrChecker`, `MedicineFinder`, etc.) are otherwise self-contained — they call
`api.js` directly and manage their own local state.

The chat flow specifically:

1. `handleSend` posts to `/api/chat`.
2. If the response type is `triage`, `TriageModal` is shown instead of appending an answer — the
   user answers the questions or skips.
3. Either path ends by posting to `/api/chat/triage-submit` (or, for non-symptom messages, the
   `/api/chat` response already contains the answer), and the exchange is appended to both
   `messages` and `chatHistory`.

## Styling

The app mixes MUI components (`@mui/material`) with Tailwind utility classes rather than
committing to one exclusively — MUI is used for interactive primitives that benefit from built-in
accessibility and state handling (text fields, buttons, alerts), while layout, spacing, and the
custom color system live in Tailwind (`tailwind.config.js` defines the `brand` / `coral` / `warn`
/ `accent` / `success` palettes and the `Fraunces` / `Inter` / `Noto Sans Bengali` font stack used
throughout).

## Build

```bash
npm run build     # outputs to dist/
npm run preview   # serve the production build locally
```

## Docker

```bash
docker build -t mediassist-frontend .
docker run -p 5173:5173 -e VITE_API_BASE_URL=http://localhost:8000 mediassist-frontend
```

Note the Dockerfile runs `npm run dev -- --host 0.0.0.0` rather than serving a production build —
it's set up for containerized development, not a production static deployment. For production,
build the `dist/` output and serve it with a static file server or reverse proxy instead.

## Known rough edges

- Voice recording requires the page to be served over HTTPS or from `localhost` — browsers block
  microphone access otherwise.
- `HospitalFinder` currently opens a Google Maps search rather than calling a backend endpoint —
  there's a `getNearbyHospitals` helper in `api.js` wired up for a future `/api/hospitals/nearby`
  route, but nothing on the backend implements it yet.