# Deebo's College — Project Guide

A JoSAA counselling assistant for JEE aspirants. It matches a candidate's JEE Main / Advanced rank
against 2024 and 2025 closing ranks for **79 institutes** (23 IITs, 31 NITs, 25 IIITs, 569 branches)
and re-ranks the eligible options with a hybrid semantic search over each college's campus profile.

---

## 1. Architecture

```
Browser ──► nginx (frontend container, :8080)
              ├── /        React 19 + Vite SPA (static build)
              └── /api/*   proxied to FastAPI (backend container, :8000)
                             ├── PostgreSQL 16   colleges, branches, cutoffs, search logs
                             ├── Qdrant          branch embeddings (vector search)
                             ├── SQLite          student reviews (Campus Insider plugin)
                             └── Gemini / OpenAI-compatible LLM
```

| Service | Image / stack | Port |
|---|---|---|
| `postgres` | postgres:16-alpine | 5432 |
| `qdrant` | qdrant/qdrant | 6333 |
| `backend` | Python 3.11, FastAPI, SQLAlchemy, Uvicorn, sentence-transformers (CPU torch) | 8000 |
| `frontend` | Node 20 build → nginx:alpine | 8080 |

---

## 2. Running it

### Prerequisites
- Docker with the Compose and Buildx plugins (Arch/CachyOS: `sudo pacman -S docker docker-compose docker-buildx`)
- A `.env` in the project root (copy `.env.example`). The one value you must set is `GEMINI_API_KEY`.

### Start
```bash
sudo docker compose up -d --build
```
On first start the backend loads the colleges into Postgres and builds the Qdrant index in the
background. Watch progress with `sudo docker compose logs -f backend` until you see **"Data ready."**
(this takes a few minutes the first time).

| URL | What |
|---|---|
| http://localhost:8080 | Web app |
| http://localhost:8000/docs | Interactive API docs (Swagger) |
| http://localhost:6333/dashboard | Qdrant dashboard |

### Everyday commands
```bash
sudo docker compose up -d --build     # rebuild after code changes (data is kept)
sudo docker compose down              # stop
sudo docker compose ps                # status
sudo docker compose logs -f backend   # backend logs
```

### Manual data reload (optional)
```bash
sudo docker compose exec backend python -m scripts.ingest_colleges    # Postgres
sudo docker compose exec backend python -m scripts.build_embeddings   # Qdrant
sudo docker compose exec backend python -m scripts.plain_text         # text corpus -> data/plain_text/
```

---

## 3. Configuration (`.env`)

| Variable | Default | Purpose |
|---|---|---|
| `GEMINI_API_KEY` | — | Gemini API key (required for AI features) |
| `LLM_PROVIDER` | `gemini` | `gemini` or `openai` (any OpenAI-compatible endpoint) |
| `LLM_MODEL` | `gemini-3.5-flash` | Gemini model name |
| `OPENAI_BASE_URL` / `OPENAI_API_KEY` / `OPENAI_MODEL` | — / — / `gpt-4o-mini` | OpenAI-compatible provider |
| `USE_VERTEX`, `GCP_PROJECT`, `GCP_LOCATION` | `false` | Use Vertex AI instead of an API key |
| `DATABASE_URL` | set by compose | Postgres connection |
| `QDRANT_URL` | set by compose | Qdrant connection |
| `EMBEDDING_MODEL` | `BAAI/bge-small-en-v1.5` | Sentence-transformer model |
| `POSTGRES_USER/PASSWORD/DB` | `postgres/postgres/college_predictor` | Database credentials |

---

## 4. Repository layout

```
backend/
  app/
    main.py          FastAPI app: endpoints, data bootstrap, LLM fallbacks
    crud.py          Cutoff queries, home-state quota logic, college -> state mapping
    recommender.py   Eligibility + Qdrant vector search + hybrid scoring
    llm.py           Preference extraction, follow-up questions, explanations
    models.py        SQLAlchemy models (College, Branch, BranchCutoff, UserSearch)
    schemas.py       Pydantic request models
    config.py        Environment configuration
    database.py      Engine / session
    reviews/         Campus Insider plugin (see CROSS_DEV_GUIDE.md)
  scripts/
    scrape_colleges.py     ETL: scrape official .ac.in sites / Wikipedia
    parse_scraped.py       ETL: LLM-normalise scraped text into JSON
    ingest_colleges.py     Load structured JSON into Postgres
    build_embeddings.py    Embed branch documents into Qdrant
    plain_text.py          Export the clean text corpus
frontend/src/
  App.jsx                  Shell, navigation, state, persistence, share link
  api.js                   API client (all calls go to /api)
  components/              ProfileScreen, InterviewScreen, ResultsScreen,
                           StudentReviewsScreen, StatsModal, LegalPage
  styles/                  tokens, base, ui, shell, theme (dark theme, loaded last)
data/structured_json/      Normalised college JSON (iit/, nit/, i3t/)
```

---

## 5. How a recommendation is made

1. **Profile** — the user enters rank (and optional Advanced rank), category, gender, home state and
   free-text preferences.
2. **Preference extraction** — the LLM converts the free text into a structured profile
   (booleans such as `coding_culture`, `placements`, `research`, plus `preferred_states` and a
   keyword-only `vector_query`).
3. **Follow-up questions** — the LLM writes 5–10 yes/no questions for profile fields that are still
   unknown. Answers update the profile.
4. **Eligibility** — `crud.get_eligible_branch_ids` keeps branches whose closing rank is at or above
   the user's rank for the correct quota. IITs/IIITs use the base category; NITs use HS/OS (or
   GO/JK/LA) quota according to the user's home state. Architecture/planning programmes are excluded.
5. **Vector search** — the `vector_query` is embedded with bge-small and searched in Qdrant,
   restricted to eligible branch IDs.
6. **Hybrid score** — similarity plus bonuses: preferred state (+0.05), coding clubs (+0.15),
   incubator/startups (+0.02), NIRF top-10 for research (+0.02), strong placements (+0.01/+0.03),
   rich campus life (+0.02). A branch-group keyword filter (CSE, ECE, "circuital", "core", …) keeps
   results on-topic.
7. **Categorisation** — each option is labelled **Reach / Target / Safe** from the rank-to-cutoff ratio.
8. **Explanations** — the LLM writes a short, specific reason for the top three picks, citing named
   clubs, facilities or startups.

If the LLM fails or no key is configured, the backend falls back to searching with the raw query
and skips the follow-up questions instead of returning an error.

---

## 6. API reference (base app)

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | Liveness check |
| GET | `/colleges`, `/branches` | Full lists |
| GET | `/predict?rank=&category=&homestate=` | Plain cutoff-based prediction |
| POST | `/recommend` | Full AI recommendation (body: `rank`, `adv_rank`, `query`, `category`, `homestate`, `exam_type`, `profile`) |
| POST | `/generate-questions` | Extracted profile + follow-up questions |
| POST | `/export-choices` | Categorised choice list as CSV |
| GET | `/statistics` | Usage statistics |

Full schemas are at `/docs`.

---

## 7. Frontend

- **Screens:** Profile → Follow-up questions → Results, plus Student Reviews, Stats, Privacy/Terms.
- **Results:** filter by probability (All/Safe/Target/Reach), college type, branch group and college;
  sort; expand rows for placement stats, clubs and startups; export CSV.
- **Persistence:** last inputs are saved in `localStorage`; **Share** copies a link with the inputs
  encoded in the URL hash.
- **Theme:** dark "Deep Ink" palette, one sans-serif typeface, a single type scale and card style
  (`styles/theme.css`).

---

## 8. Troubleshooting

| Symptom | Fix |
|---|---|
| `permission denied ... docker.sock` | Use `sudo`, or log out and back in after `usermod -aG docker $USER` |
| Results empty right after first start | Data is still loading; wait for "Data ready." in backend logs |
| Follow-up questions take ~30 s | Normal — waiting on the LLM; a loading screen is shown |
| AI features return generic results | Check `GEMINI_API_KEY` in `.env`, then `docker compose up -d` |
| Old UI after a rebuild | Hard-refresh the browser (Ctrl+Shift+R) |
