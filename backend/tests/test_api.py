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

    def test_trips_have_independent_days_and_members(self) -> None:
        trips = self.client.get("/api/trips")
        self.assertEqual(trips.status_code, 200)
        self.assertEqual([trip["destination"] for trip in trips.json()], ["교토", "서울"])

        created = self.client.post(
            "/api/trips",
            json={
                "title": "부산 여름 휴가",
                "destination": "부산",
                "startDate": "2027-07-10",
                "endDate": "2027-07-12",
                "members": ["민서", "도윤"],
            },
        )
        self.assertEqual(created.status_code, 201)
        trip = created.json()
        self.assertEqual(trip["members"], ["민서", "도윤"])
        self.assertEqual(len(self.client.get(f"/api/trips/{trip['id']}/days").json()), 3)

        updated = self.client.put(
            f"/api/trips/{trip['id']}/members",
            json={"members": ["민서", "하준", "민서"]},
        )
        self.assertEqual(updated.status_code, 200)
        self.assertEqual(updated.json()["members"], ["민서", "하준"])
        self.assertEqual(len(self.client.get("/api/trips/kyoto-autumn/days").json()[1]["items"]), 4)

        deleted = self.client.delete(f"/api/trips/{trip['id']}")
        self.assertEqual(deleted.status_code, 204)
        self.assertEqual(self.client.get(f"/api/trips/{trip['id']}/days").status_code, 404)


if __name__ == "__main__":
    unittest.main()
