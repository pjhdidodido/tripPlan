export type ScheduleKind = "place" | "meal" | "transport";
export type ScheduleStatus = "confirmed" | "candidate";

type ScheduleBase = {
  id: string;
  time: string;
  title: string;
  status: ScheduleStatus;
  memo?: string;
  preCost: number;
  imageUrl?: string;
  comments: ScheduleComment[];
};

export type ScheduleComment = {
  id: string;
  member: string;
  content: string;
  createdAt: string;
};

export type ScheduleItem =
  | (ScheduleBase & { kind: "place"; location: string; durationMinutes: number })
  | (ScheduleBase & { kind: "meal"; location: string; reservationName?: string })
  | (ScheduleBase & { kind: "transport"; from: string; to: string });

export type TripDay = {
  id: string;
  label: string;
  date: string;
  items: ScheduleItem[];
};

export type Trip = {
  id: string;
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  members: string[];
  budget: number;
};

export type CreateTripInput = Omit<Trip, "id">;

export type UpdateTripMembersInput = Pick<Trip, "members">;

export type UpdateTripBudgetInput = Pick<Trip, "budget">;

export type NewScheduleInput = {
  title: string;
  time: string;
  kind: ScheduleKind;
  location: string;
  memo?: string;
  preCost?: number;
};

export type UpdateScheduleInput = {
  title: string;
  time: string;
  status: ScheduleStatus;
  kind: ScheduleKind;
  location: string;
  memo?: string;
  preCost?: number;
};

export type WeatherDay = {
  date: string;
  weatherCode: number;
  temperatureMax: number;
  temperatureMin: number;
  precipitationProbability: number;
};

export type WeatherForecast = {
  status: "forecast" | "unavailable" | "error";
  locationName: string;
  days: WeatherDay[];
  message?: string;
};

export type ChecklistItem = {
  id: string;
  owner?: string;
  title: string;
  checked: boolean;
};

export type ReservationKind = "stay" | "flight" | "train" | "ticket" | "other";

export type Reservation = {
  id: string;
  kind: ReservationKind;
  title: string;
  provider?: string;
  startAt?: string;
  confirmationNumber?: string;
  address?: string;
  link?: string;
  memo?: string;
  imageUrl?: string;
};

export type ReservationInput = Omit<Reservation, "id" | "imageUrl">;
