import json
from datetime import date, timedelta
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from .schemas import WeatherForecast


def _get_json(url: str, params: dict[str, str | int | float]) -> dict:
    request = Request(f"{url}?{urlencode(params)}", headers={"User-Agent": "TripWeave/1.0"})
    with urlopen(request, timeout=8) as response:
        return json.load(response)


def get_weather_forecast(destination: str, start_date: str, end_date: str) -> WeatherForecast:
    today = date.today()
    trip_start = date.fromisoformat(start_date)
    trip_end = date.fromisoformat(end_date)
    forecast_end = today + timedelta(days=15)

    if trip_end < today or trip_start > forecast_end:
        return WeatherForecast(
            status="unavailable",
            locationName=destination,
            message="날씨 예보는 여행 시작 16일 전부터 확인할 수 있어요.",
        )

    try:
        geocoding = _get_json(
            "https://geocoding-api.open-meteo.com/v1/search",
            {"name": destination, "count": 1, "language": "ko", "format": "json"},
        )
        locations = geocoding.get("results", [])
        if not locations:
            return WeatherForecast(status="unavailable", locationName=destination, message="여행지 위치를 찾지 못했어요.")

        location = locations[0]
        visible_start = max(today, trip_start)
        visible_end = min(forecast_end, trip_end)
        forecast = _get_json(
            "https://api.open-meteo.com/v1/forecast",
            {
                "latitude": location["latitude"],
                "longitude": location["longitude"],
                "daily": "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
                "timezone": "auto",
                "start_date": visible_start.isoformat(),
                "end_date": visible_end.isoformat(),
            },
        )
        daily = forecast["daily"]
        days = [
            {
                "date": day,
                "weatherCode": daily["weather_code"][index],
                "temperatureMax": daily["temperature_2m_max"][index],
                "temperatureMin": daily["temperature_2m_min"][index],
                "precipitationProbability": daily["precipitation_probability_max"][index] or 0,
            }
            for index, day in enumerate(daily["time"])
        ]
        return WeatherForecast(status="forecast", locationName=location["name"], days=days)
    except (OSError, KeyError, ValueError, TypeError):
        return WeatherForecast(status="error", locationName=destination, message="날씨 정보를 잠시 불러올 수 없어요.")
