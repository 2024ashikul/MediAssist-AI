# DocMind AI AI

DocMind AI AI is a bilingual (Bengali / English) medical information assistant. It combines a
retrieval-augmented chat pipeline with a symptom-image checker, prescription OCR, a local medicine
database, and a set of small clinical utilities (BMI, triage, hospital lookup, emergency numbers)
behind a single React front end.

The project is split into two independently deployable services:

```
mediassist-ai/
├── backend/              FastAPI service — RAG pipeline, vision/OCR, medicine DB, voice
├── frontend/             React (Vite) single-page app
├── build-rag-pipeline/   Standalone script used to (re)build the vector index from source PDFs
└── docker-compose.yml    Runs both services together
```

Each service has its own README with setup details:

- [`backend/README.md`](./backend/README.md)
- [`frontend/README.md`](./frontend/README.md)

---

## Why RAG

A general-purpose LLM answers from what it memorized during training. That's a liability for a
medical assistant — it has no way to ground an answer in a specific, vetted source, and it will
happily produce a fluent but wrong answer. Retrieval-Augmented Generation (RAG) fixes this by
inserting a retrieval step before generation: relevant passages are pulled from a curated
knowledge base first, and the model is instructed to answer from that retrieved text rather than
from memory.

For DocMind AI this means every chat answer is traceable back to source material in the vector
store, the knowledge base can be extended by dropping in new PDFs and re-indexing (no fine-tuning
or retraining involved), and the model has a much narrower space to hallucinate in.

## Architecture

```mermaid
flowchart TD
    subgraph Offline["Indexing (offline — build-rag-pipeline/ingest.py)"]
        A[Source PDFs] --> B[PyPDFDirectoryLoader]
        B --> C[RecursiveCharacterTextSplitter<br/>chunk_size=1000, overlap=150]
        C --> D[HuggingFace embeddings<br/>paraphrase-multilingual-MiniLM-L12-v2]
        D --> E[(Chroma vector store<br/>chroma_db/)]
    end

    subgraph Runtime["Query time (backend/app/rag_pipeline.py)"]
        F[User message] --> G{Chat history present?}
        G -->|yes| H[Contextualize prompt<br/>rewrite into a standalone question]
        G -->|no| I[Use message as-is]
        H --> J[Embed query]
        I --> J
        J --> K[Chroma similarity search, k=3]
        E --> K
        K --> L[Retrieved chunks joined as context]
        L --> M[QA prompt + system rules + chat history]
        M --> N[ChatGroq — llama-3.3-70b-versatile]
        N --> O[Answer]
    end
```

The two phases are decoupled on purpose: the vector store only needs to be rebuilt when the
underlying medical reference material changes, while every chat request just reads from the
already-persisted `chroma_db`.

### Retrieval and generation, in detail

- **Embeddings** — `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2`, chosen for
  multilingual coverage (Bengali and English both hit the same knowledge base) and because it runs
  fully local with no per-call API cost.
- **Vector store** — Chroma, persisted to disk so the index survives restarts and is only rebuilt
  when `build-rag-pipeline/ingest.py` is re-run against updated source documents.
- **History-aware retrieval** — if the conversation has prior turns, the latest question is first
  rewritten into a standalone query (same language as the user) before it's embedded and searched.
  This keeps follow-up questions like "and if it doesn't go away?" resolvable without repeating
  context.
- **Generation** — `ChatGroq` running `llama-3.3-70b-versatile` at low temperature (0.3), given the
  retrieved context, the running chat history, and a system prompt that enforces language
  matching, forbids inventing medicine names or dosages, blocks outright diagnoses, and appends an
  emergency directive or a doctor-consult disclaimer depending on how the conversation reads.
- **Symptom triage branch** — before a message ever reaches the RAG chain, it's checked against a
  bilingual keyword list (`is_symptom_query`). If it looks like a symptom report, the backend
  first asks Groq to generate 3–5 structured multiple-choice triage questions (onset, severity,
  associated symptoms, aggravating/relieving factors, red flags) instead of answering immediately.
  The answers the user picks are folded back into the message before it's run through the RAG
  chain, so the final answer is grounded in both the retrieved context and the patient's actual
  reported details.

### Beyond the chat pipeline

Two features sit outside the RAG flow entirely and are worth calling out so the architecture isn't
mistaken for "RAG does everything":

- **Medicine lookup** is a local SQLite database (`medex.db`) queried with FTS5 full-text search —
  no LLM involved in retrieval. An LLM call (Groq) is only used afterward, on request, to turn the
  raw structured record into a plain-language overview.
- **Vision symptom checker and prescription OCR** call Gemini directly on the uploaded image. These
  are single-turn, stateless calls that return a description or transcript, which the user can then
  feed into the chat as additional context (`[Visual Symptoms]` / `[OCR Prescription]` blocks that
  the RAG system prompt is explicitly instructed to read and use).

## Tech stack

| Layer | Choice |
|---|---|
| Backend framework | FastAPI |
| LLM (chat + triage + medicine summaries) | Groq — `llama-3.3-70b-versatile` |
| Vision + OCR | Google Gemini — `gemini-2.5-flash` |
| Voice transcription | Groq Whisper — `whisper-large-v3-turbo` |
| Vector store | Chroma (local, persisted to disk) |
| Embeddings | HuggingFace `paraphrase-multilingual-MiniLM-L12-v2` |
| Orchestration | LangChain (`langchain-core`, `langchain-groq`, `langchain-community`) |
| Medicine database | SQLite with an FTS5 virtual table for brand-name search |
| Frontend | React 18 + Vite, MUI components layered with Tailwind utility classes |

## Running everything together

```bash
# from the repo root, with GROQ_API_KEY and GEMINI_API_KEY available in your shell
docker compose up --build
```

This builds and starts both containers:

| Service | URL |
|---|---|
| Backend API | http://localhost:8000 |
| Frontend | http://localhost:5173 |

`docker-compose.yml` mounts `backend/chroma_db` as a volume, so a pre-built index is picked up
without being baked into the image. For local development without Docker, follow the setup steps
in the backend and frontend READMEs individually — the two run as ordinary standalone processes.

## Rebuilding the knowledge base

The vector store isn't generated at request time — it's built once (or whenever source material
changes) by the ingestion script:

```bash
cd build-rag-pipeline
pip install langchain-community langchain-text-splitters langchain-huggingface chromadb pypdf sentence-transformers
python ingest.py
```

See [`build-rag-pipeline/README.md`](./build-rag-pipeline/README.md) for the full breakdown of the
chunking and indexing choices. The resulting `chroma_db/` folder is what `backend/app/rag_pipeline.py`
loads at startup — copy or mount it into `backend/` before running the API.

## API surface

Full endpoint documentation lives in the backend README; the interactive Swagger UI is also
available at `http://localhost:8000/docs` once the backend is running.

## Notes worth knowing before deploying

- The RAG pipeline requires `GROQ_API_KEY` to initialize at startup — `/api/health` reports
  `rag_ready: false` if it failed to load, most commonly because `chroma_db` wasn't found.
- Vision and OCR endpoints require `GEMINI_API_KEY`; they return a 503 if it's missing rather than
  failing silently.
- This is an informational assistant, not a diagnostic tool — the system prompt is deliberately
  constrained to avoid issuing diagnoses and to escalate to emergency guidance when the reported
  symptoms warrant it.