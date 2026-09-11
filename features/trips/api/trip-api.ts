import { z } from "zod";
import type { CreateTripInput, NewScheduleInput, ScheduleItem, Trip, TripDay, UpdateScheduleInput, UpdateTripBudgetInput, UpdateTripMembersInput } from "../model/trip";

const scheduleBaseSchema = z.object({ id: z.string(), time: z.string(), title: z.string(), status: z.enum(["confirmed", "candidate"]) });
const scheduleItemSchema = z.discriminatedUnion("kind", [
  scheduleBaseSchema.extend({ kind: z.literal("place"), location: z.string(), durationMinutes: z.number() }),
  scheduleBaseSchema.extend({ kind: z.literal("meal"), location: z.string(), reservationName: z.string().nullish().transform((value) => value ?? undefined) }),
  scheduleBaseSchema.extend({ kind: z.literal("transport"), from: z.string(), to: z.string() }),
]);
const tripDaysSchema = z.array(z.object({ id: z.string(), label: z.string(), date: z.string(), items: z.array(scheduleItemSchema) }));
const tripSchema = z.object({ id: z.string(), title: z.string(), destination: z.string(), startDate: z.string(), endDate: z.string(), members: z.array(z.string()), budget: z.number() });

const API_URL = (process.env.NEXT_PUBLIC_TRIPWEAVE_API_URL ?? "http://127.0.0.1:8000").replace(/\/$/, "");

async function request(path: string, init?: RequestInit): Promise<unknown> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!response.ok) throw new Error(`TripWeave API 요청 실패 (${response.status})`);
  return response.status === 204 ? undefined : response.json();
}

export async function getTripDays(tripId: string, signal?: AbortSignal): Promise<TripDay[]> {
  return tripDaysSchema.parse(await request(`/api/trips/${encodeURIComponent(tripId)}/days`, { signal }));
}

export async function getTrips(signal?: AbortSignal): Promise<Trip[]> {
  return z.array(tripSchema).parse(await request("/api/trips", { signal }));
}

export async function createTrip(input: CreateTripInput): Promise<Trip> {
  return tripSchema.parse(await request("/api/trips", { method: "POST", body: JSON.stringify(input) }));
}

export async function updateTripMembers(tripId: string, input: UpdateTripMembersInput): Promise<Trip> {
  return tripSchema.parse(await request(`/api/trips/${encodeURIComponent(tripId)}/members`, { method: "PUT", body: JSON.stringify(input) }));
}

export async function updateTripBudget(tripId: string, input: UpdateTripBudgetInput): Promise<Trip> {
  return tripSchema.parse(await request(`/api/trips/${encodeURIComponent(tripId)}/budget`, { method: "PUT", body: JSON.stringify(input) }));
}

export async function deleteTrip(tripId: string): Promise<void> {
  await request(`/api/trips/${encodeURIComponent(tripId)}`, { method: "DELETE" });
}

export async function createTripSchedule(tripId: string, dayId: string, input: NewScheduleInput): Promise<ScheduleItem> {
  const result = await request(`/api/trips/${encodeURIComponent(tripId)}/days/${encodeURIComponent(dayId)}/schedules`, { method: "POST", body: JSON.stringify(input) });
  return scheduleItemSchema.parse(result);
}

export async function updateTripSchedule(tripId: string, dayId: string, itemId: string, input: UpdateScheduleInput): Promise<ScheduleItem> {
  const result = await request(`/api/trips/${encodeURIComponent(tripId)}/days/${encodeURIComponent(dayId)}/schedules/${encodeURIComponent(itemId)}`, { method: "PATCH", body: JSON.stringify(input) });
  return scheduleItemSchema.parse(result);
}

export async function deleteTripSchedule(tripId: string, dayId: string, itemId: string): Promise<void> {
  await request(`/api/trips/${encodeURIComponent(tripId)}/days/${encodeURIComponent(dayId)}/schedules/${encodeURIComponent(itemId)}`, { method: "DELETE" });
}
