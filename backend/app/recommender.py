import re
from functools import lru_cache

from . import crud
from .config import (
    EMBEDDING_MODEL,
    QDRANT_COLLECTION,
    QDRANT_STORAGE_PATH,
    QDRANT_URL,
)
from .models import Branch, College


@lru_cache(maxsize=1)
def get_model():
    from sentence_transformers import SentenceTransformer

    return SentenceTransformer(EMBEDDING_MODEL)


@lru_cache(maxsize=1)
def get_qdrant():
    from qdrant_client import QdrantClient

    if QDRANT_URL:
        return QdrantClient(url=QDRANT_URL)
    return QdrantClient(path=str(QDRANT_STORAGE_PATH))


_BRANCH_KEYWORD_GROUPS = [
    (
        ["cse", "computer", "cs", "software", "coding", "programming", "developer", "it", "information technology"],
        ["computer", "cse", "software", "artificial", "data science", "machine learning", "computational", "computing", "information"],
    ),
    (
        ["ece", "electronics", "telecommunication", "vlsi", "ic design", "microelectronics"],
        ["electronics", "ece", "ic", "vlsi", "microelectronics", "telecommunication"],
    ),
    (
        ["ee", "eee", "electrical"],
        ["electrical", "ee", "eee"],
    ),
    (
        ["finance", "fintech", "quant", "economics", "mathematics", "mnc"],
        ["finance", "quantitative", "fintech", "economics", "mathematics", "mnc"],
    ),
    (
        ["mechanical", "mech", "aerospace", "mechatronics", "robotics"],
        ["mechanical", "aerospace", "mechatronics", "robotics", "automotive"],
    ),
    (
        ["civil"],
        ["civil", "infrastructure", "construction"],
    ),
    (
        ["chemical"],
        ["chemical", "biochemical", "petroleum"],
    ),
    (
        ["biotech", "biotechnology", "bio", "biomedical", "biosciences"],
        ["biotech", "bio", "biosciences", "biomedical"],
    ),
    (
        ["circuital"],
        ["electrical", "electronics", "ece", "ee", "eee", "instrumentation", "ic", "vlsi", "microelectronics", "telecommunication"],
    ),
    (
        ["core", "core branches", "core engineering"],
        ["mechanical", "civil", "electrical", "chemical", "production", "industrial", "metallurgical", "metallurgy", "materials", "aerospace", "aeronautical", "mining", "ceramic", "textile", "physics", "environmental", "biotech", "biotechnology", "bio", "ee", "eee", "ocean", "naval", "agricultural", "food", "petroleum", "geological", "geophysics"],
    ),
]


def _matches(text: str, keywords: list) -> bool:
    for keyword in keywords:
        if len(keyword) <= 3:
            if re.search(rf"\b{re.escape(keyword)}\b", text):
                return True
        elif keyword in text:
            return True
    return False


def _allowed_branch_keywords(user_query: str, profile: dict | None, category: str) -> list:
    query = user_query.strip() or (profile or {}).get("vector_query", "").strip()
    if not query:
        return []

    text = f"{query.lower()} {category.lower()}"
    allowed = []
    for triggers, keywords in _BRANCH_KEYWORD_GROUPS:
        if _matches(text, triggers):
            allowed.extend(keywords)
    return list(set(allowed))


def calculate_hybrid_score(v_score: float, payload: dict, profile: dict) -> float:
    score = v_score

    pref_states = profile.get("preferred_states", [])
    if pref_states:
        college_name = payload.get("college_name", "")
        state = payload.get("state") or crud.get_college_state(college_name)
        if state and any(
            isinstance(ps, str) and ps.strip().lower() == state.lower()
            for ps in pref_states
        ):
            score += 0.05

    if profile.get("coding_culture"):
        clubs = payload.get("student_clubs", [])
        coding_keywords = ["coding", "programming", "software", "hackathon", "ai", "machine learning", "robotics", "cyber"]
        if any(any(kw in club.lower() for kw in coding_keywords) for club in clubs):
            score += 0.15

    if profile.get("startup_culture"):
        incubator = payload.get("incubation_center_name")
        startups = payload.get("notable_startups", [])
        if (incubator and incubator.strip()) or len(startups) >= 2:
            score += 0.02

    if profile.get("research"):
        nirf = payload.get("nirf_rank")
        if isinstance(nirf, int) and nirf <= 10:
            score += 0.02

    if profile.get("placements"):
        avg_ctc = payload.get("average_ctc")
        median_ctc = payload.get("median_ctc")
        placement_pct = payload.get("placement_percentage")

        ctc = avg_ctc if isinstance(avg_ctc, (int, float)) else median_ctc
        pct = placement_pct if isinstance(placement_pct, (int, float)) else None

        if (ctc and ctc >= 20.0) or (pct and pct >= 90.0):
            score += 0.03
        elif (ctc and ctc >= 15.0) or (pct and pct >= 80.0):
            score += 0.01

    if profile.get("campus_life"):
        sports = payload.get("sports_infrastructure", [])
        clubs = payload.get("student_clubs", [])
        if len(sports) + len(clubs) >= 12:
            score += 0.02

    return score


def _eligible_branch_ids(db, rank, category, exam_type, homestate, adv_rank, ignore_rank):
    if adv_rank is not None:
        if ignore_rank:
            branches = (
                crud.get_all_branches_with_cutoffs(db, category, "Advanced", homestate)
                + crud.get_all_branches_with_cutoffs(db, category, "Mains", homestate)
            )
            return [item["branch"].id for item in branches]

        advanced = crud.get_eligible_branch_ids(db, adv_rank, category, "Advanced", homestate)
        mains = crud.get_eligible_branch_ids(db, rank, category, "Mains", homestate)
        return list(set(advanced + mains))

    if ignore_rank:
        branches = crud.get_all_branches_with_cutoffs(db, category, exam_type, homestate)
        return [item["branch"].id for item in branches]

    return crud.get_eligible_branch_ids(db, rank, category, exam_type, homestate)


def _recommendation(db, branch, category, homestate, similarity_score):
    cutoff_2024, cutoff_2025 = crud.get_branch_cutoffs_by_year(
        db, branch.id, category, homestate=homestate
    )
    return {
        "college_name": branch.college.college_name,
        "branch_name": branch.branch_name,
        "category": category,
        "closing_rank": cutoff_2025 if cutoff_2025 is not None else cutoff_2024,
        "closing_rank_2024": cutoff_2024,
        "closing_rank_2025": cutoff_2025,
        "placement_percentage": branch.placement_percentage,
        "avg_ctc": branch.average_ctc_lpa,
        "median_ctc": branch.median_ctc_lpa,
        "similarity_score": similarity_score,
        "nirf_rank": branch.college.nirf_rank,
    }


def _sort_key(rec):
    rank = rec["closing_rank"]
    return rank if rank is not None else float("inf")


def recommend(
    db,
    rank: int,
    category: str,
    profile: dict | None = None,
    exam_type: str = "Advanced",
    homestate: str = "",
    user_query: str = "",
    ignore_rank: bool = False,
    adv_rank: int | None = None,
):
    eligible_branch_ids = _eligible_branch_ids(
        db, rank, category, exam_type, homestate, adv_rank, ignore_rank
    )
    if not eligible_branch_ids:
        return {"profile": profile or {}, "recommendations": []}

    if profile is None or not profile.get("vector_query", "").strip():
        branches = (
            db.query(Branch)
            .join(College, Branch.college_id == College.id)
            .filter(Branch.id.in_(eligible_branch_ids))
            .all()
        )
        recommendations = [
            _recommendation(db, branch, category, homestate, 0.0)
            for branch in branches
        ]
        recommendations.sort(key=_sort_key)
        return {"profile": profile or {}, "recommendations": recommendations}

    from qdrant_client.models import Filter, HasIdCondition

    query_vector = get_model().encode(profile["vector_query"])
    results = get_qdrant().query_points(
        collection_name=QDRANT_COLLECTION,
        query=query_vector.tolist(),
        query_filter=Filter(must=[HasIdCondition(has_id=eligible_branch_ids)]),
        limit=500 if ignore_rank else 250,
    )

    scored = [
        (point, calculate_hybrid_score(point.score, point.payload, profile))
        for point in results.points
    ]
    scored.sort(key=lambda item: item[1], reverse=True)

    allowed = _allowed_branch_keywords(user_query, profile, category)
    candidates = [
        (point, score)
        for point, score in scored
        if not allowed or _matches(point.payload.get("branch_name", "").lower(), allowed)
    ]
    top_candidates = candidates[:500 if ignore_rank else 120]

    recommendations = []
    for point, score in top_candidates:
        branch = crud.get_branch_by_id(db, point.id)
        if branch is not None:
            recommendations.append(
                _recommendation(db, branch, category, homestate, score)
            )
    recommendations.sort(key=_sort_key)
    return {"profile": profile, "recommendations": recommendations}
