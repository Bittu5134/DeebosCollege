"""Generate a clean plain-text corpus (one .txt per branch) from structured JSON.

Usage: python -m scripts.plain_text  ->  writes DATA_DIR/plain_text/<college>/<branch>.txt
"""
import json
import re
from types import SimpleNamespace

from app.config import DATA_DIR, STRUCTURED_JSON_DIR
from scripts.build_embeddings import build_document

OUT_DIR = DATA_DIR / "plain_text"


def _safe(name: str) -> str:
    return re.sub(r"[^\w&().+-]+", "_", name).strip("_")


def main():
    count = 0
    for path in sorted(STRUCTURED_JSON_DIR.rglob("*.json")):
        data = json.loads(path.read_text(encoding="utf-8"))
        college_dir = OUT_DIR / _safe(data.get("college_name") or path.stem)
        college_dir.mkdir(parents=True, exist_ok=True)
        for b in data.get("branches", []):
            branch = SimpleNamespace(
                branch_name=b["branch_name"],
                average_ctc_lpa=b.get("average_ctc_lpa"),
                median_ctc_lpa=b.get("median_ctc_lpa"),
                placement_percentage=b.get("placement_percentage"),
            )
            (college_dir / f"{_safe(b['branch_name'])}.txt").write_text(
                build_document(data, branch), encoding="utf-8"
            )
            count += 1
    print(f"Wrote {count} branch documents to {OUT_DIR}")


if __name__ == "__main__":
    main()
