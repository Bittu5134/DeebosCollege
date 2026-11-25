import math
import re
from datetime import datetime, timezone

# The 6 core topics required by the proposal:
# hostel, food, academics, coding culture, clubs, campus life
TOPICS = [
    "hostel",
    "food",
    "academics",
    "coding culture",
    "clubs",
    "campus life",
]

# Topic keywords for simple keyword rules as specified in the AIML component
TOPIC_KEYWORDS = {
    "hostel": [
        "hostel", "hostels", "dorm", "dorms", "dormitory", "room", "rooms", "roommate",
        "washroom", "washrooms", "bathroom", "bathrooms", "geyser", "lan", "wifi in room",
        "cleaning", "single room", "double room", "triple room", "hall of residence", "bh1", "gh1",
        "warden", "curfew", "in-time"
    ],
    "food": [
        "food", "mess", "canteen", "cafeteria", "caterer", "breakfast", "lunch", "dinner",
        "snacks", "meal", "meals", "non-veg", "veg", "hygiene", "taste", "menu", "dhaba", "night canteen"
    ],
    "academics": [
        "academic", "academics", "prof", "profs", "professor", "professors", "faculty",
        "curriculum", "course", "courses", "grading", "relative grading", "cgpa", "exam", "exams",
        "midsem", "endsem", "quiz", "quizzes", "assignment", "assignments", "labs", "attendance",
        "75% attendance", "research", "teaching"
    ],
    "coding culture": [
        "coding", "code", "coder", "coders", "competitive programming", "cp", "codeforces",
        "leetcode", "hackathon", "hackathons", "gsoc", "icpc", "development", "dev", "web dev",
        "open source", "algorithms", "dsa", "tech culture", "software", "github"
    ],
    "clubs": [
        "club", "clubs", "society", "societies", "cultural club", "technical club", "dance club",
        "music club", "dramatics", "robotics", "ecell", "e-cell", "entrepreneurship", "finance club",
        "fest", "fests", "cultural fest", "tech fest", "mood indigo", "antargyan", "rendezvous"
    ],
    "campus life": [
        "campus", "campus life", "greenery", "sprawling", "infrastructure", "sports", "ground",
        "gym", "swimming pool", "library", "nightlife", "peer group", "peers", "friends", "crowd",
        "environment", "peaceful", "city connectivity", "location", "weather", "freedom"
    ],
}

def extract_topics(text: str) -> list[str]:
    """
    Simple keyword rules to tag written reviews by topic.
    Returns matched topic names from the standard 6 topics.
    """
    if not text:
        return []
    clean_text = text.lower()
    matched = []
    for topic, keywords in TOPIC_KEYWORDS.items():
        for kw in keywords:
            # Word boundary matching where appropriate or simple inclusion
            pattern = r'\b' + re.escape(kw) + r'\b' if len(kw) <= 4 else re.escape(kw)
            if re.search(pattern, clean_text):
                matched.append(topic)
                break
    return matched

def compute_college_topic_scores(reviews: list[dict]) -> dict:
    """
    Computes weighted scores per topic for a college:
    - Topic score: 1.0 to 5.0
    - Gives more weight to recent reviews (exponential recency decay)
    - Gives more weight to reviews marked helpful by other users: (1 + log(1 + helpful_votes))
    - Dynamic: changes as new reviews and votes arrive
    - Presented as summaries of user opinion, not official ratings.
    """
    if not reviews:
        return {
            topic: {
                "score": None,
                "label": "No reviews yet",
                "review_count": 0,
                "raw_weighted_sum": 0.0,
            }
            for topic in TOPICS
        }

    now = datetime.now(timezone.utc)
    
    # Rating field map for each topic
    rating_field_map = {
        "hostel": "rating_hostel",
        "food": "rating_food",
        "academics": "rating_academics",
        "coding culture": "rating_coding_culture",
        "clubs": "rating_clubs",
        "campus life": "rating_campus_life",
    }

    topic_accumulators = {
        topic: {"weighted_rating_sum": 0.0, "total_weight": 0.0, "count": 0}
        for topic in TOPICS
    }
    
    overall_weighted_rating_sum = 0.0
    overall_total_weight = 0.0
    overall_count = 0

    for rev in reviews:
        created_at_raw = rev.get("created_at")
        if isinstance(created_at_raw, str):
            try:
                # Handle ISO format or SQLite datetime
                created_at = datetime.fromisoformat(created_at_raw.replace("Z", "+00:00"))
                if created_at.tzinfo is None:
                    created_at = created_at.replace(tzinfo=timezone.utc)
            except Exception:
                created_at = now
        elif isinstance(created_at_raw, datetime):
            created_at = created_at_raw if created_at_raw.tzinfo else created_at_raw.replace(tzinfo=timezone.utc)
        else:
            created_at = now

        # Recency decay weight: half-life of 180 days (half a year)
        days_old = max(0, (now - created_at).total_seconds() / 86400.0)
        recency_weight = math.exp(-0.693 * (days_old / 180.0))
        # Clamp minimum recency weight to 0.25 so older reviews don't vanish completely
        recency_weight = max(0.25, recency_weight)

        # Helpful votes weight: (1 + 0.5 * ln(1 + votes))
        helpful_votes = max(0, int(rev.get("helpful_votes") or 0))
        helpfulness_weight = 1.0 + 0.5 * math.log(1.0 + helpful_votes)

        # Combined weight for this review
        w = recency_weight * helpfulness_weight

        # Check overall rating
        ovr = rev.get("overall_rating")
        if ovr is not None and ovr > 0:
            overall_weighted_rating_sum += ovr * w
            overall_total_weight += w
            overall_count += 1

        # Check each topic rating
        for topic in TOPICS:
            field_name = rating_field_map[topic]
            topic_rating = rev.get(field_name)
            
            # If explicit topic rating is missing but detected_topics includes this topic and overall_rating is present:
            if topic_rating is None or topic_rating <= 0:
                topics_tagged = rev.get("detected_topics") or []
                if isinstance(topics_tagged, str):
                    topics_tagged = [t.strip().lower() for t in topics_tagged.split(",") if t.strip()]
                if topic in topics_tagged and ovr:
                    topic_rating = ovr

            if topic_rating is not None and topic_rating > 0:
                topic_accumulators[topic]["weighted_rating_sum"] += topic_rating * w
                topic_accumulators[topic]["total_weight"] += w
                topic_accumulators[topic]["count"] += 1

    def score_to_sentiment_label(score: float | None) -> str:
        if score is None:
            return "No data"
        if score >= 4.5:
            return "Exceptional"
        if score >= 4.0:
            return "Very Positive"
        if score >= 3.5:
            return "Positive"
        if score >= 3.0:
            return "Satisfactory"
        if score >= 2.5:
            return "Mixed"
        if score >= 2.0:
            return "Needs Improvement"
        return "Critical"

    topic_results = {}
    for topic in TOPICS:
        acc = topic_accumulators[topic]
        if acc["total_weight"] > 0:
            final_score = round(acc["weighted_rating_sum"] / acc["total_weight"], 2)
            # Bound score between 1.0 and 5.0
            final_score = max(1.0, min(5.0, final_score))
            topic_results[topic] = {
                "score": final_score,
                "label": score_to_sentiment_label(final_score),
                "review_count": acc["count"],
            }
        else:
            topic_results[topic] = {
                "score": None,
                "label": "No data",
                "review_count": 0,
            }

    overall_score = None
    if overall_total_weight > 0:
        overall_score = round(overall_weighted_rating_sum / overall_total_weight, 2)
        overall_score = max(1.0, min(5.0, overall_score))

    return {
        "overall_score": overall_score,
        "overall_label": score_to_sentiment_label(overall_score),
        "total_reviews": len(reviews),
        "sample_reviews_count": sum(1 for r in reviews if r.get("is_sample_data")),
        "verified_student_reviews_count": len(reviews),
        "topic_breakdown": topic_results,
        "summary_disclaimer": "Student feedback index based on authentic reviews.",
    }
