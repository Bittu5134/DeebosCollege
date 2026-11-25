import os
import sqlite3
from pathlib import Path
from contextlib import contextmanager

# Default reviews SQLite path: data/campus_insider_reviews.db
BASE_DIR = Path(__file__).resolve().parents[3]
REVIEWS_DB_DIR = Path(os.getenv("DATA_DIR", BASE_DIR / "data"))
REVIEWS_DB_PATH = Path(os.getenv("CAMPUS_INSIDER_DB_PATH", REVIEWS_DB_DIR / "campus_insider_reviews.db"))

def get_connection():
    REVIEWS_DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(REVIEWS_DB_PATH), timeout=10.0)
    conn.row_factory = sqlite3.Row
    return conn

@contextmanager
def get_db():
    conn = get_connection()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

def init_db():
    REVIEWS_DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with get_db() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS reviews (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                college_id INTEGER NOT NULL,
                college_name TEXT NOT NULL,
                branch_id INTEGER,
                branch_name TEXT,
                reviewer_role TEXT NOT NULL DEFAULT 'Current Student', -- 'Current Student', 'Senior', 'Alum', 'Aspirant'
                reviewer_name TEXT NOT NULL DEFAULT 'Anonymous Student',
                batch_year INTEGER,
                review_text TEXT NOT NULL,
                -- Ratings per topic (1 to 5)
                rating_hostel REAL,
                rating_food REAL,
                rating_academics REAL,
                rating_coding_culture REAL,
                rating_clubs REAL,
                rating_campus_life REAL,
                overall_rating REAL,
                -- Topic tags (JSON array or comma-separated: hostel, food, academics, coding culture, clubs, campus life)
                detected_topics TEXT,
                -- Helpful votes count
                helpful_votes INTEGER NOT NULL DEFAULT 0,
                -- ETL Provenance
                is_sample_data INTEGER NOT NULL DEFAULT 0, -- 1 if sample/seeded, 0 if user-submitted
                source_platform TEXT, -- e.g. 'Google Form', 'Platform Submission', 'Reddit', 'Quora', 'Collegedunia', 'Shiksha', 'YouTube comments'
                source_link TEXT, -- Reference URL or attribution
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_reviews_college_id ON reviews(college_id);
        """)
        conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON reviews(created_at);
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS review_votes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                review_id INTEGER NOT NULL,
                user_identifier TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(review_id, user_identifier)
            );
        """)
