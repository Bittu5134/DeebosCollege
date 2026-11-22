"""Rebuild the Qdrant branch collection from structured JSON.

Run from the backend directory: python -m scripts.build_embeddings
"""

import json

from qdrant_client.models import Distance, PointStruct, VectorParams

from app import crud
from app.config import QDRANT_COLLECTION, STRUCTURED_JSON_DIR
from app.database import SessionLocal
from app.models import Branch, College
from app.recommender import get_model, get_qdrant

BATCH_SIZE = 256


def build_document(college_data: dict, branch: Branch) -> str:
    lines = [
        f"College: {college_data.get('college_name')}",
        f"Branch: {branch.branch_name}",
    ]

    if branch.average_ctc_lpa:
        lines.append(f"Average CTC: {branch.average_ctc_lpa} LPA")
    if branch.median_ctc_lpa:
        lines.append(f"Median CTC: {branch.median_ctc_lpa} LPA")
    if branch.placement_percentage:
        lines.append(f"Placement Percentage: {branch.placement_percentage}%")

    core_subjects = branch_core_subjects(college_data, branch)
    if core_subjects:
        lines.append("Core Subjects: " + ", ".join(core_subjects))

    nirf_rank = college_data.get("nirf_engineering_rank")
    if nirf_rank:
        lines.append(f"NIRF Engineering Rank: {nirf_rank}")

    sports = college_data.get("sports_infrastructure") or []
    if sports:
        lines.append("Sports Facilities: " + ", ".join(sports))

    clubs = college_data.get("student_clubs") or []
    if clubs:
        lines.append("Student Clubs: " + ", ".join(clubs))

    incubator = college_data.get("incubation_center_name")
    if incubator:
        lines.append(f"Incubation Center: {incubator}")

    startups = college_data.get("notable_startups") or []
    if startups:
        lines.append("Notable Startups: " + ", ".join(startups))

    return "\n".join(lines)


def branch_core_subjects(college_data: dict, branch: Branch) -> list:
    for entry in college_data.get("branches", []):
        if entry.get("branch_name") == branch.branch_name:
            return entry.get("core_subjects") or []
    return []


def main():
    model = get_model()
    client = get_qdrant()

    existing = [c.name for c in client.get_collections().collections]
    if QDRANT_COLLECTION in existing:
        print("Deleting old collection...")
        client.delete_collection(collection_name=QDRANT_COLLECTION)

    client.create_collection(
        collection_name=QDRANT_COLLECTION,
        vectors_config=VectorParams(size=384, distance=Distance.COSINE)
    )

    db = SessionLocal()
    points = []
    written = 0

    try:
        for json_path in sorted(STRUCTURED_JSON_DIR.rglob("*.json")):
            with open(json_path, "r", encoding="utf-8") as f:
                college_data = json.load(f)

            college_name = str(college_data.get("college_name", "")).strip()
            college = db.query(College).filter(College.college_name == college_name).first()
            if college is None:
                print(f"College not found in DB: {college_name}")
                continue

            state = college_data.get("state") or crud.get_college_state(college.college_name)

            for entry in college_data.get("branches", []):
                branch_name = entry.get("branch_name")
                branch = (
                    db.query(Branch)
                    .filter(Branch.college_id == college.id)
                    .filter(Branch.branch_name == branch_name)
                    .first()
                )
                if branch is None:
                    print(f"Branch not found: {college.college_name} -> {branch_name}")
                    continue

                document = build_document(college_data, branch)
                embedding = model.encode(document)

                points.append(
                    PointStruct(
                        id=branch.id,
                        vector=embedding.tolist(),
                        payload={
                            "branch_id": branch.id,
                            "college_id": college.id,
                            "college_name": college.college_name,
                            "branch_name": branch.branch_name,
                            "document": document,
                            "nirf_rank": college.nirf_rank,
                            "state": state,
                            "sports_infrastructure": college_data.get("sports_infrastructure", []),
                            "student_clubs": college_data.get("student_clubs", []),
                            "incubation_center_name": college_data.get("incubation_center_name"),
                            "notable_startups": college_data.get("notable_startups", []),
                            "average_ctc": branch.average_ctc_lpa,
                            "median_ctc": branch.median_ctc_lpa,
                            "placement_percentage": branch.placement_percentage,
                        }
                    )
                )

                if len(points) >= BATCH_SIZE:
                    client.upsert(collection_name=QDRANT_COLLECTION, points=points)
                    written += len(points)
                    points = []

        if points:
            client.upsert(collection_name=QDRANT_COLLECTION, points=points)
            written += len(points)

        print(f"Wrote {written} vectors to {QDRANT_COLLECTION}.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
