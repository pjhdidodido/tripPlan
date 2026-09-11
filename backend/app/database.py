import os
import re
import sqlite3
from contextlib import contextmanager
from datetime import date, timedelta
from pathlib import Path
from typing import Iterator
from uuid import uuid4

from pydantic import TypeAdapter

from .schemas import ScheduleComment, ScheduleCommentCreate, ScheduleCreate, ScheduleItem, ScheduleUpdate, Trip, TripCreate, TripDay

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
            CREATE TABLE IF NOT EXISTS trips (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                destination TEXT NOT NULL,
                start_date TEXT NOT NULL,
                end_date TEXT NOT NULL,
                budget INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS app_metadata (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS trip_members (
                id TEXT PRIMARY KEY,
                trip_id TEXT NOT NULL,
                name TEXT NOT NULL,
                position INTEGER NOT NULL,
                FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE
            );

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
                memo TEXT,
                pre_cost INTEGER NOT NULL DEFAULT 0,
                image_filename TEXT,
                FOREIGN KEY (trip_id, day_id) REFERENCES trip_days(trip_id, id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS schedule_comments (
                id TEXT PRIMARY KEY,
                schedule_id TEXT NOT NULL,
                member_name TEXT NOT NULL,
                content TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (schedule_id) REFERENCES schedules(id) ON DELETE CASCADE
            );
            """
        )
        trip_columns = {row["name"] for row in database.execute("PRAGMA table_info(trips)").fetchall()}
        if "budget" not in trip_columns:
            database.execute("ALTER TABLE trips ADD COLUMN budget INTEGER NOT NULL DEFAULT 0")
            database.execute("UPDATE trips SET budget = 1240000 WHERE id = 'kyoto-autumn'")
            database.execute("UPDATE trips SET budget = 800000 WHERE id = 'korea-weekend'")

        schedule_columns = {row["name"] for row in database.execute("PRAGMA table_info(schedules)").fetchall()}
        if "memo" not in schedule_columns:
            database.execute("ALTER TABLE schedules ADD COLUMN memo TEXT")
        if "pre_cost" not in schedule_columns:
            database.execute("ALTER TABLE schedules ADD COLUMN pre_cost INTEGER NOT NULL DEFAULT 0")
        if "image_filename" not in schedule_columns:
            database.execute("ALTER TABLE schedules ADD COLUMN image_filename TEXT")

        seeded = database.execute("SELECT 1 FROM app_metadata WHERE key = 'initial_trips_seeded'").fetchone()
        if seeded:
            return

        database.execute(
            "INSERT OR IGNORE INTO trips (id, title, destination, start_date, end_date, budget) VALUES (?, ?, ?, ?, ?, ?)",
            ("kyoto-autumn", "교토의 느린 가을", "교토", "2026-10-17", "2026-10-20", 1240000),
        )
        database.execute(
            "INSERT OR IGNORE INTO trips (id, title, destination, start_date, end_date, budget) VALUES (?, ?, ?, ?, ?, ?)",
            ("korea-weekend", "한국 주말 여행", "서울", "2027-04-03", "2027-04-05", 800000),
        )
        for trip_id, names in (("kyoto-autumn", ["민서", "준호", "서연", "나"]), ("korea-weekend", ["지우", "현우"])):
            has_members = database.execute("SELECT 1 FROM trip_members WHERE trip_id = ? LIMIT 1", (trip_id,)).fetchone()
            if not has_members:
                database.executemany(
                    "INSERT INTO trip_members (id, trip_id, name, position) VALUES (?, ?, ?, ?)",
                    [(str(uuid4()), trip_id, name, position) for position, name in enumerate(names)],
                )

        existing = database.execute("SELECT 1 FROM trip_days WHERE trip_id = ? LIMIT 1", ("kyoto-autumn",)).fetchone()
        if not existing:
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
            database.executemany(
                """INSERT INTO schedules
                (id, trip_id, day_id, kind, time, title, status, location, duration_minutes, reservation_name, from_location, to_location)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                schedules,
            )

        korea_days = database.execute("SELECT 1 FROM trip_days WHERE trip_id = ? LIMIT 1", ("korea-weekend",)).fetchone()
        if not korea_days:
            database.executemany(
                "INSERT INTO trip_days VALUES (?, ?, ?, ?, ?)",
                [("korea-weekend", f"day-{index}", f"DAY {index}", f"4월 {day}일", index) for index, day in enumerate(range(3, 6), start=1)],
            )
        database.execute("INSERT INTO app_metadata (key, value) VALUES ('initial_trips_seeded', '1')")


def _trip_from_row(database: sqlite3.Connection, row: sqlite3.Row) -> Trip:
    member_rows = database.execute("SELECT name FROM trip_members WHERE trip_id = ? ORDER BY position", (row["id"],)).fetchall()
    return Trip(
        id=row["id"],
        title=row["title"],
        destination=row["destination"],
        startDate=row["start_date"],
        endDate=row["end_date"],
        members=[member["name"] for member in member_rows],
        budget=row["budget"],
    )


def list_trips() -> list[Trip]:
    with connection() as database:
        rows = database.execute("SELECT * FROM trips ORDER BY start_date, created_at").fetchall()
        return [_trip_from_row(database, row) for row in rows]


def get_trip(trip_id: str) -> Trip | None:
    with connection() as database:
        row = database.execute("SELECT * FROM trips WHERE id = ?", (trip_id,)).fetchone()
        return _trip_from_row(database, row) if row else None


def _clean_members(members: list[str]) -> list[str]:
    cleaned = [name.strip() for name in members if name.strip()]
    return list(dict.fromkeys(cleaned))


def create_trip(data: TripCreate) -> Trip:
    start = date.fromisoformat(data.startDate)
    end = date.fromisoformat(data.endDate)
    if end < start or (end - start).days > 13:
        raise ValueError("Trip dates must span between 1 and 14 days")
    members = _clean_members(data.members)
    if not members:
        raise ValueError("At least one member is required")
    slug = re.sub(r"[^a-z0-9]+", "-", data.destination.lower()).strip("-") or "trip"
    trip_id = f"{slug}-{uuid4().hex[:8]}"
    with connection() as database:
        database.execute(
            "INSERT INTO trips (id, title, destination, start_date, end_date, budget) VALUES (?, ?, ?, ?, ?, ?)",
            (trip_id, data.title.strip(), data.destination.strip(), data.startDate, data.endDate, data.budget),
        )
        database.executemany(
            "INSERT INTO trip_members (id, trip_id, name, position) VALUES (?, ?, ?, ?)",
            [(str(uuid4()), trip_id, name, position) for position, name in enumerate(members)],
        )
        day_count = (end - start).days + 1
        database.executemany(
            "INSERT INTO trip_days (trip_id, id, label, date, position) VALUES (?, ?, ?, ?, ?)",
            [(trip_id, f"day-{index}", f"DAY {index}", f"{current.month}월 {current.day}일", index) for index in range(1, day_count + 1) for current in [start + timedelta(days=index - 1)]],
        )
        row = database.execute("SELECT * FROM trips WHERE id = ?", (trip_id,)).fetchone()
        return _trip_from_row(database, row)


def replace_trip_members(trip_id: str, members: list[str]) -> Trip | None:
    cleaned = _clean_members(members)
    if not cleaned:
        raise ValueError("At least one member is required")
    with connection() as database:
        row = database.execute("SELECT * FROM trips WHERE id = ?", (trip_id,)).fetchone()
        if not row:
            return None
        database.execute("DELETE FROM trip_members WHERE trip_id = ?", (trip_id,))
        database.executemany(
            "INSERT INTO trip_members (id, trip_id, name, position) VALUES (?, ?, ?, ?)",
            [(str(uuid4()), trip_id, name, position) for position, name in enumerate(cleaned)],
        )
        return _trip_from_row(database, row)

# 예산 변경 함수
def update_trip_budget(trip_id: str, budget: int) -> Trip | None:
    with connection() as database:
        cursor = database.execute("UPDATE trips SET budget = ? WHERE id = ?", (budget, trip_id))
        if cursor.rowcount == 0:
            return None
        row = database.execute("SELECT * FROM trips WHERE id = ?", (trip_id,)).fetchone()
        return _trip_from_row(database, row)

def delete_trip(trip_id: str) -> bool:
    with connection() as database:
        image_rows = database.execute("SELECT image_filename FROM schedules WHERE trip_id = ? AND image_filename IS NOT NULL", (trip_id,)).fetchall()
        database.execute("DELETE FROM schedules WHERE trip_id = ?", (trip_id,))
        database.execute("DELETE FROM trip_days WHERE trip_id = ?", (trip_id,))
        database.execute("DELETE FROM trip_members WHERE trip_id = ?", (trip_id,))
        cursor = database.execute("DELETE FROM trips WHERE id = ?", (trip_id,))
    for image_row in image_rows:
        (DB_PATH.parent / "uploads" / image_row["image_filename"]).unlink(missing_ok=True)
    return cursor.rowcount > 0


def _schedule_from_row(database: sqlite3.Connection, row: sqlite3.Row) -> ScheduleItem:
    comment_rows = database.execute(
        "SELECT * FROM schedule_comments WHERE schedule_id = ? ORDER BY created_at, id",
        (row["id"],),
    ).fetchall()
    common = {
        "id": row["id"],
        "kind": row["kind"],
        "time": row["time"],
        "title": row["title"],
        "status": row["status"],
        "memo": row["memo"],
        "preCost": row["pre_cost"],
        "imageUrl": f"/uploads/{row['image_filename']}" if row["image_filename"] else None,
        "comments": [
            {"id": comment["id"], "member": comment["member_name"], "content": comment["content"], "createdAt": comment["created_at"]}
            for comment in comment_rows
        ],
    }
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
            items_by_day[row["day_id"]].append(_schedule_from_row(database, row))
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
            (id, trip_id, day_id, kind, time, title, status, location, duration_minutes, from_location, to_location, memo, pre_cost)
            VALUES (?, ?, ?, ?, ?, ?, 'candidate', ?, ?, ?, ?, ?, ?)""",
            (
                item_id,
                trip_id,
                day_id,
                data.kind,
                data.time,
                data.title.strip(),
                values["location"],
                values["duration_minutes"],
                values["from_location"],
                values["to_location"],
                data.memo.strip() if data.memo and data.memo.strip() else None,
                data.preCost,
            ),
        )
        row = database.execute("SELECT * FROM schedules WHERE id = ?", (item_id,)).fetchone()
        return _schedule_from_row(database, row)


def update_schedule(trip_id: str, day_id: str, item_id: str, data: ScheduleUpdate) -> ScheduleItem | None:
    with connection() as database:
        current = database.execute(
            "SELECT * FROM schedules WHERE id = ? AND trip_id = ? AND day_id = ?",
            (item_id, trip_id, day_id),
        ).fetchone()
        if current is None:
            return None

        location = data.location.strip()
        values = {
            "location": location if data.kind != "transport" else None,
            "duration_minutes": current["duration_minutes"] if data.kind == "place" and current["kind"] == "place" else (60 if data.kind == "place" else None),
            "reservation_name": current["reservation_name"] if data.kind == "meal" and current["kind"] == "meal" else None,
            "from_location": location if data.kind == "transport" else None,
            "to_location": current["to_location"] if data.kind == "transport" and current["kind"] == "transport" else ("목적지 미정" if data.kind == "transport" else None),
        }
        cursor = database.execute(
            """UPDATE schedules
            SET kind = ?, title = ?, time = ?, status = ?, location = ?, duration_minutes = ?,
                reservation_name = ?, from_location = ?, to_location = ?, memo = ?, pre_cost = ?
            WHERE id = ? AND trip_id = ? AND day_id = ?""",
            (
                data.kind,
                data.title.strip(),
                data.time,
                data.status,
                values["location"],
                values["duration_minutes"],
                values["reservation_name"],
                values["from_location"],
                values["to_location"],
                data.memo.strip() if data.memo and data.memo.strip() else None,
                data.preCost,
                item_id,
                trip_id,
                day_id,
            ),
        )
        if cursor.rowcount == 0:
            return None
        row = database.execute("SELECT * FROM schedules WHERE id = ?", (item_id,)).fetchone()
        return _schedule_from_row(database, row)


def delete_schedule(trip_id: str, day_id: str, item_id: str) -> bool:
    with connection() as database:
        row = database.execute(
            "SELECT image_filename FROM schedules WHERE id = ? AND trip_id = ? AND day_id = ?",
            (item_id, trip_id, day_id),
        ).fetchone()
        cursor = database.execute("DELETE FROM schedules WHERE id = ? AND trip_id = ? AND day_id = ?", (item_id, trip_id, day_id))
    if row and row["image_filename"]:
        (DB_PATH.parent / "uploads" / row["image_filename"]).unlink(missing_ok=True)
    return cursor.rowcount > 0


def set_schedule_image(trip_id: str, day_id: str, item_id: str, filename: str | None) -> tuple[ScheduleItem, str | None] | None:
    with connection() as database:
        current = database.execute(
            "SELECT * FROM schedules WHERE id = ? AND trip_id = ? AND day_id = ?",
            (item_id, trip_id, day_id),
        ).fetchone()
        if current is None:
            return None
        previous = current["image_filename"]
        database.execute("UPDATE schedules SET image_filename = ? WHERE id = ?", (filename, item_id))
        row = database.execute("SELECT * FROM schedules WHERE id = ?", (item_id,)).fetchone()
        return _schedule_from_row(database, row), previous


def add_schedule_comment(trip_id: str, day_id: str, item_id: str, data: ScheduleCommentCreate) -> ScheduleComment | None:
    comment_id = str(uuid4())
    with connection() as database:
        schedule = database.execute(
            "SELECT 1 FROM schedules WHERE id = ? AND trip_id = ? AND day_id = ?",
            (item_id, trip_id, day_id),
        ).fetchone()
        member = database.execute(
            "SELECT 1 FROM trip_members WHERE trip_id = ? AND name = ?",
            (trip_id, data.member.strip()),
        ).fetchone()
        if schedule is None or member is None:
            return None
        database.execute(
            "INSERT INTO schedule_comments (id, schedule_id, member_name, content) VALUES (?, ?, ?, ?)",
            (comment_id, item_id, data.member.strip(), data.content.strip()),
        )
        row = database.execute("SELECT * FROM schedule_comments WHERE id = ?", (comment_id,)).fetchone()
        return ScheduleComment(id=row["id"], member=row["member_name"], content=row["content"], createdAt=row["created_at"])
