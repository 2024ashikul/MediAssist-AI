# 👩🏻‍⚕️ MediAssist AI — React + FastAPI edition

This is your original Streamlit app split into a **FastAPI backend** (all the RAG/Gemini/Groq
logic) and a **React frontend** (Vite), talking to each other over a JSON API. Every feature
from `app.py` is preserved: bilingual RAG chat, structured symptom triage, visual symptom
checker, prescription/report OCR, voice input, BMI calculator, hospital finder, and the
emergency-helpline directory.

```
mediassist-ai/
├── backend/               # FastAPI app
│   ├── app/
│   │   ├── main.py        # all API routes
│   │   ├── rag_pipeline.py
│   │   ├── vision_ocr.py
│   │   ├── utils.py
│   │   └── models.py
│   ├── create_db.py       # your original DB-builder script (unchanged)
│   ├── check_models.py    # your original Gemini model-list script (unchanged)
│   ├── requirements.txt
│   ├── .env.example
│   └── Dockerfile
├── frontend/               # React (Vite) app
│   ├── src/
│   │   ├── App.jsx
│   │   ├── api.js          # all fetch calls to the backend
│   │   ├── components/
│   │   └── data/staticData.js
│   ├── package.json
│   └── Dockerfile
└── docker-compose.yml
```

---

## 1. Put your `chroma_db` in place

You mentioned you already have a built `chroma_db` locally. Copy that folder into:

```
mediassist-ai/backend/chroma_db/
```

If you don't have it anymore, rebuild it (put your PDFs in `backend/medical_books/` first):

```bash
cd backend
python create_db.py
```

## 2. Run the backend (FastAPI)

```bash
cd backend
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# then edit .env and fill in GROQ_API_KEY and GEMINI_API_KEY

uvicorn app.main:app --reload --port 8000
```

The API is now live at `http://localhost:8000`. Check `http://localhost:8000/api/health` —
it should show `"rag_ready": true`. Interactive API docs are at `http://localhost:8000/docs`.

## 3. Run the frontend (React)

In a second terminal:

```bash
cd frontend
npm install

cp .env.example .env
# defaults to VITE_API_BASE_URL=http://localhost:8000, which is correct for local dev

npm run dev
```

Open `http://localhost:5173` — that's your new UI, fully separated from Streamlit.

## Optional: run both with Docker Compose

```bash
# from the mediassist-ai/ root, with GROQ_API_KEY and GEMINI_API_KEY set in your shell
docker compose up --build
```
Backend → `http://localhost:8000`, frontend → `http://localhost:5173`.

---

## API summary

| Method | Path | Purpose |
|---|---|---|
| GET  | `/api/health` | Backend + RAG readiness check |
| POST | `/api/chat` | Send a chat message; returns either a normal `answer` or a `triage` question set |
| POST | `/api/chat/triage-submit` | Submit (or skip) triage answers; returns the RAG `answer` |
| POST | `/api/vision/analyze` | Upload a symptom photo (multipart) → Gemini Vision description |
| POST | `/api/ocr/extract` | Upload a prescription/report photo (multipart) → Gemini OCR transcript |
| POST | `/api/voice/transcribe` | Upload recorded audio (multipart) → Groq Whisper transcript |

The frontend is stateless-server-friendly: it keeps the running chat history in React state and
sends it with every `/api/chat` call, exactly like the original `st.session_state.chat_history`.
Districts, specialist types, and emergency numbers are static data, kept in
`frontend/src/data/staticData.js` (bilingual, same lists as the original app).

---

## Notes / things worth double-checking

- **Gemini model name**: the original `app.py` calls `genai.GenerativeModel("gemini-3.5-flash")`,
  while your README documented `gemini-2.5-flash`. I kept `gemini-3.5-flash` in
  `backend/app/vision_ocr.py` to match the actual code, but if vision/OCR calls fail with a
  "model not found" error, open that file and swap in a model name from `check_models.py`'s
  output.
- **CORS**: the backend allows `http://localhost:5173` by default. If you deploy the frontend
  elsewhere, set `FRONTEND_ORIGIN` in `backend/.env`.
- **Mic recording**: the browser's voice recorder needs HTTPS or `localhost` to access the
  microphone — fine for local dev, but note this if you deploy over plain HTTP.
- Your original `Dockerfile`/`requirements.txt`/`gitignore` at the project root are still there;
  they're now superseded by `backend/Dockerfile` and `frontend/Dockerfile`.
