export type ScheduleKind = "place" | "meal" | "transport";
export type ScheduleStatus = "confirmed" | "candidate";

type ScheduleBase = {
  id: string;
  time: string;
  title: string;
  status: ScheduleStatus;
};

export type ScheduleItem =
  | (ScheduleBase & { kind: "place"; location: string; durationMinutes: number })
  | (ScheduleBase & { kind: "meal"; location: string; reservationName?: string })
  | (ScheduleBase & { kind: "transport"; from: string; to: string });

export type TripDay = { id: string; label: string; date: string; items: ScheduleItem[] };

export type NewScheduleInput = {
  title: string;
  time: string;
  kind: ScheduleKind;
  location: string;
};
