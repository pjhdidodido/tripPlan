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
            json={"title": "아침 산책", "time": "08:00", "kind": "place", "location": "교토역", "memo": "숙소에서 도보 이동", "preCost": 30000},
        )
        self.assertEqual(created.status_code, 201)
        self.assertEqual(created.json()["memo"], "숙소에서 도보 이동")
        self.assertEqual(created.json()["preCost"], 30000)
        item_id = created.json()["id"]

        updated = self.client.patch(
            f"/api/trips/kyoto-autumn/days/day-1/schedules/{item_id}",
            json={"title": "시장 아침 식사", "time": "08:30", "status": "confirmed", "kind": "meal", "location": "니시키 시장", "memo": "현금 준비", "preCost": 45000},
        )
        self.assertEqual(updated.status_code, 200)
        self.assertEqual(updated.json()["title"], "시장 아침 식사")
        self.assertEqual(updated.json()["kind"], "meal")
        self.assertEqual(updated.json()["location"], "니시키 시장")
        self.assertEqual(updated.json()["memo"], "현금 준비")
        self.assertEqual(updated.json()["preCost"], 45000)

        persisted = self.client.get("/api/trips/kyoto-autumn/days").json()[0]["items"]
        self.assertEqual(persisted[0]["preCost"], 45000)

        comment = self.client.post(
            f"/api/trips/kyoto-autumn/days/day-1/schedules/{item_id}/comments",
            json={"member": "민서", "content": "아침 일찍 만나요"},
        )
        self.assertEqual(comment.status_code, 201)
        persisted = self.client.get("/api/trips/kyoto-autumn/days").json()[0]["items"]
        self.assertEqual(persisted[0]["comments"][0]["member"], "민서")

        first_image = self.client.put(
            f"/api/trips/kyoto-autumn/days/day-1/schedules/{item_id}/image",
            content=b"first-image",
            headers={"Content-Type": "image/png"},
        )
        self.assertEqual(first_image.status_code, 200)
        first_url = first_image.json()["imageUrl"]
        second_image = self.client.put(
            f"/api/trips/kyoto-autumn/days/day-1/schedules/{item_id}/image",
            content=b"replacement-image",
            headers={"Content-Type": "image/webp"},
        )
        self.assertEqual(second_image.status_code, 200)
        self.assertNotEqual(second_image.json()["imageUrl"], first_url)
        removed_image = self.client.delete(f"/api/trips/kyoto-autumn/days/day-1/schedules/{item_id}/image")
        self.assertEqual(removed_image.status_code, 200)
        self.assertIsNone(removed_image.json()["imageUrl"])

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
                "budget": 1500000,
            },
        )
        self.assertEqual(created.status_code, 201)
        trip = created.json()
        self.assertEqual(trip["members"], ["민서", "도윤"])
        self.assertEqual(trip["budget"], 1500000)
        self.assertEqual(len(self.client.get(f"/api/trips/{trip['id']}/days").json()), 3)

        updated = self.client.put(
            f"/api/trips/{trip['id']}/members",
            json={"members": ["민서", "하준", "민서"]},
        )
        self.assertEqual(updated.status_code, 200)
        self.assertEqual(updated.json()["members"], ["민서", "하준"])

        budget_updated = self.client.put(
            f"/api/trips/{trip['id']}/budget",
            json={"budget": 1800000},
        )
        self.assertEqual(budget_updated.status_code, 200)
        self.assertEqual(budget_updated.json()["budget"], 1800000)

        self.assertEqual(len(self.client.get("/api/trips/kyoto-autumn/days").json()[1]["items"]), 4)

        deleted = self.client.delete(f"/api/trips/{trip['id']}")
        self.assertEqual(deleted.status_code, 204)
        self.assertEqual(self.client.get(f"/api/trips/{trip['id']}/days").status_code, 404)


if __name__ == "__main__":
    unittest.main()
