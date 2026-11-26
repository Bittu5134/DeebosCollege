"""Import Shiksha reviews from the saved browser capture (www.shiksha.com.har). No live scraping.

Additive and idempotent: only inserts reviews not already present; never deletes or alters rows.
Undo with:  DELETE FROM reviews WHERE source_platform = 'Shiksha';

Usage: python -m scripts.import_shiksha_har
"""
import json
import os
import re
import sqlite3
import urllib.parse
from pathlib import Path

from bs4 import BeautifulSoup

from app.reviews.database import REVIEWS_DB_PATH, init_db
from app.reviews.scoring import extract_topics

HAR_PATH = Path(os.getenv("SHIKSHA_HAR_PATH", "/app/www.shiksha.com.har"))
LABELS = {
    "reviewTitle": "Title",
    "reviewDescription": "Overview",
    "placementDescription": "Placements",
    "infraDescription": "Infrastructure",
    "facultyDescription": "Faculty",
    "learningExpDescription": "Learning experience",
    "courseSupportDescription": "Course support",
    "highRatingReason": "Liked",
    "lowRatingReason": "Could improve",
    "knowBeforeJoining": "Know before joining",
}


def _find_reviews(obj):
    if isinstance(obj, dict):
        for key, value in obj.items():
            if key == "reviewData" and isinstance(value, list):
                return value
            found = _find_reviews(value)
            if found is not None:
                return found
    return None


def _text(content) -> str:
    if isinstance(content, dict):
        parts = []
        for key, value in content.items():
            if isinstance(value, str) and value.strip():
                label = LABELS.get(key, re.sub(r"Description$", "", key).capitalize())
                parts.append(f"{label}: {BeautifulSoup(value, 'html.parser').get_text(' ', strip=True)}")
        return "\n\n".join(parts)
    return BeautifulSoup(str(content or ""), "html.parser").get_text(" ", strip=True)


def _rating(value):
    try:
        v = float(value)
        return v if 1.0 <= v <= 5.0 else None
    except (TypeError, ValueError):
        return None


def _base_college(keyword: str):
    """Match the base app's college (Postgres) so ids/names agree with the rest of the app."""
    try:
        from app.database import SessionLocal
        from app.models import College
        db = SessionLocal()
        try:
            c = db.query(College).filter(College.college_name.ilike(f"%{keyword}%")).first()
            return (c.id, c.college_name) if c else None
        finally:
            db.close()
    except Exception as e:
        print(f"[warn] base college lookup failed ({e}); using fallback name")
        return None


def main():
    if not HAR_PATH.exists():
        raise SystemExit(f"HAR file not found at {HAR_PATH} (set SHIKSHA_HAR_PATH)")

    har = json.loads(HAR_PATH.read_text(encoding="utf-8"))
    reviews, seen = [], set()
    institute_id = None
    listing_url = None
    for entry in har["log"]["entries"]:
        url = entry["request"]["url"]
        if "getReviewPage" not in url:
            continue
        body = entry["response"]["content"].get("text")
        if not body:
            continue
        m = re.search(r"instituteId=(\d+)", url)
        institute_id = institute_id or (m.group(1) if m else None)
        lm = re.search(r"listingUrl=([^&]+)", url)
        listing_url = listing_url or (urllib.parse.unquote(lm.group(1)) if lm else None)
        for r in _find_reviews(json.loads(body)) or []:
            if r.get("reviewId") not in seen:
                seen.add(r.get("reviewId"))
                reviews.append(r)

    print(f"Found {len(reviews)} unique reviews in {HAR_PATH.name} (Shiksha institute {institute_id})")

    # The capture is IIT Kanpur's review page.
    # Reuse the college entry the reviews plugin already has (so it stays one college on screen),
    # else the base app's college, else a plain fallback.
    init_db()
    with sqlite3.connect(str(REVIEWS_DB_PATH), timeout=15.0) as c:
        row = c.execute(
            "SELECT college_id, college_name FROM reviews WHERE college_name LIKE '%Kanpur%' "
            "AND college_id > 0 AND source_platform != 'Shiksha' ORDER BY college_id LIMIT 1"
        ).fetchone()
    college_id, college_name = row or _base_college("Kanpur") or (0, "IIT Kanpur")
    source_link = f"https://www.shiksha.com{listing_url}" if listing_url else "https://www.shiksha.com"

    conn = sqlite3.connect(str(REVIEWS_DB_PATH), timeout=15.0)
    inserted = 0
    try:
        existing = {
            row[0] for row in conn.execute(
                "SELECT review_text FROM reviews WHERE source_platform = 'Shiksha' AND college_name = ?",
                (college_name,),
            )
        }
        for r in reviews:
            text = _text(r.get("reviewContent"))
            if len(text) < 10 or text in existing:
                continue
            academics = _rating(r.get("facultyRating")) or _rating(r.get("learningExperienceRating"))
            name = " ".join(x for x in [r.get("firstname"), r.get("lastname")] if x) if not r.get("anonymous") else ""
            conn.execute(
                """INSERT INTO reviews (
                       college_id, college_name, reviewer_role, reviewer_name, batch_year, review_text,
                       rating_hostel, rating_academics, rating_campus_life, overall_rating,
                       detected_topics, helpful_votes, is_sample_data, source_platform, source_link, created_at
                   ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'Shiksha', ?, COALESCE(?, CURRENT_TIMESTAMP))""",
                (
                    college_id, college_name, "Current Student", name or "Shiksha reviewer",
                    r.get("yearOfGraduation"), text,
                    _rating(r.get("campusFacilitiesRating")), academics, _rating(r.get("crowdCampusRating")),
                    _rating(r.get("averageRating")),
                    ",".join(extract_topics(text)), int(r.get("helpfulCount") or 0),
                    source_link, r.get("creationDate"),
                ),
            )
            existing.add(text)
            inserted += 1
        conn.commit()
    finally:
        conn.close()
    print(f"Inserted {inserted} new Shiksha reviews for {college_name} (id {college_id}).")


if __name__ == "__main__":
    main()
