# Cross-Dev Guide — Campus Insider (Student Reviews Plugin)

| | |
|---|---|
| **Plugin** | Campus Insider: student reviews and topic scores |
| **Base project** | Deebo's College (JoSAA college predictor) |
| **Contributed in** | commit `35572f5` "add in plugin cross dev" (26 Nov 2026) |
| **Author** | the cross-dev team (external to the base project team) |
| **Size** | 18 files, about 4,300 lines of code (plus a 43k-line `.har` capture used by the scraper) |

The plugin adds crowd-sourced, topic-level campus insight to the base app's rank-based
recommendations. Aspirants can read, submit, vote on and compare student reviews for any
institute in the base app's index. Reviews are summarised into six topic scores.

---

## 1. What the plugin adds

- **Six standard topics:** hostel, food, academics, coding culture, clubs, campus life.
- **Topic scores** (1.0–5.0) per college, weighted by how recent each review is and by its helpful votes.
- **Review feed** with reviewer role (Current Student / Senior / Alum / Aspirant), batch, tags,
  source platform and source link.
- **Write a review**: a form with per-topic rating sliders.
- **Helpful votes**: one vote per user per review.
- **Side-by-side comparison** of two colleges across all six topics.
- **ETL ingestion** from Shiksha, public portals and Google Form exports.

---

## 2. Files contributed

### Backend (`backend/app/reviews/`)
| File | Role |
|---|---|
| `__init__.py` | Exports `reviews_router` |
| `database.py` | SQLite storage (`data/campus_insider_reviews.db`); creates the `reviews` and `review_votes` tables |
| `routes.py` | FastAPI router mounted at `/reviews` |
| `scoring.py` | Topic keyword extraction and weighted topic scoring |
| `seed_data.py` | Seeds sample reviews when the database is empty |

### ETL scripts (`backend/scripts/`)
| File | Role |
|---|---|
| `scrape_shiksha_reviews.py` | Crawls Shiksha.com review pages with BeautifulSoup, tags reviews by topic and writes them to SQLite. Reads `www.shiksha.com.har` (in the repo root) for discovery |
| `fetch_portal_reviews.py` | Harvests public review snippets (Collegedunia, Shiksha, Quora, Reddit archives), matches them to the base app's college index and loads them |

### Frontend (`frontend/src/`)
| File | Role |
|---|---|
| `components/StudentReviewsScreen.jsx` + `reviews.css` | Reviews screen: topic cards, feed, filters, compare tab, write-review modal |
| `components/ui/SearchableSelect.jsx` + `searchable-select.css` | Searchable college picker |
| `api.js` (+44 lines) | Client functions for the `/reviews` endpoints |
| `App.jsx`, `ResultsScreen.jsx`, `results.css` | Navigation entry ("Student Reviews") and integration with the results view |

### Base-app touch points
- `backend/app/main.py`: `app.include_router(reviews_router)` (3 lines)
- `backend/requirements.txt`: adds `beautifulsoup4`

---

## 3. Data model (SQLite)

**`reviews`**: `id`, `college_id`, `college_name`, `branch_id`, `branch_name`, `reviewer_role`,
`reviewer_name`, `batch_year`, `review_text`, `rating_hostel`, `rating_food`, `rating_academics`,
`rating_coding_culture`, `rating_clubs`, `rating_campus_life`, `overall_rating`, `detected_topics`,
`helpful_votes`, `is_sample_data` (1 = seeded), `source_platform`, `source_link`, `created_at`.
Indexed on `college_id` and `created_at`.

**`review_votes`**: `id`, `review_id`, `user_identifier`, `created_at`, with
`UNIQUE(review_id, user_identifier)`, which enforces one vote per user per review.

The plugin uses its own SQLite file, separate from the base app's Postgres. It links to the base
data only through `college_id`, `college_name` and `branch_name`. It can be removed without any
schema change to the base app.

Location: `$DATA_DIR/campus_insider_reviews.db`, which is `/app/data` in Docker (a mounted
volume, so it persists). Override it with `CAMPUS_INSIDER_DB_PATH`.

---

## 4. Scoring algorithm (`scoring.py`)

For every review *r* of a college:

```
recency_weight  = max(0.25, exp(-0.693 * days_old / 180))   # 180-day half-life, floor 0.25
helpful_weight  = 1 + 0.5 * ln(1 + helpful_votes)
w(r)            = recency_weight * helpful_weight
topic_score(t)  = Σ rating_t(r) * w(r)  /  Σ w(r)           # over reviews that rated topic t
```

Scores map to labels, from best to worst: Exceptional (≥ 4.5), Very Positive, Positive, Satisfactory,
Mixed, Needs Improvement, Critical. A topic with no ratings shows "No data". When a review has no explicit topic ratings, `extract_topics()` tags it from
keywords in the review text. The scores summarise user opinion; they are not official ratings.

---

## 5. API (`/reviews`)

| Method | Path | Purpose |
|---|---|---|
| GET | `/reviews/topics` | The six supported topics |
| GET | `/reviews/colleges` | Colleges that have reviews, with counts and scores |
| GET | `/reviews/college/{id_or_name}` | Topic scores + review feed (query: `topic`, `sort`) |
| POST | `/reviews/submit` | Submit a review (`review_text` ≥ 10 chars, ratings 1–5) |
| POST | `/reviews/vote/{review_id}` | Mark a review helpful (`user_identifier`) |
| GET | `/reviews/compare?college_id_a=&college_id_b=` | Side-by-side topic comparison |
| POST | `/reviews/etl/import-google-form` | Bulk import of Google Form export rows |

Example submission:
```json
POST /api/reviews/submit
{
  "college_id": 12,
  "college_name": "NIT Tiruchirappalli (NIT Trichy)",
  "reviewer_role": "Senior",
  "batch_year": 2024,
  "review_text": "Strong coding culture, active DevClub and regular hackathons.",
  "rating_coding_culture": 4.5,
  "rating_clubs": 4.0,
  "overall_rating": 4.3
}
```

---

## 6. Running and seeding

The plugin needs no extra service. It starts with the backend:
```bash
sudo docker compose up -d --build
```
- On startup the router creates the SQLite tables and seeds sample reviews if the database is empty.
- To load real reviews:
  ```bash
  sudo docker compose exec backend python -m scripts.fetch_portal_reviews
  sudo docker compose exec backend python -m scripts.scrape_shiksha_reviews
  ```
- In the UI, open **Student Reviews** from the top navigation.

---

## 7. Integration notes for the base team

- **Loose coupling:** the plugin owns its storage and routes. The base app only mounts the router.
- **Identity:** the base app no longer has sign-in, so helpful votes use an anonymous
  per-browser identifier. The code still reads a `user_id` if one is ever supplied.
- **Theming:** the base app's dark theme (`styles/theme.css`) overrides plugin colours so the
  reviews screen matches the rest of the app.
- **Known limitations:**
  - Sample seed reviews are illustrative, not verified (flagged with `is_sample_data = 1`).
  - Scrapers depend on third-party page structure and may break when those sites change.
  - Review submissions are not moderated.
  - The SQLite store is single-node.
