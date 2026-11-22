import csv
import hashlib
import io
import logging
import time
import urllib.parse

import uvicorn
from fastapi import FastAPI, Depends, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sqlalchemy import func
from sqlalchemy.orm import Session

from . import crud, data_loader
from .auth import create_session_token, enforce_authentication, get_user_from_token
from .config import ALLOWED_ORIGINS
from .database import Base, engine, get_db
from .llm import extract_preferences, generate_followup_questions, generate_multiple_explanations
from .models import College, Branch, UserSearch
from .recommender import recommend
from .schemas import RecommendationRequest, FollowupRequest, LoginRequest

logger = logging.getLogger(__name__)


def build_categorized_preference_list(db: Session, rank: int, category: str, exam_type: str, homestate: str, original_recommendations: list, adv_rank: int | None = None):
    if adv_rank is not None:
        all_branches_with_cutoffs = crud.get_all_branches_with_cutoffs(db, category, "Advanced", homestate) + \
                                    crud.get_all_branches_with_cutoffs(db, category, "Mains", homestate)
    else:
        all_branches_with_cutoffs = crud.get_all_branches_with_cutoffs(db, category, exam_type, homestate)

    ai_scores = {
        (rec["college_name"], rec["branch_name"]): rec.get("similarity_score", 0.0)
        for rec in original_recommendations
    }

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
        key = (college_name, branch_name)
        if key not in ai_scores:
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

        final_recommendations.append({
            "college_name": college_name,
            "branch_name": branch_name,
            "category": cat,
            "is_ai_recommended": True,
            "closing_rank": closing_rank,
            "closing_rank_2024": cutoff_2024,
            "closing_rank_2025": cutoff_2025,
            "placement_percentage": branch.placement_percentage,
            "avg_ctc": branch.average_ctc_lpa,
            "median_ctc": branch.median_ctc_lpa,
            "similarity_score": ai_scores[key],
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


def _base_profile() -> dict:
    return {
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


def _apply_profile_keywords(profile: dict) -> dict:
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

    return profile


def _build_profile(request: RecommendationRequest) -> dict:
    if request.profile:
        return _apply_profile_keywords(dict(request.profile))
    if not request.query.strip():
        return _base_profile()

    try:
        return extract_preferences(
            user_text=request.query,
            home_state=request.homestate
        )
    except Exception as e:
        logger.error("Preference extraction failed: %s", e)
        profile = _base_profile()
        profile["vector_query"] = request.query
        return profile


def _attach_college_metadata(rec: dict) -> dict:
    metadata = data_loader.get_college_metadata(rec["college_name"])
    rec["student_clubs"] = metadata.get("student_clubs", [])
    rec["sports_infrastructure"] = metadata.get("sports_infrastructure", [])
    rec["incubation_center_name"] = metadata.get("incubation_center_name")
    rec["notable_startups"] = metadata.get("notable_startups", [])
    return rec


def log_user_search(db: Session, rank: int, category: str, exam_type: str | None, homestate: str | None, query_text: str | None, authorization: str = None):
    alpha_id = None
    email = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
        user = get_user_from_token(token)
        if user:
            alpha_id = user.get("alpha_id")
            email = user.get("email")

    try:
        search_log = UserSearch(
            alpha_id=alpha_id,
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


Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="BranchWise API",
    version="1.0.0",
    description="JEE college recommendation API"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/auth/login")
def auth_login(request: LoginRequest):
    email = request.email.strip()
    name = request.name.strip() or "Student"

    if not email:
        raise HTTPException(status_code=400, detail="Email is required.")

    user_id = hashlib.sha256(email.lower().encode('utf-8')).hexdigest()[:12]
    user_info = {
        "alpha_id": user_id,
        "email": email,
        "username": name,
        "profile": {
            "display_name": name,
            "avatar_url": f"https://api.dicebear.com/7.x/initials/svg?seed={urllib.parse.quote(name)}"
        },
        "exp": time.time() + 30 * 24 * 3600
    }
    local_session_token = create_session_token(user_info)
    return {
        "access_token": local_session_token,
        "user": user_info
    }


@app.get("/")
def root():
    return {
        "service": "BranchWise API",
        "version": "1.0.0",
        "status": "ok"
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
    enforce_authentication(authorization)
    log_user_search(
        db=db,
        rank=request.rank,
        category=request.category,
        exam_type=request.exam_type,
        homestate=request.homestate,
        query_text=request.query,
        authorization=authorization
    )

    profile = _build_profile(request)

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
    for rec in recommendations_list:
        _attach_college_metadata(rec)

    recommendations = recommendations_list[:3]
    explanations = {}
    if recommendations and (profile.get("vector_query", "").strip() or any(
        isinstance(value, bool) and value for value in profile.values()
    )):
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

        try:
            raw_explanations = generate_multiple_explanations(profile, choices_metadata)
        except Exception as e:
            logger.error("Explanation generation failed: %s", e)
            raw_explanations = {}

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
    enforce_authentication(authorization)

    if not request.query.strip():
        profile = _base_profile()
    else:
        try:
            profile = extract_preferences(request.query, request.homestate)
        except Exception as e:
            logger.error("Preference extraction failed: %s", e)
            profile = _base_profile()
            profile["vector_query"] = request.query

    try:
        questions = generate_followup_questions(profile)
    except Exception as e:
        logger.error("Follow-up question generation failed: %s", e)
        questions = []

    return {
        "profile": profile,
        "questions": questions
    }


@app.post("/export-choices")
def export_choices(request: RecommendationRequest, db: Session = Depends(get_db), authorization: str = Header(None)):
    enforce_authentication(authorization)
    log_user_search(
        db=db,
        rank=request.rank,
        category=request.category,
        exam_type=request.exam_type,
        homestate=request.homestate,
        query_text=request.query,
        authorization=authorization
    )

    profile = _build_profile(request)

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
def get_global_statistics(db: Session = Depends(get_db)):
    try:
        total_searches = db.query(UserSearch).count()
        logged_in_searches = db.query(UserSearch).filter(UserSearch.alpha_id != None).count()
        guest_searches = total_searches - logged_in_searches
        unique_users = db.query(UserSearch.alpha_id).filter(UserSearch.alpha_id != None).distinct().count()

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
