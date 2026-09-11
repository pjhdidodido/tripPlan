import os
from pathlib import Path

from ..infrastructure import database


UPLOAD_DIR = database.DB_PATH.parent / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "TRIPWEAVE_ALLOWED_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173",
    ).split(",")
    if origin.strip()
]


def upload_path(filename: str) -> Path:
    return UPLOAD_DIR / Path(filename).name
