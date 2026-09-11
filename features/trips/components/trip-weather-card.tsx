import { CloudRain, CloudSun, LoaderCircle, Sun } from "lucide-react";
import type { WeatherForecast } from "../model/trip";

type TripWeatherCardProps = { weather: WeatherForecast | null; loading: boolean };

function weatherLabel(code: number): string {
  if (code <= 1) return "맑음";
  if (code <= 3) return "구름 조금";
  if (code >= 51 && code <= 67) return "비";
  if (code >= 71 && code <= 77) return "눈";
  if (code >= 80 && code <= 82) return "소나기";
  if (code >= 95) return "뇌우";
  return "흐림";
}

export function TripWeatherCard({ weather, loading }: TripWeatherCardProps) {
  if (loading) return <div className="weather-card weather-state"><LoaderCircle className="weather-spinner" /><p>여행지 날씨를 확인하고 있어요.</p></div>;
  if (!weather || weather.status !== "forecast") {
    return <div className="weather-card weather-state"><CloudSun /><strong>여행지 날씨</strong><p>{weather?.message ?? "날씨 정보를 불러올 수 없어요."}</p></div>;
  }

  return (
    <section className="weather-card">
      <div className="weather-card-heading"><div><span>OPEN-METEO 예보</span><strong>{weather.locationName}</strong></div><CloudSun /></div>
      <div className="weather-days">
        {weather.days.map((day) => {
          const Icon = day.precipitationProbability >= 40 ? CloudRain : Sun;
          return (
            <div className="weather-day" key={day.date}>
              <span>{new Intl.DateTimeFormat("ko-KR", { month: "numeric", day: "numeric" }).format(new Date(`${day.date}T00:00:00`))}</span>
              <Icon />
              <strong>{weatherLabel(day.weatherCode)}</strong>
              <p>{Math.round(day.temperatureMin)}° / {Math.round(day.temperatureMax)}°</p>
              <small>강수 {day.precipitationProbability}%</small>
            </div>
          );
        })}
      </div>
    </section>
  );
}
