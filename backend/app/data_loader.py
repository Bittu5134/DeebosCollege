import json
import logging
from functools import lru_cache

from .config import STRUCTURED_JSON_DIR

logger = logging.getLogger(__name__)


@lru_cache(maxsize=1)
def _load_all() -> dict:
    colleges = {}
    if not STRUCTURED_JSON_DIR.exists():
        logger.warning("Structured JSON directory not found: %s", STRUCTURED_JSON_DIR)
        return colleges

    for path in STRUCTURED_JSON_DIR.rglob("*.json"):
        try:
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
        except (OSError, json.JSONDecodeError) as e:
            logger.warning("Skipping unreadable JSON file %s: %s", path, e)
            continue

        name = str(data.get("college_name", "")).strip().lower()
        if name:
            colleges[name] = data

    return colleges


def get_college_metadata(college_name: str) -> dict:
    return _load_all().get(college_name.strip().lower(), {})
