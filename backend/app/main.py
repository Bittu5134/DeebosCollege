import csv
import hashlib
import io
import json
import logging
import os
import time
import urllib.parse

import uvicorn
from fastapi import FastAPI, Depends, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sqlalchemy import func
from sqlalchemy.orm import Session

from . import crud
from .config import DATA_DIR
from .database import Base, engine, get_db
from .llm import extract_preferences, generate_followup_questions, generate_multiple_explanations, extract_profile_and_questions
from .models import College, Branch, UserSearch
from .recommender import recommend
from .schemas import RecommendationRequest, FollowupRequest
from .reviews.routes import router as reviews_router

logger = logging.getLogger(__name__)

_extract_preferences_llm = extract_preferences
_generate_followup_questions_llm = generate_followup_questions
_BLANK_PROFILE_KEYS = ["startup_culture", "coding_culture", "research", "placements", "campus_life",
                       "hostel_quality", "sports", "extra_curriculars", "infrastructure", "diversity",
                       "location_proximity", "branch_over_college"]


def extract_preferences(user_text, home_state):
    try:
        return _extract_preferences_llm(user_text, home_state)
    except Exception as e:
        logger.error("LLM preference extraction failed, using raw query: %s", e)
        profile = {k: False for k in _BLANK_PROFILE_KEYS}
        profile.update(preferred_states=[], vector_query=user_text)
        return profile


def generate_followup_questions(profile):
    try:
        return _generate_followup_questions_llm(profile)
    except Exception as e:
        logger.error("LLM follow-up generation failed: %s", e)
        return []

# ---------------------------------------------------------------------------
# College metadata loader (original: by-ID folder lookup)
# ---------------------------------------------------------------------------

def load_college_json(college_id: int):
    colleges_data_dir = DATA_DIR / "Colleges_data"
    structured_json_dir = DATA_DIR / "structured_json"

    if not colleges_data_dir.exists():
        return {}

    for folder in os.listdir(colleges_data_dir):
        if folder.startswith(f"{college_id}_"):
            parts = folder.split("_")
            json_name = "_".join(parts[1:]) + ".json"
            for root, dirs, files in os.walk(structured_json_dir):
                if json_name in files:
                    try:
                        with open(os.path.join(root, json_name), "r", encoding="utf-8") as f:
                            return json.load(f)
                    except Exception:
                        return {}
    return {}


# ---------------------------------------------------------------------------
# Categorised preference list builder (original logic)
# ---------------------------------------------------------------------------

def build_categorized_preference_list(db: Session, rank: int, category: str, profile: dict, exam_type: str, homestate: str, original_recommendations: list, adv_rank: int | None = None):
    if adv_rank is not None:
        all_branches_with_cutoffs = crud.get_all_branches_with_cutoffs(db, category, "Advanced", homestate) + \
                                    crud.get_all_branches_with_cutoffs(db, category, "Mains", homestate)
    else:
        all_branches_with_cutoffs = crud.get_all_branches_with_cutoffs(db, category, exam_type, homestate)

    ai_recs_set = set()
    for rec in original_recommendations:
        ai_recs_set.add((rec["college_name"], rec["branch_name"]))

    final_recommendations = []
    for item in all_branches_with_cutoffs:
        branch = item["branch"]
        cutoff_2024 = item["2024"]
        cutoff_2025 = item["2025"]

        closing_rank = cutoff_2025 if cutoff_2025 is not None else cutoff_2024
        if closing_rank is None:
            continue

        college_name = branch.college.college_name
        branch_name = branch.branch_name
        is_ai_rec = (college_name, branch_name) in ai_recs_set
        if not is_ai_rec:
            continue

        is_iit = ("indian institute of technology" in college_name.lower() or
                  "iit " in college_name.lower() or
                  "(iit)" in college_name.lower() or
                  " iit " in college_name.lower())
        target_rank = (adv_rank if adv_rank is not None else rank) if is_iit else rank

        if closing_rank < 0.7 * target_rank:
            cat = "Super Dream"
        elif closing_rank < target_rank:
            cat = "Dream"
        elif closing_rank < 1.3 * target_rank:
            cat = "Best Match"
        elif closing_rank < 1.8 * target_rank:
            cat = "Realistic"
        else:
            cat = "Safe"

        similarity_score = 0.0
        if is_ai_rec:
            for r in original_recommendations:
                if r["college_name"] == college_name and r["branch_name"] == branch_name:
                    similarity_score = r.get("similarity_score", 0.0)
                    break

        final_recommendations.append({
            "college_name": college_name,
            "branch_name": branch_name,
            "category": cat,
            "is_ai_recommended": is_ai_rec,
            "closing_rank": closing_rank,
            "closing_rank_2024": cutoff_2024,
            "closing_rank_2025": cutoff_2025,
            "placement_percentage": branch.placement_percentage,
            "avg_ctc": branch.average_ctc_lpa,
            "median_ctc": branch.median_ctc_lpa,
            "similarity_score": similarity_score,
            "nirf_rank": branch.college.nirf_rank
        })

    category_order = {
        "Super Dream": 0,
        "Dream": 1,
        "Best Match": 2,
        "Realistic": 3,
        "Safe": 4
    }

    final_recommendations.sort(key=lambda x: (
        category_order.get(x["category"], 5),
        x["closing_rank"]
    ))

    return final_recommendations


def log_user_search(db: Session, rank: int, category: str, exam_type: str | None, homestate: str | None, query_text: str | None, authorization: str = None):
    alpha_id = None  # no accounts: searches are logged anonymously
    email = None

    try:
        search_log = UserSearch(
            user_id=alpha_id,
            email=email,
            rank=rank,
            category=category,
            exam_type=exam_type,
            homestate=homestate,
            query_text=query_text
        )
        db.add(search_log)
        db.commit()
    except Exception as e:
        logger.error("Error logging user search: %s", e)
        db.rollback()


# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------

Base.metadata.create_all(bind=engine)

app = FastAPI()


def _bootstrap_data():
    from .database import SessionLocal
    from .recommender import get_qdrant
    from .config import QDRANT_COLLECTION
    try:
        db = SessionLocal()
        empty = db.query(College).count() == 0
        db.close()
        if empty:
            logger.warning("Database empty: ingesting colleges...")
            from scripts import ingest_colleges
            ingest_colleges.main()
            crud.clear_cutoff_cache()
        if empty or not get_qdrant().collection_exists(QDRANT_COLLECTION):
            logger.warning("Building Qdrant embeddings...")
            from scripts import build_embeddings
            build_embeddings.main()
        logger.warning("Data ready.")
    except Exception as e:
        logger.error("Data bootstrap failed: %s", e)


@app.on_event("startup")
def _start_bootstrap():
    import threading
    threading.Thread(target=_bootstrap_data, daemon=True).start()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(reviews_router)


# ---------------------------------------------------------------------------
# Core endpoints
# ---------------------------------------------------------------------------

@app.get("/")
def root():
    return {
        "message": "Daddy's home ;)"
    }


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/colleges")
def get_colleges(db: Session = Depends(get_db)):
    return crud.get_all_colleges(db)


@app.get('/branches')
def get_branches(db: Session = Depends(get_db)):
    return crud.get_all_branches(db)


@app.get("/predict")
def predict(rank: int, category: str, homestate: str = "", db: Session = Depends(get_db)):
    colleges = crud.get_eligible_results(db, rank, category, homestate)
    return {
        "rank": rank,
        "eligible_colleges": colleges,
    }


@app.post("/recommend")
def recommend_colleges(request: RecommendationRequest, db: Session = Depends(get_db), authorization: str = Header(None)):
    log_user_search(
        db=db,
        rank=request.rank,
        category=request.category,
        exam_type=request.exam_type,
        homestate=request.homestate,
        query_text=request.query,
        authorization=authorization
    )
    if request.profile:
        profile = request.profile

        keywords_to_add = []
        if profile.get("extra_curriculars"):
            keywords_to_add.append("cultural fests student clubs societies extra-curricular activities events fests")
        if profile.get("infrastructure"):
            keywords_to_add.append("modern labs advanced library campus wifi classrooms facilities infrastructure")
        if profile.get("diversity"):
            keywords_to_add.append("peer diversity student demographics national integration diverse culture")
        if profile.get("location_proximity"):
            keywords_to_add.append("proximity home state accessibility connectivity location city convenience")
        if profile.get("sports"):
            keywords_to_add.append("sports infrastructure playground gym sports facilities athletics fitness")
        if profile.get("hostel_quality"):
            keywords_to_add.append("hostel rooms mess food residential accommodation campus stay")

        if keywords_to_add:
            existing_query = profile.get("vector_query", "")
            profile["vector_query"] = existing_query + " " + " ".join(keywords_to_add)
    elif not request.query.strip():
        profile = {
            "preferred_states": [],
            "startup_culture": False,
            "coding_culture": False,
            "research": False,
            "placements": False,
            "campus_life": False,
            "hostel_quality": False,
            "sports": False,
            "extra_curriculars": False,
            "infrastructure": False,
            "diversity": False,
            "location_proximity": False,
            "branch_over_college": False,
            "vector_query": ""
        }
    else:
        profile = extract_preferences(
            user_text=request.query,
            home_state=request.homestate
        )

    res = recommend(
        db=db,
        rank=request.rank,
        category=request.category,
        profile=profile,
        exam_type=request.exam_type,
        homestate=request.homestate,
        user_query=request.query,
        adv_rank=request.adv_rank
    )

    recommendations_list = res.get("recommendations", [])
    college_cache = {}
    for rec in recommendations_list:
        col_name = rec["college_name"]
        if col_name not in college_cache:
            db_college = db.query(College).filter(College.college_name == col_name).first()
            college_metadata = load_college_json(db_college.id) if db_college else {}
            college_cache[col_name] = college_metadata
        else:
            college_metadata = college_cache[col_name]

        rec["student_clubs"] = college_metadata.get("student_clubs", [])
        rec["sports_infrastructure"] = college_metadata.get("sports_infrastructure", [])
        rec["incubation_center_name"] = college_metadata.get("incubation_center_name")
        rec["notable_startups"] = college_metadata.get("notable_startups", [])

    recommendations = recommendations_list[:3]
    explanations = {}
    if recommendations and (profile.get("vector_query", "").strip() or any(profile.get(k) for k in profile if isinstance(profile[k], bool) and profile[k])):
        choices_metadata = []
        for idx, rec in enumerate(recommendations):
            choices_metadata.append({
                "id": idx,
                "college_name": rec["college_name"],
                "branch_name": rec["branch_name"],
                "avg_ctc": rec["avg_ctc"],
                "closing_rank": rec["closing_rank"],
                "student_clubs": rec["student_clubs"],
                "sports_infrastructure": rec["sports_infrastructure"],
                "incubation_center": rec["incubation_center_name"],
                "startups": rec["notable_startups"]
            })

        raw_explanations = generate_multiple_explanations(profile, choices_metadata)

        # Map back to exact keys
        for idx, rec in enumerate(recommendations):
            key_str = f"{rec['college_name']} | {rec['branch_name']}"
            explanation = raw_explanations.get(str(idx)) or raw_explanations.get(idx)
            if explanation:
                explanations[key_str] = explanation

    res["ai_explanations"] = explanations
    res["ai_explanation"] = list(explanations.values())[0] if explanations else ""
    return res


@app.post("/generate-questions")
def generate_questions(request: FollowupRequest, authorization: str = Header(None)):

    if not request.query.strip():
        blank_profile = {
            "preferred_states": [],
            "startup_culture": False,
            "coding_culture": False,
            "research": False,
            "placements": False,
            "campus_life": False,
            "hostel_quality": False,
            "sports": False,
            "extra_curriculars": False,
            "infrastructure": False,
            "diversity": False,
            "location_proximity": False,
            "branch_over_college": False,
            "vector_query": ""
        }
        questions = generate_followup_questions(blank_profile)
        return {
            "profile": blank_profile,
            "questions": questions
        }
    # One LLM round trip instead of two; fall back to the two-call path if it fails.
    try:
        combined = extract_profile_and_questions(request.query, request.homestate)
        return {"profile": combined["profile"], "questions": combined["questions"]}
    except Exception as e:
        logger.error("Combined profile+questions call failed, using two calls: %s", e)
    profile = extract_preferences(request.query, request.homestate)
    questions = generate_followup_questions(profile)
    return {
        "profile": profile,
        "questions": questions
    }


@app.post("/export-choices")
def export_choices(request: RecommendationRequest, db: Session = Depends(get_db), authorization: str = Header(None)):
    log_user_search(
        db=db,
        rank=request.rank,
        category=request.category,
        exam_type=request.exam_type,
        homestate=request.homestate,
        query_text=request.query,
        authorization=authorization
    )
    if request.profile:
        profile = request.profile
        keywords_to_add = []
        if profile.get("extra_curriculars"):
            keywords_to_add.append("cultural fests student clubs societies extra-curricular activities events fests")
        if profile.get("infrastructure"):
            keywords_to_add.append("modern labs advanced library campus wifi classrooms facilities infrastructure")
        if profile.get("diversity"):
            keywords_to_add.append("peer diversity student demographics national integration diverse culture")
        if profile.get("location_proximity"):
            keywords_to_add.append("proximity home state accessibility connectivity location city convenience")
        if profile.get("sports"):
            keywords_to_add.append("sports infrastructure playground gym sports facilities athletics fitness")
        if profile.get("hostel_quality"):
            keywords_to_add.append("hostel rooms mess food residential accommodation campus stay")

        if keywords_to_add:
            existing_query = profile.get("vector_query", "")
            profile["vector_query"] = existing_query + " " + " ".join(keywords_to_add)
    elif not request.query.strip():
        profile = {
            "preferred_states": [],
            "startup_culture": False,
            "coding_culture": False,
            "research": False,
            "placements": False,
            "campus_life": False,
            "hostel_quality": False,
            "sports": False,
            "extra_curriculars": False,
            "infrastructure": False,
            "diversity": False,
            "location_proximity": False,
            "branch_over_college": False,
            "vector_query": ""
        }
    else:
        profile = extract_preferences(
            user_text=request.query,
            home_state=request.homestate
        )

    res = recommend(
        db=db,
        rank=request.rank,
        category=request.category,
        profile=profile,
        exam_type=request.exam_type,
        homestate=request.homestate,
        user_query=request.query,
        ignore_rank=True,
        adv_rank=request.adv_rank
    )
    recommended_list = res.get("recommendations", [])

    choices_to_export = build_categorized_preference_list(
        db=db,
        rank=request.rank,
        category=request.category,
        profile=profile,
        exam_type=request.exam_type or "Advanced",
        homestate=request.homestate,
        original_recommendations=recommended_list,
        adv_rank=request.adv_rank
    )

    output = io.StringIO()

    output.write('\ufeff')
    writer = csv.writer(output)

    writer.writerow([
        "Choice Number",
        "College Name",
        "Branch Name",
        "Closing Rank 2025",
        "Closing Rank 2024",
        "Category",
        "AI Recommended",
        "Average Package (LPA)",
        "Placement %"
    ])

    for idx, choice in enumerate(choices_to_export):
        writer.writerow([
            idx + 1,
            choice["college_name"],
            choice["branch_name"],
            choice["closing_rank_2025"] if choice["closing_rank_2025"] is not None else "N/A",
            choice["closing_rank_2024"] if choice["closing_rank_2024"] is not None else "N/A",
            choice["category"],
            "Yes" if choice["is_ai_recommended"] else "No",
            choice["avg_ctc"] if choice["avg_ctc"] else "N/A",
            choice["placement_percentage"] if choice["placement_percentage"] else "N/A"
        ])

    csv_data = output.getvalue()
    output.close()

    return StreamingResponse(
        io.BytesIO(csv_data.encode("utf-8")),
        media_type="text/csv",
        headers={
            "Content-Disposition": "attachment; filename=josaa_choice_list.csv"
        }
    )


@app.get("/statistics")
def get_global_statistics(db: Session = Depends(get_db), authorization: str = Header(None)):
    is_authorized = True

    if not is_authorized:
        raise HTTPException(status_code=403, detail="Access denied. Only developers can view statistics.")

    try:
        total_searches = db.query(UserSearch).count()
        logged_in_searches = db.query(UserSearch).filter(UserSearch.user_id != None).count()
        guest_searches = total_searches - logged_in_searches
        unique_users = db.query(UserSearch.user_id).filter(UserSearch.user_id != None).distinct().count()

        exam_types_query = db.query(UserSearch.exam_type, func.count(UserSearch.id)).group_by(UserSearch.exam_type).all()
        exam_distribution = {et or "Unknown": count for et, count in exam_types_query}

        categories_query = db.query(UserSearch.category, func.count(UserSearch.id)).group_by(UserSearch.category).all()
        category_distribution = {cat or "Unknown": count for cat, count in categories_query}

        states_query = db.query(UserSearch.homestate, func.count(UserSearch.id)).group_by(UserSearch.homestate).order_by(func.count(UserSearch.id).desc()).limit(5).all()
        state_distribution = {state or "Unknown": count for state, count in states_query}

        top_colleges = db.query(College).filter(College.overall_average_ctc != None).order_by(College.overall_average_ctc.desc()).limit(5).all()
        college_placement_stats = [
            {
                "college_name": col.college_name,
                "nirf_rank": col.nirf_rank,
                "avg_ctc": col.overall_average_ctc,
                "placement_pct": col.overall_placement_percentage
            } for col in top_colleges
        ]

        top_branches = db.query(Branch).filter(Branch.average_ctc_lpa != None).order_by(Branch.average_ctc_lpa.desc()).limit(5).all()
        branch_placement_stats = [
            {
                "college_name": br.college.college_name,
                "branch_name": br.branch_name,
                "avg_ctc": br.average_ctc_lpa,
                "placement_pct": br.placement_percentage
            } for br in top_branches
        ]

        return {
            "total_searches": total_searches,
            "logged_in_searches": logged_in_searches,
            "guest_searches": guest_searches,
            "unique_users": unique_users,
            "exam_distribution": exam_distribution,
            "category_distribution": category_distribution,
            "state_distribution": state_distribution,
            "college_placement_stats": college_placement_stats,
            "branch_placement_stats": branch_placement_stats
        }
    except Exception as e:
        logger.error("Error computing statistics: %s", e)
        raise HTTPException(status_code=500, detail="Failed to fetch statistics")


if __name__ == "__main__":
    uvicorn.run("app.main:app", host='0.0.0.0', port=8000)
