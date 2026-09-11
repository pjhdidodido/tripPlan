"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  CalendarDays,
  ChevronDown,
  CircleDollarSign,
  Clock3,
  MapPin,
  Sparkles,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import {
  createTrip as createTripRequest,
  createTripSchedule,
  deleteTrip as deleteTripRequest,
  deleteTripSchedule,
  getTripDays,
  getTrips,
  updateTripBudget,
  updateTripMembers,
  updateTripSchedule,
} from "../api/trip-api";
import type {
  CreateTripInput,
  NewScheduleInput,
  ScheduleItem,
  ScheduleKind,
  Trip,
  UpdateScheduleInput,
} from "../model/trip";
import { AddScheduleDialog } from "./add-schedule-dialog";
import { EditScheduleDialog } from "./edit-schedule-dialog";
import { ManageBudgetDialog } from "./manage-budget-dialog";
import { ManageMembersDialog } from "./manage-members-dialog";
import { ScheduleTimeline } from "./schedule-timeline";
import { TripSwitcher } from "./trip-switcher";

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
  const [activeDayId, setActiveDayId] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ScheduleItem | null>(null);
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
    },
    [currentTrip],
  );

  const saveBudget = useCallback(
    async (budget: number) => {
      if (!currentTrip) return;
      const updated = await updateTripBudget(currentTrip.id, { budget });
      setTrips((current) =>
        current.map((trip) => (trip.id === updated.id ? updated : trip)),
      );
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
    },
    [tripId],
  );

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
          <a className="active" href="#plan">
            여행 계획
          </a>
          <a href="#budget">공동 경비</a>
          <a href="#decisions">결정 보드</a>
        </nav>
        <Button className="invite-button">
          <Users /> 공유하기
        </Button>
      </header>

      <div className="app-shell">
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
          {currentTrip && (
            <div className="budget-mini" id="budget">
              <div className="people-heading">
                <p className="eyebrow">공동 예산</p>
                <ManageBudgetDialog
                  key={currentTrip.id}
                  trip={currentTrip}
                  onSave={saveBudget}
                />
              </div>
              <strong>₩{currentTrip.budget.toLocaleString("ko-KR")}</strong>
              <Progress value={0} aria-label="사용 내역 미등록" />
              <div className="budget-row">
                <span>사용 내역 미등록</span>
                <span>₩0</span>
              </div>
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
          {currentTrip && activeDay ? (
            <>
              <div className="plan-heading">
                <div>
                  <p className="kicker">
                    <Sparkles /> 모두의 선택을 한 흐름으로
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
                  <span className="save-indicator">Python API에 자동 저장</span>{" "}
                  · 여행별로 독립된 일정입니다.
                </p>
              </div>
              <ScheduleTimeline
                items={activeDay.items}
                onCreate={() => setIsOpen(true)}
                onEdit={setEditingItem}
                onDelete={(item) => deleteSchedule(activeDayId, item)}
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

        <aside className="insight-rail">
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
          <section className="decision-card" id="decisions">
            <div className="section-icon">
              <CircleDollarSign />
            </div>
            <p className="eyebrow">오늘 결정할 것</p>
            <h2>
              {currentTrip?.id === "kyoto-autumn" ? (
                <>
                  료칸 조식,
                  <br />
                  추가할까요?
                </>
              ) : (
                <>
                  {currentTrip?.destination ?? "다음 여행"}의 첫 활동,
                  <br />
                  정해볼까요?
                </>
              )}
            </h2>
            <div className="vote-track">
              <span style={{ width: "75%" }} />
            </div>
            <div className="vote-result">
              <strong>찬성 3</strong>
              <span>대기 1</span>
            </div>
            <Button variant="outline" className="vote-button">
              투표 보러가기 <ArrowUpRight />
            </Button>
          </section>
          <div className="weather-note">
            <span>18°</span>
            <div>
              <strong>맑고 선선해요</strong>
              <p>오후 강수 확률 10%</p>
            </div>
            <Clock3 />
          </div>
        </aside>
      </div>
    </main>
  );
}
