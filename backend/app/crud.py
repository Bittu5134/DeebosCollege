from sqlalchemy.orm import Session
from sqlalchemy import and_, not_, or_
from .models import College,Branch,BranchCutoff



def _exclude_architecture_filter():
    return and_(
        ~Branch.branch_name.ilike("%B.Arch%"),
        ~Branch.branch_name.ilike("%B.Plan%"),
        or_(
            ~Branch.branch_name.ilike("%Architecture%"),
            Branch.branch_name.ilike("%Naval Architecture%")
        ),
        ~Branch.branch_name.ilike("%Planning%")
    )

def get_college_state(college_name: str) -> str:
    name = college_name.lower()
    
    
    if "arunachal" in name: return "Arunachal Pradesh"
    if "andhra pradesh" in name: return "Andhra Pradesh"
    
    
    if "bhilai" in name: return "Chhattisgarh"
    if "bhubaneswar" in name: return "Odisha"
    if "rourkela" in name: return "Odisha"
    if "bombay" in name or "nagpur" in name or "pune" in name: return "Maharashtra"
    if "dharwad" in name or "raichur" in name or "surathkal" in name: return "Karnataka"
    if "gandhinagar" in name or "surat" in name or "vadodara" in name: return "Gujarat"
    if "guwahati" in name or "silchar" in name: return "Assam"
    if "hyderabad" in name or "warangal" in name: return "Telangana"
    if "indore" in name or "bhopal" in name or "jabalpur" in name or "gwalior" in name: return "Madhya Pradesh"
    if "dhanbad" in name or "ism" in name or "ranchi" in name or "jamshedpur" in name: return "Jharkhand"
    if "jodhpur" in name or "kota" in name or "jaipur" in name: return "Rajasthan"
    if "kharagpur" in name or "kalyani" in name or "durgapur" in name: return "West Bengal"
    if "madras" in name or "kancheepuram" in name or "tiruchirappalli" in name or "trichy" in name: return "Tamil Nadu"
    if "mandi" in name or "una" in name or "hamirpur" in name: return "Himachal Pradesh"
    if "palakkad" in name or "calicut" in name or "kottayam" in name: return "Kerala"
    if "patna" in name or "bhagalpur" in name: return "Bihar"
    if "roorkee" in name: return "Uttarakhand"
    if "ropar" in name or "jalandhar" in name: return "Punjab"
    if "tirupati" in name or "kurnool" in name or "sri city" in name: return "Andhra Pradesh"
    if "sonepat" in name or "kurukshetra" in name: return "Haryana"
    if "agartala" in name: return "Tripura"
    if "puducherry" in name: return "Puducherry"
    if "raipur" in name: return "Chhattisgarh"
    if "srinagar" in name: return "Jammu and Kashmir"
    
    
    if "assam" in name: return "Assam"
    if "bihar" in name and "bihari" not in name: return "Bihar"
    if "chhattisgarh" in name: return "Chhattisgarh"
    if "delhi" in name: return "Delhi"
    if "goa" in name: return "Goa"
    if "gujarat" in name: return "Gujarat"
    if "haryana" in name: return "Haryana"
    if "himachal" in name: return "Himachal Pradesh"
    if "jammu" in name: return "Jammu and Kashmir"
    if "jharkhand" in name: return "Jharkhand"
    if "karnataka" in name: return "Karnataka"
    if "kerala" in name: return "Kerala"
    if "madhya pradesh" in name: return "Madhya Pradesh"
    if "maharashtra" in name: return "Maharashtra"
    if "manipur" in name: return "Manipur"
    if "meghalaya" in name: return "Meghalaya"
    if "mizoram" in name: return "Mizoram"
    if "nagaland" in name: return "Nagaland"
    if "odisha" in name: return "Odisha"
    if "punjab" in name: return "Punjab"
    if "rajasthan" in name: return "Rajasthan"
    if "sikkim" in name: return "Sikkim"
    if "tamil nadu" in name: return "Tamil Nadu"
    if "telangana" in name: return "Telangana"
    if "tripura" in name: return "Tripura"
    if "uttar pradesh" in name: return "Uttar Pradesh"
    if "uttarakhand" in name: return "Uttarakhand"
    if "west bengal" in name: return "West Bengal"
    
    
    if "bhu" in name or "varanasi" in name or "kanpur" in name or "allahabad" in name or "lucknow" in name: return "Uttar Pradesh"

    return ""

def get_target_category_for_college(college_name: str, user_home_state: str, base_category: str) -> str:
    name_lower = college_name.lower()
    is_iit = "indian institute of technology" in name_lower or "iit" in name_lower
    is_iiit = "information technology" in name_lower or "iiit" in name_lower
    
    if is_iit or is_iiit:
        return base_category
        
    college_state = get_college_state(college_name)
    user_state_lower = user_home_state.strip().lower()
    college_state_lower = college_state.strip().lower()
    
    if college_state_lower == user_state_lower:
        if college_state_lower == "goa":
            return f"GO_{base_category}"
        elif college_state_lower == "jammu and kashmir":
            return f"JK_{base_category}"
        else:
            return f"HS_{base_category}"
    elif college_state_lower == "jammu and kashmir" and user_state_lower == "ladakh":
        return f"LA_{base_category}"
    else:
        return f"OS_{base_category}"



def create_college(db: Session,data:dict, id: int = None):
    college = College(
    id=id,
    college_name=data["college_name"],
    nirf_rank=data.get("nirf_engineering_rank"),
    overall_average_ctc=data.get("overall_average_ctc_lpa"),
    overall_median_ctc=data.get("overall_median_ctc_lpa"),
    overall_placement_percentage=data.get("overall_placement_percentage"),
    
    )
    db.add(college)
    db.commit()
    db.refresh(college)

    for branch in data["branches"]:

        branch_obj = Branch(

            college_id=college.id,

            branch_name=branch[
                "branch_name"
            ],

            average_ctc_lpa=branch.get(
                "average_ctc_lpa"
            ),

            median_ctc_lpa=branch.get(
                "median_ctc_lpa"
            ),

            placement_percentage=branch.get(
                "placement_percentage"
            )
        )

        db.add(branch_obj)

        db.commit()

        db.refresh(branch_obj)

        cutoffs = branch.get(
            "category_closing_ranks",
            {}
        )

        for key, val in cutoffs.items():
            if key in ["2024", "2025"] and isinstance(val, dict):
                year = int(key)
                for category, rank in val.items():
                    parsed_rank = parse_rank(rank)
                    if parsed_rank is None:
                        continue
                    cutoff = BranchCutoff(
                        branch_id=branch_obj.id,
                        category=category,
                        closing_rank=parsed_rank,
                        year=year
                    )
                    db.add(cutoff)
            else:
                category = key
                rank = val
                parsed_rank = parse_rank(rank)
                if parsed_rank is None:
                    continue
                cutoff = BranchCutoff(
                    branch_id=branch_obj.id,
                    category=category,
                    closing_rank=parsed_rank,
                    year=2024
                )
                db.add(cutoff)

    db.commit()

    return college


def get_all_colleges(db: Session):
    return db.query(College).all()

def get_all_branches(db:Session):
    return db.query(Branch).all()

def get_eligible_results(
    db: Session,
    rank: int,
    category: str,
    homestate: str = ""
):

    result = []

    cutoffs = (

        db.query(
            BranchCutoff
        )
        .join(Branch, BranchCutoff.branch_id == Branch.id)
        .join(College, Branch.college_id == College.id)

        .filter(
            BranchCutoff.category.in_([
                category,
                f"HS_{category}",
                f"OS_{category}",
                f"GO_{category}",
                f"JK_{category}",
                f"LA_{category}"
            ])
        )

        .filter(
            BranchCutoff.closing_rank
            >= rank
        )
        .filter(_exclude_architecture_filter())

        .all()
    )

    for cutoff in cutoffs:

        branch = cutoff.branch
        college_name = branch.college.college_name
        target_cat = get_target_category_for_college(college_name, homestate, category)
        if cutoff.category != target_cat:
            continue

        result.append(
            {
                "college_name":
                    branch.college.college_name,

                "branch_name":
                    branch.branch_name,

                "closing_rank":
                    cutoff.closing_rank,

                "category":
                    cutoff.category,

                "placement_percentage":
                    branch.placement_percentage,

                "avg_ctc":
                    branch.average_ctc_lpa,

                "median_ctc":
                    branch.median_ctc_lpa
            }
        )

    return result

def get_eligible_branch_ids(
    db,
    rank,
    category,
    exam_type: str = "Advanced",
    homestate: str = ""
):

    cutoffs = (

        db.query(
            BranchCutoff
        )
        .join(Branch, BranchCutoff.branch_id == Branch.id)
        .join(College, Branch.college_id == College.id)

        .filter(
            BranchCutoff.category.in_([
                category,
                f"HS_{category}",
                f"OS_{category}",
                f"GO_{category}",
                f"JK_{category}",
                f"LA_{category}"
            ])
        )

        .filter(
            BranchCutoff.closing_rank
            >= rank
        )
        .filter(_exclude_architecture_filter())
    )

    if exam_type == "Advanced":
        cutoffs = cutoffs.filter(
            (College.college_name.ilike("%indian institute of technology%")) |
            (College.college_name.ilike("iit %")) |
            (College.college_name.ilike("%(iit)%")) |
            (College.college_name.ilike("% iit %"))
        )
    else:
        cutoffs = cutoffs.filter(
            ~((College.college_name.ilike("%indian institute of technology%")) |
              (College.college_name.ilike("iit %")) |
              (College.college_name.ilike("%(iit)%")) |
              (College.college_name.ilike("% iit %")))
        )

    cutoffs = cutoffs.all()

    valid_branch_ids = []
    for cutoff in cutoffs:
        college_name = cutoff.branch.college.college_name
        target_cat = get_target_category_for_college(college_name, homestate, category)
        if cutoff.category == target_cat:
            valid_branch_ids.append(cutoff.branch_id)

    return list(set(valid_branch_ids))

def get_branch_by_id(db: Session,branch_id: int):
    return (
        db.query(Branch).filter(Branch.id == branch_id)
        .first()
    )

def parse_rank(value):

    if value is None:
        return None

    if isinstance(
        value,
        int
    ):
        return value

    value = str(value)

    value = value.replace(
        "P",
        ""
    )

    return int(value)

def get_cutoff(
    db,
    branch_id: int,
    category: str
):
    
    cutoff = (
        db.query(BranchCutoff)
        .filter(BranchCutoff.branch_id == branch_id)
        .filter(BranchCutoff.category == category)
        .filter(BranchCutoff.year == 2025)
        .first()
    )
    if cutoff is None:
        cutoff = (
            db.query(BranchCutoff)
            .filter(BranchCutoff.branch_id == branch_id)
            .filter(BranchCutoff.category == category)
            .filter(BranchCutoff.year == 2024)
            .first()
        )
    if cutoff is None:
        cutoff = (
            db.query(BranchCutoff)
            .filter(BranchCutoff.branch_id == branch_id)
            .filter(BranchCutoff.category == category)
            .first()
        )
    return cutoff

_cutoff_cache = {}


def clear_cutoff_cache():
    _cutoff_cache.clear()


def get_branch_cutoffs_by_year(db, branch_id: int, category: str, homestate: str = ""):
    key = (branch_id, category, (homestate or "").strip().lower())
    if key not in _cutoff_cache:
        _cutoff_cache[key] = _get_branch_cutoffs_by_year(db, branch_id, category, homestate)
    return _cutoff_cache[key]


def _get_branch_cutoffs_by_year(db, branch_id: int, category: str, homestate: str = ""):
    branch = db.query(Branch).filter(Branch.id == branch_id).first()
    if not branch:
        return None, None
    college_name = branch.college.college_name
    target_category = get_target_category_for_college(college_name, homestate, category)

    cutoffs = (
        db.query(BranchCutoff)
        .filter(BranchCutoff.branch_id == branch_id)
        .filter(BranchCutoff.category == target_category)
        .all()
    )
    cutoff_2024 = None
    cutoff_2025 = None
    for c in cutoffs:
        if c.year == 2024:
            cutoff_2024 = c.closing_rank
        elif c.year == 2025:
            cutoff_2025 = c.closing_rank
    return cutoff_2024, cutoff_2025

def get_all_branches_with_cutoffs(db, category: str, exam_type: str = "Advanced", homestate: str = ""):
    query = (
        db.query(BranchCutoff)
        .join(Branch, BranchCutoff.branch_id == Branch.id)
        .join(College, Branch.college_id == College.id)
        .filter(
            BranchCutoff.category.in_([
                category,
                f"HS_{category}",
                f"OS_{category}",
                f"GO_{category}",
                f"JK_{category}",
                f"LA_{category}"
            ])
        )
        .filter(_exclude_architecture_filter())
    )

    if exam_type == "Advanced":
        query = query.filter(
            (College.college_name.ilike("%indian institute of technology%")) |
            (College.college_name.ilike("iit %")) |
            (College.college_name.ilike("%(iit)%")) |
            (College.college_name.ilike("% iit %"))
        )
    else:
        query = query.filter(
            ~((College.college_name.ilike("%indian institute of technology%")) |
              (College.college_name.ilike("iit %")) |
              (College.college_name.ilike("%(iit)%")) |
              (College.college_name.ilike("% iit %")))
        )

    cutoffs = query.all()
    
    branch_cutoffs = {}
    for cutoff in cutoffs:
        college_name = cutoff.branch.college.college_name
        target_cat = get_target_category_for_college(college_name, homestate, category)
        if cutoff.category == target_cat:
            b_id = cutoff.branch_id
            if b_id not in branch_cutoffs:
                branch_cutoffs[b_id] = {"branch": cutoff.branch, "2024": None, "2025": None}
            if cutoff.year == 2024:
                branch_cutoffs[b_id]["2024"] = cutoff.closing_rank
            elif cutoff.year == 2025:
                branch_cutoffs[b_id]["2025"] = cutoff.closing_rank

    return list(branch_cutoffs.values())