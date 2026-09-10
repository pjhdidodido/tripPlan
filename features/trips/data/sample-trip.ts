import type { TripDay } from "../model/trip";

export const SAMPLE_TRIP_ID = "kyoto-autumn";

export const sampleTripDays: TripDay[] = [
  { id: "day-1", label: "DAY 1", date: "10월 17일", items: [] },
  {
    id: "day-2",
    label: "DAY 2",
    date: "10월 18일",
    items: [
      { id: "a1", kind: "place", time: "09:30", title: "기요미즈데라 산책", location: "히가시야마", durationMinutes: 120, status: "confirmed" },
      { id: "a2", kind: "meal", time: "12:10", title: "오멘 은각사점", location: "사쿄구", reservationName: "민서", status: "confirmed" },
      { id: "a3", kind: "transport", time: "14:00", title: "철학의 길로 이동", from: "은각사", to: "난젠지", status: "confirmed" },
      { id: "a4", kind: "place", time: "17:20", title: "가모강 노을 피크닉", location: "데마치야나기", durationMinutes: 90, status: "candidate" },
    ],
  },
  { id: "day-3", label: "DAY 3", date: "10월 19일", items: [] },
  { id: "day-4", label: "DAY 4", date: "10월 20일", items: [] },
];
