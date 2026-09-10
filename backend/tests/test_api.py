import unittest
from pathlib import Path

from fastapi.testclient import TestClient

from backend.app import database
from backend.app.main import app


class TripApiTest(unittest.TestCase):
    def setUp(self) -> None:
        database.DB_PATH = Path(__file__).resolve().parents[1] / "data" / "test-tripweave.db"
        database.DB_PATH.unlink(missing_ok=True)
        self.client = TestClient(app)
        self.client.__enter__()

    def tearDown(self) -> None:
        self.client.__exit__(None, None, None)
        database.DB_PATH.unlink(missing_ok=True)

    def test_schedule_crud_is_persisted(self) -> None:
        days = self.client.get("/api/trips/kyoto-autumn/days")
        self.assertEqual(days.status_code, 200)
        self.assertEqual(days.json()[1]["items"][2]["from"], "은각사")

        created = self.client.post(
            "/api/trips/kyoto-autumn/days/day-1/schedules",
            json={"title": "아침 산책", "time": "08:00", "kind": "place", "location": "교토역"},
        )
        self.assertEqual(created.status_code, 201)
        item_id = created.json()["id"]

        updated = self.client.patch(
            f"/api/trips/kyoto-autumn/days/day-1/schedules/{item_id}",
            json={"title": "아침 산책 수정", "time": "08:30", "status": "confirmed"},
        )
        self.assertEqual(updated.status_code, 200)
        self.assertEqual(updated.json()["title"], "아침 산책 수정")

        deleted = self.client.delete(f"/api/trips/kyoto-autumn/days/day-1/schedules/{item_id}")
        self.assertEqual(deleted.status_code, 204)
        remaining = self.client.get("/api/trips/kyoto-autumn/days").json()[0]["items"]
        self.assertEqual(remaining, [])


if __name__ == "__main__":
    unittest.main()
