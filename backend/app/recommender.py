from qdrant_client.models import (Filter,HasIdCondition)
from functools import lru_cache
from . import crud
from .config import EMBEDDING_MODEL, QDRANT_STORAGE_PATH, QDRANT_URL
import re


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

def calculate_hybrid_score(v_score: float, payload: dict, profile: dict) -> float:
    score = v_score

    pref_states = profile.get("preferred_states", [])
    if isinstance(pref_states, list) and pref_states:
        college_name = payload.get("college_name", "")
        state = payload.get("state") or crud.get_college_state(college_name)
        if state and any(ps.strip().lower() == state.lower() for ps in pref_states if isinstance(ps, str)):
            score += 0.05


    if profile.get("coding_culture"):
        clubs = payload.get("student_clubs", [])
        coding_club_keywords = ["coding", "programming", "software", "hackathon", "ai", "machine learning", "robotics", "cyber"]
        has_coding_club = False
        for club in clubs:
            if any(kw in club.lower() for kw in coding_club_keywords):
                has_coding_club = True
                break
        if has_coding_club:
            score += 0.15

    if profile.get("startup_culture"):
        incubator = payload.get("incubation_center_name")
        startups = payload.get("notable_startups", [])
        if (incubator and incubator.strip()) or len(startups) >= 2:
            score += 0.02

    if profile.get("research"):
        nirf = payload.get("nirf_rank")
        if nirf and isinstance(nirf, int) and nirf <= 10:
            score += 0.02

    if profile.get("placements"):
        avg_ctc = payload.get("average_ctc")
        median_ctc = payload.get("median_ctc")
        placement_pct = payload.get("placement_percentage")
        
        ctc_val = None
        if isinstance(avg_ctc, (int, float)):
            ctc_val = avg_ctc
        elif isinstance(median_ctc, (int, float)):
            ctc_val = median_ctc
            
        pct_val = None
        if isinstance(placement_pct, (int, float)):
            pct_val = placement_pct

        if (ctc_val and ctc_val >= 20.0) or (pct_val and pct_val >= 90.0):
            score += 0.03
        elif (ctc_val and ctc_val >= 15.0) or (pct_val and pct_val >= 80.0):
            score += 0.01

    if profile.get("campus_life"):
        sports = payload.get("sports_infrastructure", [])
        clubs = payload.get("student_clubs", [])
        if len(sports) + len(clubs) >= 12:
            score += 0.02

    return score

def recommend(db,rank: int,category:str,profile:dict | None = None, exam_type: str = "Advanced", homestate: str = "", user_query: str = "", ignore_rank: bool = False, adv_rank: int | None = None):
    if adv_rank is not None:
        if ignore_rank:
            all_branches = crud.get_all_branches_with_cutoffs(db, category, exam_type="Advanced", homestate=homestate) + \
                           crud.get_all_branches_with_cutoffs(db, category, exam_type="Mains", homestate=homestate)
            eligible_branch_ids = [item["branch"].id for item in all_branches]
        else:
            iit_ids = crud.get_eligible_branch_ids(db, adv_rank, category, exam_type="Advanced", homestate=homestate)
            mains_ids = crud.get_eligible_branch_ids(db, rank, category, exam_type="Mains", homestate=homestate)
            eligible_branch_ids = list(set(iit_ids + mains_ids))
    else:
        if ignore_rank:
            all_branches = crud.get_all_branches_with_cutoffs(db, category, exam_type=exam_type, homestate=homestate)
            eligible_branch_ids = [item["branch"].id for item in all_branches]
        else:
            eligible_branch_ids = (
                crud.get_eligible_branch_ids(
                    db,
                    rank,
                    category,
                    exam_type=exam_type,
                    homestate=homestate
                )
            )
    if not eligible_branch_ids:
        return {
            "profile": profile or {},
            "recommendations": []
        }
    if (profile is None or not profile.get("vector_query","").strip()):
        from .models import BranchCutoff, Branch, College
        
        
        recommendations = []
        if eligible_branch_ids:
            branches = (
                db.query(Branch)
                .join(College, Branch.college_id == College.id)
                .filter(Branch.id.in_(eligible_branch_ids))
                .all()
            )
            for branch in branches:
                cutoff_2024, cutoff_2025 = crud.get_branch_cutoffs_by_year(db, branch.id, category, homestate=homestate)
                sort_rank = cutoff_2025 if cutoff_2025 is not None else cutoff_2024
                recommendations.append(
                    {
                        "college_name": branch.college.college_name,
                        "branch_name": branch.branch_name,
                        "category": category,
                        "closing_rank": sort_rank,
                        "closing_rank_2024": cutoff_2024,
                        "closing_rank_2025": cutoff_2025,
                        "placement_percentage": branch.placement_percentage,
                        "avg_ctc": branch.average_ctc_lpa,
                        "median_ctc": branch.median_ctc_lpa,
                        "similarity_score": 0.0,
                        "nirf_rank": branch.college.nirf_rank
                    }
                )
            recommendations.sort(key=lambda x: x["closing_rank"] if x["closing_rank"] is not None else float('inf'))
        return {
            "profile": profile or {},
            "recommendations": recommendations
        }
    else:
        query_vector = get_model().encode(profile['vector_query'])
        results = get_qdrant().query_points(
            collection_name="branches",
            query=query_vector.tolist(),
            query_filter=Filter(
                must=[
                    HasIdCondition(has_id=eligible_branch_ids)
                ]
            ),
            limit=500 if ignore_rank else 250
        )
        scored_candidates = []
        for point in results.points:
            final_score = calculate_hybrid_score(point.score, point.payload, profile)
            scored_candidates.append((point, final_score))
        scored_candidates.sort(key=lambda x: x[1], reverse=True)
        
        
        def query_contains_keywords(query_text: str, keywords: list) -> bool:
            for kw in keywords:
                if len(kw) <= 3:
                    pattern = r'\b' + re.escape(kw) + r'\b'
                    if re.search(pattern, query_text):
                        return True
                else:
                    if kw in query_text:
                        return True
            return False

        allowed_keywords = []
        classifier_query = user_query.strip()
        if not classifier_query and profile and profile.get("vector_query", "").strip():
            classifier_query = profile["vector_query"].strip()

        if classifier_query:
            query_lower = classifier_query.lower() + " " + category.lower()
            
            specific_allowed = []
            
            if query_contains_keywords(query_lower, ["cse", "computer", "cs", "software", "coding", "programming", "developer", "it", "information technology"]):
                specific_allowed.extend(["computer", "cse", "software", "artificial", "data science", "machine learning", "computational", "computing", "information"])
            
            if query_contains_keywords(query_lower, ["ece", "electronics", "telecommunication", "vlsi", "ic design", "microelectronics"]):
                specific_allowed.extend(["electronics", "ece", "ic", "vlsi", "microelectronics", "telecommunication"])
                
            if query_contains_keywords(query_lower, ["ee", "eee", "electrical"]):
                specific_allowed.extend(["electrical", "ee", "eee"])
                
            if query_contains_keywords(query_lower, ["finance", "fintech", "quant", "economics", "mathematics", "mnc"]):
                specific_allowed.extend(["finance", "quantitative", "fintech", "economics", "mathematics", "mnc"])

            if query_contains_keywords(query_lower, ["mechanical", "mech", "aerospace", "mechatronics", "robotics"]):
                specific_allowed.extend(["mechanical", "aerospace", "mechatronics", "robotics", "automotive"])

            if "civil" in query_lower:
                specific_allowed.extend(["civil", "infrastructure", "construction"])

            if "chemical" in query_lower:
                specific_allowed.extend(["chemical", "biochemical", "petroleum"])

            if query_contains_keywords(query_lower, ["biotech", "biotechnology", "bio", "biomedical", "biosciences"]):
                specific_allowed.extend(["biotech", "bio", "biosciences", "biomedical"])

            if "circuital" in query_lower:
                specific_allowed.extend(["electrical", "electronics", "ece", "ee", "eee", "instrumentation", "ic", "vlsi", "microelectronics", "telecommunication"])

            if query_contains_keywords(query_lower, ["core", "core branches", "core engineering"]):
                specific_allowed.extend(["mechanical", "civil", "electrical", "chemical", "production", "industrial", "metallurgical", "metallurgy", "materials", "aerospace", "aeronautical", "mining", "ceramic", "textile", "physics", "environmental", "biotech", "biotechnology", "bio", "ee", "eee", "ocean", "naval", "agricultural", "food", "petroleum", "geological", "geophysics"])

            if specific_allowed:
                allowed_keywords = list(set(specific_allowed))
            
        def branch_matches_keywords(branch_name: str, allowed_keywords: list) -> bool:
            name_lower = branch_name.lower()
            for kw in allowed_keywords:
                if len(kw) <= 3:
                    pattern = r'\b' + re.escape(kw) + r'\b'
                    if re.search(pattern, name_lower):
                        return True
                else:
                    if kw in name_lower:
                        return True
            return False

        filtered_candidates = []
        for point, final_score in scored_candidates:
            branch_name = point.payload.get("branch_name", "").lower()
            if allowed_keywords:
                if branch_matches_keywords(branch_name, allowed_keywords):
                    filtered_candidates.append((point, final_score))
            else:
                filtered_candidates.append((point, final_score))
                
        top_candidates = filtered_candidates[:500] if ignore_rank else filtered_candidates[:120]
    
    recommendations = []
    for point, final_score in top_candidates:
        branch_id = point.id
        branch = crud.get_branch_by_id(
            db,
            branch_id
        )
        if branch is None:
            continue
        
        cutoff_2024, cutoff_2025 = crud.get_branch_cutoffs_by_year(db, branch_id, category, homestate=homestate)
        sort_rank = cutoff_2025 if cutoff_2025 is not None else cutoff_2024

        recommendations.append(
            {
                "college_name": branch.college.college_name,
                "branch_name": branch.branch_name,
                "category": category,
                "closing_rank": sort_rank,
                "closing_rank_2024": cutoff_2024,
                "closing_rank_2025": cutoff_2025,
                "placement_percentage": branch.placement_percentage,
                "avg_ctc": branch.average_ctc_lpa,
                "median_ctc": branch.median_ctc_lpa,
                "similarity_score": final_score,
                "nirf_rank": branch.college.nirf_rank
            }
        )
    recommendations.sort(key=lambda x: x["closing_rank"] if x["closing_rank"] is not None else float('inf'))
    return {
        "profile": profile,
        "recommendations": recommendations
    }