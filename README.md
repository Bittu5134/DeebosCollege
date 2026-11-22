# BranchWise

BranchWise is a JEE college predictor and JoSAA counselling helper. It filters IIT, NIT and IIIT branch cutoffs against a student's rank and category, then ranks the surviving branches with a small retrieval pipeline over college, placement and campus data. The result can be exported as a JoSAA choice list.

## What it does

- Filters branches by JEE Main or Advanced rank, category, gender and home state.
- Handles IIT home state, other state, Goa, Jammu and Kashmir and Ladakh quota categories.
- Ranks branches with a hybrid of sentence-embedding similarity (Qdrant) and structured signals such as NIRF rank, placement percentage and CTC.
- Uses Gemini to turn a free-text preference into a profile, generate follow-up questions and explain the top recommendations.
- Exports the shortlist as a CSV choice list.
- Shows aggregate search and placement statistics.

## Stack

- Backend: FastAPI, SQLAlchemy, PostgreSQL 16
- Retrieval: Qdrant with `BAAI/bge-small-en-v1.5` embeddings
- LLM: Google Gemini through `google-genai`
- Frontend: React 19 and Vite, served by Nginx
- Packaging: Docker Compose

## Running with Docker

You need Docker with Compose v2.

```bash
cp .env.example .env
```

Edit `.env` and set at least `GEMINI_API_KEY`, `POSTGRES_PASSWORD` and `SESSION_SECRET`.

```bash
docker compose up --build -d
./init-data.sh
```

The first build downloads a CPU-only PyTorch wheel and the embedding model, so it can take several minutes. Once `init-data.sh` finishes:

- Frontend: http://localhost:8080
- API: http://localhost:8000/docs
- Qdrant dashboard: http://localhost:6333/dashboard

`init-data.sh` loads the seed JSON into PostgreSQL and rebuilds the Qdrant collection. Run it again whenever `data/structured_json` changes.

## Running locally

Requirements: Python 3.11, Node 20 or newer, PostgreSQL 16, Qdrant.

Start the databases first:

```bash
docker compose up -d postgres qdrant
```

Backend:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

For a backend running on the host, `DATABASE_URL` in `.env` must point at `localhost` instead of the Compose service name `postgres`:

```bash
export DATABASE_URL=postgresql+psycopg2://postgres:change_me@localhost:5432/college_predictor
uvicorn app.main:app --reload
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

Vite proxies `/api` to `http://localhost:8000`.

## Data pipeline

The repository ships a seed dataset for 79 colleges in `data/structured_json`. The raw JoSAA 2024 round 5 cutoff dumps are in `data/source/josaa`.

The scripts are optional for running the app, but this is how the dataset was produced:

- `scripts/scrape_colleges.py` drives the Gemini CLI with Playwright to collect official college pages.
- `scripts/parse_scraped.py` parses the scraped markdown into the JSON schema in `data/structured_json`.
- `scripts/ingest_colleges.py` truncates and repopulates the PostgreSQL tables.
- `scripts/build_embeddings.py` creates one embedding per branch and uploads it to Qdrant.

Run them inside the backend container:

```bash
docker compose exec backend python -m scripts.ingest_colleges
docker compose exec backend python -m scripts.build_embeddings
```

`data/scraped/`, `data/parsed_json/`, `qdrant_storage/` and `Colleges_data/` are local working directories and are gitignored.

## API

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/health` | Health check |
| GET | `/colleges` | List colleges |
| GET | `/branches` | List branches |
| GET | `/predict` | Raw cutoff lookup by rank, category and home state |
| POST | `/recommend` | Ranked recommendations with optional AI explanations |
| POST | `/generate-questions` | Extract a preference profile and generate follow-up questions |
| POST | `/export-choices` | Download the shortlist as CSV |
| GET | `/statistics` | Aggregate search and placement statistics |
| POST | `/auth/login` | Create a local demo session token |

Interactive API docs are at `/docs`.

## Project layout

- `backend/app`: FastAPI routes, ORM models, CRUD, auth, recommendation and LLM code
- `backend/scripts`: scraping, parsing, database ingestion and embedding scripts
- `data/structured_json`: seed college dataset
- `data/source/josaa`: raw JoSAA cutoff dumps
- `frontend`: React and Vite single-page app
- `docs/proposal`: course proposal generator

## Known limitations

- Sign-in is a demo. Any email creates a signed local session token. There is no password, OAuth or user table, so do not treat it as real authentication.
- `/statistics` is public.
- Tables are created with `Base.metadata.create_all` at startup. There are no migrations.
- The Qdrant collection has to be rebuilt after dataset changes. There is no incremental indexing.
- Scraped campus fields vary in quality, and the 2025 cutoff data is incomplete for some branches. The recommendation falls back to 2024 cutoffs where needed.
- There are no automated tests yet.
- The backend image is large because it bundles PyTorch and the embedding model.

The cutoff data comes from public JoSAA releases and college websites. Check it against the official JoSAA portal before using it for real counselling.

This started as a college course project. `docs/proposal/generate_proposal.py` generates the original proposal document and is not part of the running app. It needs `python-docx` if you want to regenerate it.
