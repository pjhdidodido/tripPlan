"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronDown,
  MapPin,
  PanelRightClose,
  PanelRightOpen,
  Sparkles,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import {
  createChecklistItem,
  createReservation as createReservationRequest,
  createTrip as createTripRequest,
  createScheduleComment,
  createTripSchedule,
  deleteChecklistItem,
  deleteReservation as deleteReservationRequest,
  deleteReservationImage,
  deleteScheduleImage,
  deleteTrip as deleteTripRequest,
  deleteTripSchedule,
  getTripChecklist,
  getTripDays,
  getTripWeather,
  getTripReservations,
  getTrips,
  updateChecklistItem,
  updateReservation as updateReservationRequest,
  updateTripMembers,
  updateTripSchedule,
  uploadScheduleImage,
  uploadReservationImage,
} from "../api/trip-api";
import type {
  ChecklistItem,
  CreateTripInput,
  NewScheduleInput,
  Reservation,
  ReservationInput,
  ScheduleItem,
  ScheduleKind,
  Trip,
  UpdateScheduleInput,
  WeatherForecast,
} from "../model/trip";
import { AddScheduleDialog } from "./add-schedule-dialog";
import { ChecklistBoard } from "./checklist-board";
import { EditScheduleDialog } from "./edit-schedule-dialog";
import { ManageMembersDialog } from "./manage-members-dialog";
import { ReservationVault } from "./reservation-vault";
import { ScheduleDetailDialog } from "./schedule-detail-dialog";
import { ScheduleTimeline } from "./schedule-timeline";
import { TripSwitcher } from "./trip-switcher";
import { TripWeatherCard } from "./trip-weather-card";

type TripPlannerProps = { tripId: string };

function formatTripDateRange(trip: Trip): string {
  const [startYear, startMonth, startDay] = trip.startDate.split("-");
  const [endYear, endMonth, endDay] = trip.endDate.split("-");
  return startYear === endYear
    ? `${startYear}. ${startMonth}. ${startDay} — ${endMonth}. ${endDay}`
    : `${startYear}. ${startMonth}. ${startDay} — ${endYear}. ${endMonth}. ${endDay}`;
}

export function TripPlanner({ tripId }: TripPlannerProps) {
  const router = useRouter();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [days, setDays] = useState<Awaited<ReturnType<typeof getTripDays>>>([]);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [activeView, setActiveView] = useState<"schedule" | "checklist" | "reservations">("schedule");
  const [insightOpen, setInsightOpen] = useState(true);
  const [activeDayId, setActiveDayId] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ScheduleItem | null>(null);
  const [detailItem, setDetailItem] = useState<ScheduleItem | null>(null);
  const [weatherResult, setWeatherResult] = useState<{ tripId: string; data: WeatherForecast } | null>(null);
  const currentTrip = useMemo(
    () => trips.find((trip) => trip.id === tripId) ?? null,
    [trips, tripId],
  );
  const activeDay = useMemo(
    () => days.find((day) => day.id === activeDayId) ?? days[0],
    [days, activeDayId],
  );

  useEffect(() => {
    const controller = new AbortController();
    void getTrips(controller.signal)
      .then(setTrips)
      .catch(() => toast.error("여행 목록을 불러오지 못했어요."));
    void getTripDays(tripId, controller.signal)
      .then((loadedDays) => {
        setDays(loadedDays);
        setActiveDayId(loadedDays[0]?.id ?? "");
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError")
          return;
        setDays([]);
        setActiveDayId("");
        if (tripId !== "empty")
          toast.error("선택한 여행의 일정을 불러오지 못했어요.");
      });
    void getTripChecklist(tripId, controller.signal)
      .then(setChecklist)
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setChecklist([]);
        if (tripId !== "empty") toast.error("체크리스트를 불러오지 못했어요.");
      });
    void getTripReservations(tripId, controller.signal)
      .then(setReservations)
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setReservations([]);
        if (tripId !== "empty") toast.error("예약 정보를 불러오지 못했어요.");
      });
    return () => controller.abort();
  }, [tripId]);

  useEffect(() => {
    if (tripId === "empty") return;
    const controller = new AbortController();
    void getTripWeather(tripId, controller.signal)
      .then((data) => setWeatherResult({ tripId, data }))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setWeatherResult({ tripId, data: { status: "error", locationName: "", days: [], message: "날씨 정보를 불러오지 못했어요." } });
      });
    return () => controller.abort();
  }, [tripId]);

  const createNewTrip = useCallback(
    async (input: CreateTripInput) => {
      const created = await createTripRequest(input);
      setTrips((current) => [...current, created]);
      router.push(`/trips/${created.id}`);
    },
    [router],
  );

  const removeTrip = useCallback(
    async (trip: Trip) => {
      try {
        await deleteTripRequest(trip.id);
        const remaining = trips.filter((candidate) => candidate.id !== trip.id);
        setTrips(remaining);
        if (trip.id === tripId)
          router.push(
            remaining[0] ? `/trips/${remaining[0].id}` : "/trips/empty",
          );
        toast.success(`“${trip.title}” 여행을 삭제했어요.`);
      } catch {
        toast.error("여행을 삭제하지 못했어요.");
      }
    },
    [router, tripId, trips],
  );

  const saveMembers = useCallback(
    async (members: string[]) => {
      if (!currentTrip) return;
      const updated = await updateTripMembers(currentTrip.id, { members });
      setTrips((current) =>
        current.map((trip) => (trip.id === updated.id ? updated : trip)),
      );
      setChecklist(await getTripChecklist(currentTrip.id));
    },
    [currentTrip],
  );

  const appendSchedule = useCallback(
    async (input: NewScheduleInput, dayId: string): Promise<string> => {
      const title = input.title.trim();
      const location = input.location.trim();
      if (!title || !location)
        throw new Error("일정 이름과 장소가 필요합니다.");
      const item = await createTripSchedule(tripId, dayId, {
        ...input,
        title,
        location,
      });

      setDays((current) =>
        current.map((day) =>
          day.id === dayId
            ? {
                ...day,
                items: [...day.items, item].sort((a, b) =>
                  a.time.localeCompare(b.time),
                ),
              }
            : day,
        ),
      );
      return item.id;
    },
    [tripId],
  );

  const updateSchedule = useCallback(
    async (dayId: string, itemId: string, input: UpdateScheduleInput) => {
      const updated = await updateTripSchedule(tripId, dayId, itemId, input);
      setDays((current) =>
        current.map((day) =>
          day.id === dayId
            ? {
                ...day,
                items: day.items
                  .map((item) => (item.id === itemId ? updated : item))
                  .sort((a, b) => a.time.localeCompare(b.time)),
              }
            : day,
        ),
      );
      setDetailItem((current) => current?.id === itemId ? updated : current);
    },
    [tripId],
  );

  const replaceScheduleItem = useCallback((dayId: string, updated: ScheduleItem) => {
    setDays((current) => current.map((day) => day.id === dayId ? { ...day, items: day.items.map((item) => item.id === updated.id ? updated : item) } : day));
    setDetailItem((current) => current?.id === updated.id ? updated : current);
  }, []);

  const uploadImage = useCallback(async (dayId: string, itemId: string, file: File) => {
    const updated = await uploadScheduleImage(tripId, dayId, itemId, file);
    replaceScheduleItem(dayId, updated);
  }, [replaceScheduleItem, tripId]);

  const removeImage = useCallback(async (dayId: string, itemId: string) => {
    const updated = await deleteScheduleImage(tripId, dayId, itemId);
    replaceScheduleItem(dayId, updated);
  }, [replaceScheduleItem, tripId]);

  const addComment = useCallback(async (dayId: string, itemId: string, member: string, content: string) => {
    const created = await createScheduleComment(tripId, dayId, itemId, member, content);
    setDays((current) => current.map((day) => day.id === dayId ? { ...day, items: day.items.map((item) => item.id === itemId ? { ...item, comments: [...item.comments, created] } : item) } : day));
    setDetailItem((current) => current?.id === itemId ? { ...current, comments: [...current.comments, created] } : current);
  }, [tripId]);

  const addChecklistItem = useCallback(async (title: string, owner?: string) => {
    const created = await createChecklistItem(tripId, title, owner);
    setChecklist((current) => [...current, created]);
  }, [tripId]);

  const saveChecklistItem = useCallback(async (item: ChecklistItem) => {
    const updated = await updateChecklistItem(tripId, item);
    setChecklist((current) => current.map((candidate) => candidate.id === updated.id ? updated : candidate));
  }, [tripId]);

  const removeChecklistItem = useCallback(async (itemId: string) => {
    await deleteChecklistItem(tripId, itemId);
    setChecklist((current) => current.filter((item) => item.id !== itemId));
  }, [tripId]);

  const addReservation = useCallback(async (input: ReservationInput) => {
    const created = await createReservationRequest(tripId, input);
    setReservations((current) => [...current, created].sort((a, b) => (a.startAt ?? "9999").localeCompare(b.startAt ?? "9999")));
  }, [tripId]);

  const saveReservation = useCallback(async (reservationId: string, input: ReservationInput) => {
    const updated = await updateReservationRequest(tripId, reservationId, input);
    setReservations((current) => current.map((item) => item.id === updated.id ? updated : item).sort((a, b) => (a.startAt ?? "9999").localeCompare(b.startAt ?? "9999")));
  }, [tripId]);

  const removeReservation = useCallback(async (reservationId: string) => {
    await deleteReservationRequest(tripId, reservationId);
    setReservations((current) => current.filter((item) => item.id !== reservationId));
  }, [tripId]);

  const saveReservationImage = useCallback(async (reservationId: string, file: File) => {
    const updated = await uploadReservationImage(tripId, reservationId, file);
    setReservations((current) => current.map((item) => item.id === updated.id ? updated : item));
    return updated;
  }, [tripId]);

  const removeReservationImage = useCallback(async (reservationId: string) => {
    const updated = await deleteReservationImage(tripId, reservationId);
    setReservations((current) => current.map((item) => item.id === updated.id ? updated : item));
    return updated;
  }, [tripId]);

  const deleteSchedule = useCallback(
    async (dayId: string, item: ScheduleItem) => {
      try {
        await deleteTripSchedule(tripId, dayId, item.id);
      } catch {
        toast.error(
          "일정을 삭제하지 못했어요. Python API가 실행 중인지 확인해 주세요.",
        );
        return;
      }
      setDays((current) =>
        current.map((day) =>
          day.id === dayId
            ? {
                ...day,
                items: day.items.filter(
                  (candidate) => candidate.id !== item.id,
                ),
              }
            : day,
        ),
      );
      toast.success(`“${item.title}” 일정을 삭제했어요.`);
    },
    [tripId],
  );

  useEffect(() => {
    type ToolInput = {
      dayId?: unknown;
      title?: unknown;
      time?: unknown;
      kind?: unknown;
      location?: unknown;
    };
    type ModelContext = {
      registerTool(
        tool: {
          name: string;
          title: string;
          description: string;
          inputSchema: object;
          annotations: { readOnlyHint: false; untrustedContentHint: false };
          execute(input: unknown): unknown;
        },
        options: { signal: AbortSignal },
      ): void | Promise<void>;
    };
    const context = (document as Document & { modelContext?: ModelContext })
      .modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const registration = context.registerTool(
      {
        name: "add_trip_schedule",
        title: "여행 일정 추가",
        description: "TripWeave의 지정한 여행 날짜에 후보 일정을 추가합니다.",
        inputSchema: {
          type: "object",
          properties: {
            dayId: { type: "string", enum: days.map((day) => day.id) },
            title: { type: "string", minLength: 1 },
            time: { type: "string", pattern: "^[0-2][0-9]:[0-5][0-9]$" },
            kind: { type: "string", enum: ["place", "meal", "transport"] },
            location: { type: "string", minLength: 1 },
          },
          required: ["dayId", "title", "time", "kind", "location"],
          additionalProperties: false,
        },
        annotations: { readOnlyHint: false, untrustedContentHint: false },
        async execute(input: unknown) {
          const value = input as ToolInput;
          if (
            typeof value.dayId !== "string" ||
            !days.some((day) => day.id === value.dayId) ||
            typeof value.title !== "string" ||
            typeof value.time !== "string" ||
            typeof value.location !== "string" ||
            !["place", "meal", "transport"].includes(String(value.kind))
          ) {
            throw new Error(
              "올바른 날짜, 이름, 시간, 종류, 장소를 입력해 주세요.",
            );
          }
          const id = await appendSchedule(
            {
              title: value.title,
              time: value.time,
              kind: value.kind as ScheduleKind,
              location: value.location,
            },
            value.dayId,
          );
          return { id, tripId, dayId: value.dayId, status: "candidate" };
        },
      },
      { signal: lifecycle.signal },
    );
    void Promise.resolve(registration).catch(() => undefined);
    return () => lifecycle.abort();
  }, [appendSchedule, days, tripId]);

  const dateRange = currentTrip
    ? formatTripDateRange(currentTrip)
    : "여행을 선택해 주세요";
  const tripLength = currentTrip
    ? Math.round(
        (new Date(currentTrip.endDate).getTime() -
          new Date(currentTrip.startDate).getTime()) /
          86400000,
      ) + 1
    : 0;
  return (
    <main className="min-h-screen bg-background text-foreground">
      <Toaster richColors position="bottom-center" />
      <header className="topbar">
        <div className="brand-mark">
          <span>TW</span>
        </div>
        <div className="brand-name">
          TRIP<span>/</span>WEAVE
        </div>
        <nav aria-label="주요 메뉴" className="main-nav">
          <TripSwitcher
            trips={trips}
            currentTrip={currentTrip}
            onSelect={(trip) => router.push(`/trips/${trip.id}`)}
            onCreate={createNewTrip}
            onDelete={removeTrip}
          />
          <button className={`nav-tab ${activeView === "schedule" ? "active" : ""}`} type="button" onClick={() => setActiveView("schedule")}>여행 일정</button>
          <button className={`nav-tab ${activeView === "checklist" ? "active" : ""}`} type="button" onClick={() => setActiveView("checklist")}>체크리스트</button>
          <button className={`nav-tab ${activeView === "reservations" ? "active" : ""}`} type="button" onClick={() => setActiveView("reservations")}>예약 보관함</button>
        </nav>
        <div className="header-actions">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="insight-toggle"
            aria-label={insightOpen ? "오른쪽 패널 접기" : "오른쪽 패널 펼치기"}
            aria-expanded={insightOpen}
            onClick={() => setInsightOpen((current) => !current)}
          >
            {insightOpen ? <PanelRightClose /> : <PanelRightOpen />}
          </Button>
          <Button className="invite-button"><Users /> 공유하기</Button>
        </div>
      </header>

      <div className={`app-shell ${insightOpen ? "" : "insight-collapsed"}`}>
        <aside className="trip-rail" aria-label="여행 정보">
          <div>
            <p className="eyebrow">선택한 여행</p>
            <h2>{currentTrip?.title ?? "여행을 선택해 주세요"}</h2>
            <div className="trip-meta">
              <CalendarDays />
              <span>
                {dateRange}
                <br />
                {currentTrip && (
                  <strong>
                    {tripLength - 1}박 {tripLength}일
                  </strong>
                )}
              </span>
            </div>
          </div>
          {currentTrip && (
            <div className="people-block">
              <div className="people-heading">
                <p className="eyebrow">함께 가는 사람</p>
                <ManageMembersDialog
                  key={currentTrip.id}
                  trip={currentTrip}
                  onSave={saveMembers}
                />
              </div>
              <div
                className="avatars"
                aria-label={`참여자 ${currentTrip.members.length}명`}
              >
                {currentTrip.members.map((member, index) => (
                  <span
                    className={`avatar a${(index % 4) + 1}`}
                    key={`${member}-${index}`}
                  >
                    {member.slice(0, 1)}
                  </span>
                ))}
              </div>
              <p>{currentTrip.members.length}명이 계획 중</p>
            </div>
          )}
          <button
            className="switch-trip"
            onClick={() =>
              document
                .querySelector<HTMLButtonElement>(".trip-switcher-trigger")
                ?.click()
            }
          >
            다른 여행 보기 <ChevronDown />
          </button>
        </aside>

        <section className="plan-canvas" id="plan">
          {currentTrip && activeDay && activeView === "schedule" ? (
            <>
              <div className="plan-heading">
                <div>
                  <p className="kicker">
                    <Sparkles /> 하나 둘 셋-! 화이팅!!
                  </p>
                  <h1>{currentTrip.destination} 일정</h1>
                </div>
                <AddScheduleDialog
                  date={activeDay.date}
                  open={isOpen}
                  onOpenChange={setIsOpen}
                  onAdd={async (input) => {
                    await appendSchedule(input, activeDayId);
                  }}
                />
              </div>
              <div
                className="day-tabs"
                style={{
                  gridTemplateColumns: `repeat(${days.length}, minmax(88px, 1fr))`,
                }}
                role="tablist"
                aria-label="여행 날짜"
              >
                {days.map((day) => (
                  <button
                    key={day.id}
                    role="tab"
                    aria-selected={day.id === activeDayId}
                    onClick={() => setActiveDayId(day.id)}
                  >
                    <span>{day.label}</span>
                    <strong>{day.date.replace("월 ", ".")}</strong>
                  </button>
                ))}
              </div>
              <div className="day-summary">
                <div>
                  <span>{activeDay.date}</span>
                  <strong>{activeDay.items.length}개의 일정</strong>
                </div>
                <p>
                  <span className="save-indicator">일정 클릭 시 상세보기</span>{" "}
                  · 여행별로 독립된 일정입니다.
                </p>
              </div>
              <ScheduleTimeline
                items={activeDay.items}
                onCreate={() => setIsOpen(true)}
                onView={setDetailItem}
                onEdit={setEditingItem}
                onDelete={(item) => deleteSchedule(activeDayId, item)}
              />
              <ScheduleDetailDialog
                key={detailItem?.id ?? "detail-closed"}
                item={detailItem}
                members={currentTrip.members}
                open={detailItem !== null}
                onOpenChange={(open) => { if (!open) setDetailItem(null); }}
                onEdit={() => { if (detailItem) setEditingItem(detailItem); setDetailItem(null); }}
                onUploadImage={(file) => detailItem ? uploadImage(activeDayId, detailItem.id, file) : Promise.resolve()}
                onDeleteImage={() => detailItem ? removeImage(activeDayId, detailItem.id) : Promise.resolve()}
                onAddComment={(member, content) => detailItem ? addComment(activeDayId, detailItem.id, member, content) : Promise.resolve()}
              />
              <EditScheduleDialog
                key={editingItem?.id ?? "closed"}
                item={editingItem}
                open={editingItem !== null}
                onOpenChange={(open) => {
                  if (!open) setEditingItem(null);
                }}
                onSave={(input) => {
                  if (editingItem)
                    return updateSchedule(activeDayId, editingItem.id, input);
                }}
              />
            </>
          ) : currentTrip && activeView === "checklist" ? (
            <ChecklistBoard
              members={currentTrip.members}
              items={checklist}
              onCreate={addChecklistItem}
              onUpdate={saveChecklistItem}
              onDelete={removeChecklistItem}
            />
          ) : currentTrip && activeView === "reservations" ? (
            <ReservationVault
              reservations={reservations}
              onCreate={addReservation}
              onUpdate={saveReservation}
              onDelete={removeReservation}
              onUploadImage={saveReservationImage}
              onDeleteImage={removeReservationImage}
            />
          ) : (
            <div className="no-trip">
              <MapPin />
              <h1>계획할 여행을 선택해 주세요</h1>
              <p>
                상단의 여행 선택 메뉴에서 기존 여행을 고르거나 새 여행을 만들 수
                있습니다.
              </p>
              <Button
                onClick={() =>
                  document
                    .querySelector<HTMLButtonElement>(".trip-switcher-trigger")
                    ?.click()
                }
              >
                여행 목록 열기
              </Button>
            </div>
          )}
        </section>

        <aside className="insight-rail" aria-hidden={!insightOpen}>
          <div className="destination-card">
            <div
              className={`destination-image ${currentTrip?.id === "kyoto-autumn" ? "kyoto" : "generic"}`}
              role="img"
              aria-label={`${currentTrip?.destination ?? "여행지"} 이미지`}
            />
            <div className="destination-caption">
              <span>
                {currentTrip?.destination.toUpperCase() ?? "NEXT DESTINATION"}
              </span>
              <strong>{currentTrip?.title ?? "우리의 다음 장면"}</strong>
            </div>
          </div>
          {currentTrip && <TripWeatherCard weather={weatherResult?.tripId === tripId ? weatherResult.data : null} loading={weatherResult?.tripId !== tripId} />}
        </aside>
      </div>
    </main>
  );
}
