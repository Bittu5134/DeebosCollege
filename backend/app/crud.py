from sqlalchemy import and_, or_
from sqlalchemy.orm import Session

from .models import Branch, BranchCutoff, College

_STATE_KEYWORDS = [
    ("Arunachal Pradesh", ("arunachal",)),
    ("Andhra Pradesh", ("andhra pradesh", "tirupati", "kurnool", "sri city")),
    ("Chhattisgarh", ("bhilai", "raipur", "chhattisgarh")),
    ("Odisha", ("bhubaneswar", "rourkela", "odisha")),
    ("Maharashtra", ("bombay", "nagpur", "pune", "maharashtra")),
    ("Karnataka", ("dharwad", "raichur", "surathkal", "karnataka")),
    ("Gujarat", ("gandhinagar", "surat", "vadodara", "gujarat")),
    ("Assam", ("guwahati", "silchar", "assam")),
    ("Telangana", ("hyderabad", "warangal", "telangana")),
    ("Madhya Pradesh", ("indore", "bhopal", "jabalpur", "gwalior", "madhya pradesh")),
    ("Jharkhand", ("dhanbad", "ism", "ranchi", "jamshedpur", "jharkhand")),
    ("Rajasthan", ("jodhpur", "kota", "jaipur", "rajasthan")),
    ("West Bengal", ("kharagpur", "kalyani", "durgapur", "west bengal")),
    ("Tamil Nadu", ("madras", "kancheepuram", "tiruchirappalli", "trichy", "tamil nadu")),
    ("Himachal Pradesh", ("mandi", "una", "hamirpur", "himachal")),
    ("Kerala", ("palakkad", "calicut", "kottayam", "kerala")),
    ("Bihar", ("patna", "bhagalpur", "bihar")),
    ("Uttarakhand", ("roorkee", "uttarakhand")),
    ("Punjab", ("ropar", "jalandhar", "punjab")),
    ("Haryana", ("sonepat", "kurukshetra", "haryana")),
    ("Tripura", ("agartala", "tripura")),
    ("Puducherry", ("puducherry",)),
    ("Jammu and Kashmir", ("srinagar", "jammu")),
    ("Uttar Pradesh", ("bhu", "varanasi", "kanpur", "allahabad", "lucknow", "uttar pradesh")),
    ("Delhi", ("delhi",)),
    ("Goa", ("goa",)),
    ("Manipur", ("manipur",)),
    ("Meghalaya", ("meghalaya",)),
    ("Mizoram", ("mizoram",)),
    ("Nagaland", ("nagaland",)),
    ("Sikkim", ("sikkim",)),
]


def _exclude_architecture_filter():
    return and_(
        ~Branch.branch_name.ilike("%B.Arch%"),
        ~Branch.branch_name.ilike("%B.Plan%"),
        or_(
            ~Branch.branch_name.ilike("%Architecture%"),
            Branch.branch_name.ilike("%Naval Architecture%"),
        ),
        ~Branch.branch_name.ilike("%Planning%"),
    )


def _iit_filter():
    return or_(
        College.college_name.ilike("%indian institute of technology%"),
        College.college_name.ilike("iit %"),
        College.college_name.ilike("%(iit)%"),
        College.college_name.ilike("% iit %"),
    )


def _category_filter(category: str):
    prefixes = ("", "HS_", "OS_", "GO_", "JK_", "LA_")
    return BranchCutoff.category.in_([f"{prefix}{category}" for prefix in prefixes])


def get_college_state(college_name: str) -> str:
    name = college_name.lower()
    for state, keywords in _STATE_KEYWORDS:
        if any(keyword in name for keyword in keywords):
            return state
    return ""


def get_target_category_for_college(college_name: str, user_home_state: str, base_category: str) -> str:
    name_lower = college_name.lower()
    if "indian institute of technology" in name_lower or "iit" in name_lower:
        return base_category
    if "information technology" in name_lower or "iiit" in name_lower:
        return base_category

    college_state = get_college_state(college_name).lower()
    user_state = user_home_state.strip().lower()

    if college_state == user_state:
        if college_state == "goa":
            return f"GO_{base_category}"
        if college_state == "jammu and kashmir":
            return f"JK_{base_category}"
        return f"HS_{base_category}"
    if college_state == "jammu and kashmir" and user_state == "ladakh":
        return f"LA_{base_category}"
    return f"OS_{base_category}"


def _add_cutoff(db: Session, branch_id: int, category: str, rank, year: int):
    parsed_rank = parse_rank(rank)
    if parsed_rank is None:
        return
    db.add(BranchCutoff(
        branch_id=branch_id,
        category=category,
        closing_rank=parsed_rank,
        year=year,
    ))


def create_college(db: Session, data: dict, id: int | None = None):
    college = College(
        id=id,
        college_name=data["college_name"],
        nirf_rank=data.get("nirf_engineering_rank"),
        overall_average_ctc=data.get("overall_average_ctc_lpa"),
        overall_median_ctc=data.get("overall_median_ctc_lpa"),
        overall_placement_percentage=data.get("overall_placement_percentage"),
    )
    db.add(college)
    db.flush()

    for branch_data in data["branches"]:
        branch = Branch(
            college_id=college.id,
            branch_name=branch_data["branch_name"],
            average_ctc_lpa=branch_data.get("average_ctc_lpa"),
            median_ctc_lpa=branch_data.get("median_ctc_lpa"),
            placement_percentage=branch_data.get("placement_percentage"),
        )
        db.add(branch)
        db.flush()

        for key, value in branch_data.get("category_closing_ranks", {}).items():
            if key in ("2024", "2025") and isinstance(value, dict):
                for category, rank in value.items():
                    _add_cutoff(db, branch.id, category, rank, int(key))
            else:
                _add_cutoff(db, branch.id, key, value, 2024)

    db.commit()
    return college


def get_all_colleges(db: Session):
    return db.query(College).all()


def get_all_branches(db: Session):
    return db.query(Branch).all()


def get_eligible_results(db: Session, rank: int, category: str, homestate: str = ""):
    cutoffs = (
        db.query(BranchCutoff)
        .join(Branch, BranchCutoff.branch_id == Branch.id)
        .join(College, Branch.college_id == College.id)
        .filter(_category_filter(category))
        .filter(BranchCutoff.closing_rank >= rank)
        .filter(_exclude_architecture_filter())
        .all()
    )

    results = {}
    for cutoff in cutoffs:
        branch = cutoff.branch
        college_name = branch.college.college_name
        if cutoff.category != get_target_category_for_college(college_name, homestate, category):
            continue
        if branch.id in results and cutoff.year != 2025:
            continue
        results[branch.id] = {
            "college_name": college_name,
            "branch_name": branch.branch_name,
            "closing_rank": cutoff.closing_rank,
            "category": cutoff.category,
            "placement_percentage": branch.placement_percentage,
            "avg_ctc": branch.average_ctc_lpa,
            "median_ctc": branch.median_ctc_lpa,
        }
    return list(results.values())


def get_eligible_branch_ids(db, rank, category, exam_type: str = "Advanced", homestate: str = ""):
    query = (
        db.query(BranchCutoff)
        .join(Branch, BranchCutoff.branch_id == Branch.id)
        .join(College, Branch.college_id == College.id)
        .filter(_category_filter(category))
        .filter(BranchCutoff.closing_rank >= rank)
        .filter(_exclude_architecture_filter())
    )
    query = query.filter(_iit_filter() if exam_type == "Advanced" else ~_iit_filter())

    return list({
        cutoff.branch_id
        for cutoff in query.all()
        if cutoff.category == get_target_category_for_college(
            cutoff.branch.college.college_name, homestate, category
        )
    })


def get_branch_by_id(db: Session, branch_id: int):
    return db.query(Branch).filter(Branch.id == branch_id).first()


def parse_rank(value):
    if value is None:
        return None
    if isinstance(value, int):
        return value

    text = str(value).strip()
    if text.endswith("P"):
        text = text[:-1]

    try:
        return int(text)
    except ValueError:
        return None


def get_branch_cutoffs_by_year(db, branch_id: int, category: str, homestate: str = ""):
    branch = db.query(Branch).filter(Branch.id == branch_id).first()
    if not branch:
        return None, None

    target_category = get_target_category_for_college(
        branch.college.college_name, homestate, category
    )
    cutoffs = (
        db.query(BranchCutoff)
        .filter(BranchCutoff.branch_id == branch_id)
        .filter(BranchCutoff.category == target_category)
        .all()
    )
    by_year = {cutoff.year: cutoff.closing_rank for cutoff in cutoffs}
    return by_year.get(2024), by_year.get(2025)


def get_all_branches_with_cutoffs(db, category: str, exam_type: str = "Advanced", homestate: str = ""):
    query = (
        db.query(BranchCutoff)
        .join(Branch, BranchCutoff.branch_id == Branch.id)
        .join(College, Branch.college_id == College.id)
        .filter(_category_filter(category))
        .filter(_exclude_architecture_filter())
    )
    query = query.filter(_iit_filter() if exam_type == "Advanced" else ~_iit_filter())

    branch_cutoffs = {}
    for cutoff in query.all():
        college_name = cutoff.branch.college.college_name
        if cutoff.category != get_target_category_for_college(college_name, homestate, category):
            continue

        entry = branch_cutoffs.setdefault(
            cutoff.branch_id,
            {"branch": cutoff.branch, "2024": None, "2025": None},
        )
        if cutoff.year in (2024, 2025):
            entry[str(cutoff.year)] = cutoff.closing_rank

    return list(branch_cutoffs.values())
