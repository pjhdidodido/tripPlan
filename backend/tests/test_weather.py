import unittest
from datetime import date, timedelta
from unittest.mock import patch

from backend.app.services.weather import get_weather_forecast


class WeatherServiceTest(unittest.TestCase):
    def test_forecast_is_mapped_for_trip_dates(self) -> None:
        start = date.today() + timedelta(days=1)
        end = start + timedelta(days=1)
        responses = [
            {"results": [{"name": "교토", "latitude": 35.02, "longitude": 135.75}]},
            {
                "daily": {
                    "time": [start.isoformat(), end.isoformat()],
                    "weather_code": [1, 61],
                    "temperature_2m_max": [24.3, 21.1],
                    "temperature_2m_min": [15.2, 14.7],
                    "precipitation_probability_max": [10, 70],
                }
            },
        ]
        with patch("backend.app.services.weather._get_json", side_effect=responses):
            result = get_weather_forecast("교토", start.isoformat(), end.isoformat())

        self.assertEqual(result.status, "forecast")
        self.assertEqual(result.locationName, "교토")
        self.assertEqual(result.days[1].precipitationProbability, 70)

    def test_future_trip_explains_forecast_window(self) -> None:
        start = date.today() + timedelta(days=30)
        result = get_weather_forecast("교토", start.isoformat(), start.isoformat())
        self.assertEqual(result.status, "unavailable")
        self.assertIn("16일", result.message or "")


if __name__ == "__main__":
    unittest.main()
