"""Load structured college JSON into PostgreSQL.

Run from the backend directory: python -m scripts.ingest_colleges
"""

import json

from sqlalchemy import text

from app import crud
from app.config import STRUCTURED_JSON_DIR
from app.database import SessionLocal

FOLDERS = ["iit", "i3t", "nit"]


def main():
    db = SessionLocal()
    try:
        print("Clearing tables colleges, branches, and branch_cutoffs...")
        db.execute(text("TRUNCATE TABLE branch_cutoffs, branches, colleges RESTART IDENTITY CASCADE;"))
        db.commit()
        print("Tables cleared successfully.")

        index = 1
        for folder_name in FOLDERS:
            folder = STRUCTURED_JSON_DIR / folder_name
            print(f"\nProcessing folder: {folder}")
            if not folder.exists():
                print(f"Warning: {folder} does not exist!")
                continue

            files = sorted([f for f in folder.iterdir() if f.suffix == ".json"])
            for file_path in files:
                with open(file_path, "r", encoding="utf-8") as f:
                    data = json.load(f)

                college = crud.create_college(db=db, data=data, id=index)
                print(f"[{index}] Inserted college: {college.college_name} (ID: {college.id})")
                index += 1

        print("\nDatabase repopulation completed successfully!")
    except Exception as e:
        db.rollback()
        print(f"Error during database repopulation: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
