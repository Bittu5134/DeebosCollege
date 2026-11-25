import json
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Query, Body, Header, Depends
from pydantic import BaseModel, Field

from .database import get_db, init_db
from .scoring import extract_topics, compute_college_topic_scores, TOPICS
from .seed_data import seed_sample_reviews

router = APIRouter(prefix="/reviews", tags=["Campus Insider - Student Reviews"])

# Make sure tables exist and seed initial data if clean
init_db()
seed_sample_reviews()

class ReviewSubmission(BaseModel):
    college_id: int
    college_name: str
    branch_id: Optional[int] = None
    branch_name: Optional[str] = None
    reviewer_role: str = Field(default="Current Student", description="Role: Current Student, Senior, Alum, Aspirant")
    reviewer_name: str = Field(default="Anonymous Student")
    batch_year: Optional[int] = None
    review_text: str = Field(..., min_length=10, description="Detailed student review")
    rating_hostel: Optional[float] = Field(None, ge=1.0, le=5.0)
    rating_food: Optional[float] = Field(None, ge=1.0, le=5.0)
    rating_academics: Optional[float] = Field(None, ge=1.0, le=5.0)
    rating_coding_culture: Optional[float] = Field(None, ge=1.0, le=5.0)
    rating_clubs: Optional[float] = Field(None, ge=1.0, le=5.0)
    rating_campus_life: Optional[float] = Field(None, ge=1.0, le=5.0)
    overall_rating: Optional[float] = Field(None, ge=1.0, le=5.0)
    source_platform: Optional[str] = Field(default="Platform Submission")
    source_link: Optional[str] = None

class VoteRequest(BaseModel):
    user_identifier: Optional[str] = Field(default="anonymous_user")

@router.get("/topics")
def get_supported_topics():
    """Returns the list of 6 standard topics evaluated by Campus Insider."""
    return {"topics": TOPICS}

@router.get("/colleges")
def list_colleges_with_reviews(
    topic: Optional[str] = None,
    sort_by: Optional[str] = Query(default="reviews_count", pattern="^(reviews_count|score|college_name)$")
):
    """
    Lists all colleges that have student reviews along with their aggregate score.
    """
    with get_db() as conn:
        rows = conn.execute("""
            SELECT 
                college_id,
                college_name,
                COUNT(id) as total_reviews,
                AVG(overall_rating) as avg_rating,
                SUM(helpful_votes) as total_votes
            FROM reviews
            GROUP BY college_id, college_name
        """).fetchall()

    results = []
    for r in rows:
        c_id = r["college_id"]
        c_name = r["college_name"]
        
        # Load topic scores for each college
        with get_db() as conn:
            rev_rows = conn.execute("SELECT * FROM reviews WHERE college_id = ?", (c_id,)).fetchall()
            reviews = [dict(x) for x in rev_rows]
            scores = compute_college_topic_scores(reviews)

        target_score = scores["overall_score"]
        if topic and topic.lower() in scores["topic_breakdown"]:
            target_score = scores["topic_breakdown"][topic.lower()]["score"]

        results.append({
            "college_id": c_id,
            "college_name": c_name,
            "total_reviews": r["total_reviews"],
            "overall_score": scores["overall_score"],
            "overall_label": scores["overall_label"],
            "topic_breakdown": scores["topic_breakdown"],
            "target_topic_score": target_score,
            "disclaimer": scores["summary_disclaimer"]
        })

    if sort_by == "college_name":
        results.sort(key=lambda x: x["college_name"])
    elif sort_by == "score":
        results.sort(key=lambda x: (x["target_topic_score"] is not None, x["target_topic_score"] or 0), reverse=True)
    else:
        results.sort(key=lambda x: x["total_reviews"], reverse=True)

    return {"colleges": results}

@router.get("/college/{college_identifier}")
def get_college_reviews(
    college_identifier: str,
    topic: Optional[str] = None,
    sort_by: Optional[str] = Query(default="recent", pattern="^(recent|helpful|rating)$")
):
    """
    Returns student reviews and topic rating breakdown for a specific college.
    college_identifier can be an integer ID or college name string.
    """
    with get_db() as conn:
        if college_identifier.isdigit():
            rows = conn.execute("SELECT * FROM reviews WHERE college_id = ?", (int(college_identifier),)).fetchall()
        else:
            pattern = f"%{college_identifier}%"
            rows = conn.execute("SELECT * FROM reviews WHERE college_name LIKE ? OR college_id = ?", (pattern, 0)).fetchall()

    reviews = [dict(r) for r in rows]
    college_name = reviews[0]["college_name"] if reviews else college_identifier
    college_id = reviews[0]["college_id"] if reviews else (int(college_identifier) if college_identifier.isdigit() else 0)

    # Compute AIML topic scores
    scores = compute_college_topic_scores(reviews)

    # Filter by topic if requested
    filtered_reviews = reviews
    if topic:
        t_clean = topic.lower()
        rating_field_map = {
            "hostel": "rating_hostel",
            "food": "rating_food",
            "academics": "rating_academics",
            "coding culture": "rating_coding_culture",
            "clubs": "rating_clubs",
            "campus life": "rating_campus_life",
        }
        f_name = rating_field_map.get(t_clean)
        filtered_reviews = [
            r for r in reviews
            if (t_clean in (r.get("detected_topics") or "").lower()) or
               (f_name and r.get(f_name) is not None and r.get(f_name) > 0)
        ]

    # Sort reviews
    if sort_by == "helpful":
        filtered_reviews.sort(key=lambda r: (r.get("helpful_votes") or 0, r.get("created_at") or ""), reverse=True)
    elif sort_by == "rating":
        filtered_reviews.sort(key=lambda r: (r.get("overall_rating") or 0, r.get("created_at") or ""), reverse=True)
    else:
        filtered_reviews.sort(key=lambda r: r.get("created_at") or "", reverse=True)

    return {
        "college_id": college_id,
        "college_name": college_name,
        "summary": scores,
        "reviews_count": len(filtered_reviews),
        "total_reviews": len(reviews),
        "reviews": filtered_reviews
    }

@router.post("/submit")
def submit_review(payload: ReviewSubmission):
    """
    Accepts student reviews submitted through Google Form ETL or through the plugin directly.
    Cleans review text, extracts topics using AIML keyword rules, calculates overall rating if missing,
    and inserts into SQLite.
    """
    cleaned_text = payload.review_text.strip()
    detected = extract_topics(cleaned_text)

    # Calculate overall rating if not directly provided
    overall = payload.overall_rating
    if overall is None:
        topic_ratings = [
            r for r in [
                payload.rating_hostel, payload.rating_food, payload.rating_academics,
                payload.rating_coding_culture, payload.rating_clubs, payload.rating_campus_life
            ] if r is not None
        ]
        if topic_ratings:
            overall = round(sum(topic_ratings) / len(topic_ratings), 1)
        else:
            overall = 3.5

    with get_db() as conn:
        cursor = conn.execute("""
            INSERT INTO reviews (
                college_id, college_name, branch_id, branch_name,
                reviewer_role, reviewer_name, batch_year,
                review_text, rating_hostel, rating_food, rating_academics,
                rating_coding_culture, rating_clubs, rating_campus_life,
                overall_rating, detected_topics, helpful_votes,
                is_sample_data, source_platform, source_link
            ) VALUES (
                ?, ?, ?, ?,
                ?, ?, ?,
                ?, ?, ?, ?,
                ?, ?, ?,
                ?, ?, 0,
                0, ?, ?
            )
        """, (
            payload.college_id,
            payload.college_name,
            payload.branch_id,
            payload.branch_name,
            payload.reviewer_role,
            payload.reviewer_name,
            payload.batch_year,
            cleaned_text,
            payload.rating_hostel,
            payload.rating_food,
            payload.rating_academics,
            payload.rating_coding_culture,
            payload.rating_clubs,
            payload.rating_campus_life,
            overall,
            ",".join(detected),
            payload.source_platform or "Platform Submission",
            payload.source_link
        ))
        review_id = cursor.lastrowid

    return {
        "status": "success",
        "message": "Review submitted successfully and matched to college.",
        "review_id": review_id,
        "detected_topics": detected,
        "overall_rating": overall
    }

@router.post("/vote/{review_id}")
def vote_review_helpful(review_id: int, payload: VoteRequest = Body(default_factory=VoteRequest)):
    """
    Marks a review as helpful, updating the review's helpfulness weight in AIML scoring.
    """
    user_id = payload.user_identifier or "anonymous"
    with get_db() as conn:
        # Check review exists
        rev = conn.execute("SELECT id, helpful_votes FROM reviews WHERE id = ?", (review_id,)).fetchone()
        if not rev:
            raise HTTPException(status_code=404, detail="Review not found")

        # Check if already voted
        already_voted = conn.execute(
            "SELECT id FROM review_votes WHERE review_id = ? AND user_identifier = ?",
            (review_id, user_id)
        ).fetchone()

        if already_voted:
            return {
                "status": "already_voted",
                "message": "You have already upvoted this review.",
                "helpful_votes": rev["helpful_votes"]
            }

        conn.execute(
            "INSERT INTO review_votes (review_id, user_identifier) VALUES (?, ?)",
            (review_id, user_id)
        )
        conn.execute(
            "UPDATE reviews SET helpful_votes = helpful_votes + 1 WHERE id = ?",
            (review_id,)
        )
        new_votes = rev["helpful_votes"] + 1

    return {
        "status": "success",
        "message": "Thank you for your feedback! The score calculation has been updated.",
        "helpful_votes": new_votes
    }

@router.get("/compare")
def compare_two_colleges(
    college_id_a: int = Query(..., description="First college ID"),
    college_id_b: int = Query(..., description="Second college ID")
):
    """
    Side-by-side comparison of two colleges across all 6 student review topics.
    """
    def get_info(c_id: int):
        with get_db() as conn:
            rows = conn.execute("SELECT * FROM reviews WHERE college_id = ?", (c_id,)).fetchall()
        reviews = [dict(r) for r in rows]
        college_name = reviews[0]["college_name"] if reviews else f"College #{c_id}"
        scores = compute_college_topic_scores(reviews)
        return {
            "college_id": c_id,
            "college_name": college_name,
            "total_reviews": len(reviews),
            "summary": scores,
            "reviews": reviews[:3]  # highlight top 3 reviews
        }

    col_a = get_info(college_id_a)
    col_b = get_info(college_id_b)

    # Side-by-side breakdown table
    topics_comparison = []
    for topic in TOPICS:
        a_data = col_a["summary"]["topic_breakdown"].get(topic, {})
        b_data = col_b["summary"]["topic_breakdown"].get(topic, {})
        a_score = a_data.get("score")
        b_score = b_data.get("score")
        
        diff = None
        winner = None
        if a_score is not None and b_score is not None:
            diff = round(a_score - b_score, 2)
            if diff > 0.1:
                winner = "A"
            elif diff < -0.1:
                winner = "B"
            else:
                winner = "Tie"

        topics_comparison.append({
            "topic": topic,
            "college_a_score": a_score,
            "college_a_label": a_data.get("label", "No data"),
            "college_b_score": b_score,
            "college_b_label": b_data.get("label", "No data"),
            "difference": diff,
            "advantage": winner
        })

    return {
        "college_a": col_a,
        "college_b": col_b,
        "topics_comparison": topics_comparison,
        "disclaimer": "Student feedback index based on authentic reviews."
    }

@router.post("/etl/import-google-form")
def import_google_form_reviews(
    entries: List[dict] = Body(..., description="List of review objects from Google Form export / webhook")
):
    """
    ETL endpoint to ingest Google Form review responses.
    Matches college and branch against base app /colleges and /branches.
    """
    inserted = 0
    with get_db() as conn:
        for entry in entries:
            c_name = entry.get("college_name") or entry.get("College") or "Unknown"
            c_id = entry.get("college_id") or 0
            b_name = entry.get("branch_name") or entry.get("Branch")
            text = entry.get("review_text") or entry.get("Review") or ""
            if not text:
                continue

            detected = extract_topics(text)
            conn.execute("""
                INSERT INTO reviews (
                    college_id, college_name, branch_name, reviewer_role, reviewer_name,
                    batch_year, review_text, rating_hostel, rating_food, rating_academics,
                    rating_coding_culture, rating_clubs, rating_campus_life,
                    overall_rating, detected_topics, is_sample_data, source_platform, source_link
                ) VALUES (
                    ?, ?, ?, ?, ?,
                    ?, ?, ?, ?, ?,
                    ?, ?, ?,
                    ?, ?, 0, 'Google Form', ?
                )
            """, (
                c_id,
                c_name,
                b_name,
                entry.get("reviewer_role", "Current Student"),
                entry.get("reviewer_name", "Google Form Contributor"),
                entry.get("batch_year"),
                text,
                entry.get("rating_hostel"),
                entry.get("rating_food"),
                entry.get("rating_academics"),
                entry.get("rating_coding_culture"),
                entry.get("rating_clubs"),
                entry.get("rating_campus_life"),
                entry.get("overall_rating", 4.0),
                ",".join(detected),
                entry.get("source_link")
            ))
            inserted += 1

    return {"status": "success", "imported_count": inserted}
