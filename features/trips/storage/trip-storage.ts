import { z } from "zod";
import type { TripDay } from "../model/trip";

const scheduleBaseSchema = z.object({
  id: z.string(),
  time: z.string(),
  title: z.string(),
  status: z.enum(["confirmed", "candidate"]),
});

const scheduleItemSchema = z.discriminatedUnion("kind", [
  scheduleBaseSchema.extend({ kind: z.literal("place"), location: z.string(), durationMinutes: z.number() }),
  scheduleBaseSchema.extend({ kind: z.literal("meal"), location: z.string(), reservationName: z.string().optional() }),
  scheduleBaseSchema.extend({ kind: z.literal("transport"), from: z.string(), to: z.string() }),
]);

const tripDaysSchema = z.array(z.object({
  id: z.string(),
  label: z.string(),
  date: z.string(),
  items: z.array(scheduleItemSchema),
}));

function storageKey(tripId: string): string {
  return `tripweave:trip:${tripId}:days:v1`;
}

export function loadTripDays(tripId: string, fallback: TripDay[]): TripDay[] {
  try {
    const stored = localStorage.getItem(storageKey(tripId));
    if (!stored) return fallback;
    const result = tripDaysSchema.safeParse(JSON.parse(stored));
    return result.success ? result.data : fallback;
  } catch {
    return fallback;
  }
}

export function saveTripDays(tripId: string, days: TripDay[]): void {
  try {
    localStorage.setItem(storageKey(tripId), JSON.stringify(days));
  } catch {
    // Storage can be unavailable in private browsing or when the quota is full.
  }
}
