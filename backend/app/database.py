import os
import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator
from uuid import uuid4

from pydantic import TypeAdapter

from .schemas import ScheduleCreate, ScheduleItem, ScheduleUpdate, TripDay

DEFAULT_DB_PATH = Path(__file__).resolve().parents[1] / "data" / "tripweave.db"
DB_PATH = Path(os.getenv("TRIPWEAVE_DB_PATH", DEFAULT_DB_PATH))
schedule_item_adapter = TypeAdapter(ScheduleItem)


@contextmanager
def connection() -> Iterator[sqlite3.Connection]:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    database = sqlite3.connect(DB_PATH)
    database.row_factory = sqlite3.Row
    database.execute("PRAGMA foreign_keys = ON")
    try:
        yield database
        database.commit()
    finally:
        database.close()


def initialize_database() -> None:
    with connection() as database:
        database.executescript(
            """
            CREATE TABLE IF NOT EXISTS trip_days (
                trip_id TEXT NOT NULL,
                id TEXT NOT NULL,
                label TEXT NOT NULL,
                date TEXT NOT NULL,
                position INTEGER NOT NULL,
                PRIMARY KEY (trip_id, id)
            );

            CREATE TABLE IF NOT EXISTS schedules (
                id TEXT PRIMARY KEY,
                trip_id TEXT NOT NULL,
                day_id TEXT NOT NULL,
                kind TEXT NOT NULL CHECK (kind IN ('place', 'meal', 'transport')),
                time TEXT NOT NULL,
                title TEXT NOT NULL,
                status TEXT NOT NULL CHECK (status IN ('confirmed', 'candidate')),
                location TEXT,
                duration_minutes INTEGER,
                reservation_name TEXT,
                from_location TEXT,
                to_location TEXT,
                FOREIGN KEY (trip_id, day_id) REFERENCES trip_days(trip_id, id) ON DELETE CASCADE
            );
            """
        )
        existing = database.execute(
            "SELECT 1 FROM trip_days WHERE trip_id = ? LIMIT 1", ("kyoto-autumn",)
        ).fetchone()
        if existing:
            return

        days = [
            ("kyoto-autumn", "day-1", "DAY 1", "10월 17일", 1),
            ("kyoto-autumn", "day-2", "DAY 2", "10월 18일", 2),
            ("kyoto-autumn", "day-3", "DAY 3", "10월 19일", 3),
            ("kyoto-autumn", "day-4", "DAY 4", "10월 20일", 4),
        ]
        database.executemany("INSERT INTO trip_days VALUES (?, ?, ?, ?, ?)", days)
        schedules = [
            ("a1", "kyoto-autumn", "day-2", "place", "09:30", "기요미즈데라 산책", "confirmed", "히가시야마", 120, None, None, None),
            ("a2", "kyoto-autumn", "day-2", "meal", "12:10", "오멘 은각사점", "confirmed", "사쿄구", None, "민서", None, None),
            ("a3", "kyoto-autumn", "day-2", "transport", "14:00", "철학의 길로 이동", "confirmed", None, None, None, "은각사", "난젠지"),
            ("a4", "kyoto-autumn", "day-2", "place", "17:20", "가모강 노을 피크닉", "candidate", "데마치야나기", 90, None, None, None),
        ]
        database.executemany("INSERT INTO schedules VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", schedules)


def _schedule_from_row(row: sqlite3.Row) -> ScheduleItem:
    common = {"id": row["id"], "kind": row["kind"], "time": row["time"], "title": row["title"], "status": row["status"]}
    if row["kind"] == "place":
        data = {**common, "location": row["location"], "durationMinutes": row["duration_minutes"]}
        return schedule_item_adapter.validate_python(data)
    if row["kind"] == "meal":
        data = {**common, "location": row["location"], "reservationName": row["reservation_name"]}
        return schedule_item_adapter.validate_python(data)
    data = {**common, "from": row["from_location"], "to": row["to_location"]}
    return schedule_item_adapter.validate_python(data)


def list_trip_days(trip_id: str) -> list[TripDay]:
    with connection() as database:
        day_rows = database.execute("SELECT * FROM trip_days WHERE trip_id = ? ORDER BY position", (trip_id,)).fetchall()
        schedule_rows = database.execute("SELECT * FROM schedules WHERE trip_id = ? ORDER BY time", (trip_id,)).fetchall()
    items_by_day: dict[str, list[ScheduleItem]] = {row["id"]: [] for row in day_rows}
    for row in schedule_rows:
        items_by_day[row["day_id"]].append(_schedule_from_row(row))
    return [TripDay(id=row["id"], label=row["label"], date=row["date"], items=items_by_day[row["id"]]) for row in day_rows]


def create_schedule(trip_id: str, day_id: str, data: ScheduleCreate) -> ScheduleItem | None:
    item_id = str(uuid4())
    location = data.location.strip()
    values = {
        "location": location if data.kind != "transport" else None,
        "duration_minutes": 60 if data.kind == "place" else None,
        "from_location": location if data.kind == "transport" else None,
        "to_location": "목적지 미정" if data.kind == "transport" else None,
    }
    with connection() as database:
        day = database.execute("SELECT 1 FROM trip_days WHERE trip_id = ? AND id = ?", (trip_id, day_id)).fetchone()
        if not day:
            return None
        database.execute(
            """INSERT INTO schedules
            (id, trip_id, day_id, kind, time, title, status, location, duration_minutes, from_location, to_location)
            VALUES (?, ?, ?, ?, ?, ?, 'candidate', ?, ?, ?, ?)""",
            (item_id, trip_id, day_id, data.kind, data.time, data.title.strip(), values["location"], values["duration_minutes"], values["from_location"], values["to_location"]),
        )
        row = database.execute("SELECT * FROM schedules WHERE id = ?", (item_id,)).fetchone()
    return _schedule_from_row(row)


def update_schedule(trip_id: str, day_id: str, item_id: str, data: ScheduleUpdate) -> ScheduleItem | None:
    with connection() as database:
        cursor = database.execute(
            "UPDATE schedules SET title = ?, time = ?, status = ? WHERE id = ? AND trip_id = ? AND day_id = ?",
            (data.title.strip(), data.time, data.status, item_id, trip_id, day_id),
        )
        if cursor.rowcount == 0:
            return None
        row = database.execute("SELECT * FROM schedules WHERE id = ?", (item_id,)).fetchone()
    return _schedule_from_row(row)


def delete_schedule(trip_id: str, day_id: str, item_id: str) -> bool:
    with connection() as database:
        cursor = database.execute("DELETE FROM schedules WHERE id = ? AND trip_id = ? AND day_id = ?", (item_id, trip_id, day_id))
    return cursor.rowcount > 0
