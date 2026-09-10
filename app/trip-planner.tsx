"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { ArrowUpRight, CalendarDays, Check, ChevronDown, CircleDollarSign, Clock3, MapPin, Navigation, Plus, Sparkles, TrainFront, Users, Utensils } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Toaster } from "@/components/ui/sonner";
import type { NewScheduleInput, ScheduleItem, ScheduleKind, TripDay } from "@/lib/trip-types";

const initialDays: TripDay[] = [
  { id: "day-1", label: "DAY 1", date: "10월 17일", items: [] },
  { id: "day-2", label: "DAY 2", date: "10월 18일", items: [
    { id: "a1", kind: "place", time: "09:30", title: "기요미즈데라 산책", location: "히가시야마", durationMinutes: 120, status: "confirmed" },
    { id: "a2", kind: "meal", time: "12:10", title: "오멘 은각사점", location: "사쿄구", reservationName: "민서", status: "confirmed" },
    { id: "a3", kind: "transport", time: "14:00", title: "철학의 길로 이동", from: "은각사", to: "난젠지", status: "confirmed" },
    { id: "a4", kind: "place", time: "17:20", title: "가모강 노을 피크닉", location: "데마치야나기", durationMinutes: 90, status: "candidate" },
  ]},
  { id: "day-3", label: "DAY 3", date: "10월 19일", items: [] },
  { id: "day-4", label: "DAY 4", date: "10월 20일", items: [] },
];

const kindMeta = {
  place: { label: "장소", icon: MapPin, color: "var(--cobalt)" },
  meal: { label: "식사", icon: Utensils, color: "var(--coral)" },
  transport: { label: "이동", icon: TrainFront, color: "var(--mint-dark)" },
} satisfies Record<ScheduleKind, { label: string; icon: typeof MapPin; color: string }>;

function scheduleDescription(item: ScheduleItem): string {
  switch (item.kind) {
    case "place": return `${item.location} · ${item.durationMinutes}분`;
    case "meal": return `${item.location}${item.reservationName ? ` · ${item.reservationName} 이름으로 예약` : ""}`;
    case "transport": return `${item.from} → ${item.to}`;
  }
}

export function TripPlanner() {
  const [days, setDays] = useState(initialDays);
  const [activeDayId, setActiveDayId] = useState("day-2");
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState<NewScheduleInput>({ title: "", time: "15:00", kind: "place", location: "" });
  const activeDay = useMemo(() => days.find((day) => day.id === activeDayId) ?? days[0], [days, activeDayId]);

  const appendSchedule = useCallback((input: NewScheduleInput, dayId: string): string => {
    const title = input.title.trim();
    const location = input.location.trim();
    if (!title || !location) throw new Error("일정 이름과 장소가 필요합니다.");
    const id = crypto.randomUUID();
    const common = { id, time: input.time, title, status: "candidate" as const };
    const item: ScheduleItem = input.kind === "transport"
      ? { ...common, kind: "transport", from: location, to: "목적지 미정" }
      : input.kind === "meal"
        ? { ...common, kind: "meal", location }
        : { ...common, kind: "place", location, durationMinutes: 60 };
    setDays((current) => current.map((day) => day.id === dayId
      ? { ...day, items: [...day.items, item].sort((a, b) => a.time.localeCompare(b.time)) }
      : day));
    return id;
  }, []);

  useEffect(() => {
    type ToolInput = { dayId?: unknown; title?: unknown; time?: unknown; kind?: unknown; location?: unknown };
    type ModelContext = { registerTool(tool: { name: string; title: string; description: string; inputSchema: object; annotations: { readOnlyHint: false; untrustedContentHint: false }; execute(input: unknown): unknown }, options: { signal: AbortSignal }): void | Promise<void> };
    const context = (document as Document & { modelContext?: ModelContext }).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const registration = context.registerTool({
      name: "add_trip_schedule",
      title: "여행 일정 추가",
      description: "TripWeave의 지정한 여행 날짜에 후보 일정을 추가합니다.",
      inputSchema: {
        type: "object",
        properties: {
          dayId: { type: "string", enum: initialDays.map((day) => day.id) },
          title: { type: "string", minLength: 1 },
          time: { type: "string", pattern: "^[0-2][0-9]:[0-5][0-9]$" },
          kind: { type: "string", enum: ["place", "meal", "transport"] },
          location: { type: "string", minLength: 1 },
        },
        required: ["dayId", "title", "time", "kind", "location"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute(input: unknown) {
        const value = input as ToolInput;
        if (typeof value.dayId !== "string" || !initialDays.some((day) => day.id === value.dayId)
          || typeof value.title !== "string" || typeof value.time !== "string"
          || typeof value.location !== "string" || !["place", "meal", "transport"].includes(String(value.kind))) {
          throw new Error("올바른 날짜, 이름, 시간, 종류, 장소를 입력해 주세요.");
        }
        const id = appendSchedule({ title: value.title, time: value.time, kind: value.kind as ScheduleKind, location: value.location }, value.dayId);
        return { id, dayId: value.dayId, status: "candidate" };
      },
    }, { signal: lifecycle.signal });
    void Promise.resolve(registration).catch(() => undefined);
    return () => lifecycle.abort();
  }, [appendSchedule]);

  function addSchedule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.title.trim() || !form.location.trim()) {
      toast.error("일정 이름과 장소를 입력해 주세요.");
      return;
    }
    appendSchedule(form, activeDayId);
    setForm({ title: "", time: "15:00", kind: "place", location: "" });
    setIsOpen(false);
    toast.success(`${activeDay?.date ?? "선택한 날짜"}에 일정을 추가했어요.`);
  }

  if (!activeDay) return null;

  return (
    <main className="min-h-screen bg-background text-foreground">
      <Toaster richColors position="bottom-center" />
      <header className="topbar">
        <div className="brand-mark"><span>TW</span></div>
        <div className="brand-name">TRIP<span>/</span>WEAVE</div>
        <nav aria-label="주요 메뉴" className="main-nav"><a className="active" href="#plan">여행 계획</a><a href="#budget">공동 경비</a><a href="#decisions">결정 보드</a></nav>
        <Button className="invite-button"><Users /> 초대하기</Button>
      </header>

      <div className="app-shell">
        <aside className="trip-rail" aria-label="여행 정보">
          <div><p className="eyebrow">다가오는 여행</p><h2>교토의<br />느린 가을</h2><div className="trip-meta"><CalendarDays /><span>2026. 10. 17 — 20<br /><strong>3박 4일</strong></span></div></div>
          <div className="people-block"><p className="eyebrow">함께 가는 사람</p><div className="avatars" aria-label="참여자 4명"><span className="avatar a1">민</span><span className="avatar a2">준</span><span className="avatar a3">서</span><span className="avatar a4">나</span></div><p>4명이 계획 중</p></div>
          <div className="budget-mini" id="budget"><div><p className="eyebrow">공동 예산</p><strong>₩1,240,000</strong></div><Progress value={62} aria-label="예산 62% 사용" /><div className="budget-row"><span>사용 62%</span><span>₩768,400</span></div></div>
          <button className="switch-trip">다른 여행 보기 <ChevronDown /></button>
        </aside>

        <section className="plan-canvas" id="plan">
          <div className="plan-heading">
            <div><p className="kicker"><Sparkles /> 모두의 선택을 한 흐름으로</p><h1>교토 일정</h1></div>
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
              <DialogTrigger asChild><Button className="add-button"><Plus /> 일정 추가</Button></DialogTrigger>
              <DialogContent className="dialog-panel">
                <DialogHeader><DialogTitle>새 일정 추가</DialogTitle><DialogDescription>{activeDay.date} 일정에 후보를 추가합니다.</DialogDescription></DialogHeader>
                <form className="schedule-form" onSubmit={addSchedule}>
                  <div><Label htmlFor="title">일정 이름</Label><Input id="title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="예: 니시키 시장 구경" /></div>
                  <div className="form-grid">
                    <div><Label htmlFor="time">시간</Label><Input id="time" type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} /></div>
                    <div><Label htmlFor="kind">종류</Label><select id="kind" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as ScheduleKind })}>{Object.entries(kindMeta).map(([value, meta]) => <option key={value} value={value}>{meta.label}</option>)}</select></div>
                  </div>
                  <div><Label htmlFor="location">장소 또는 출발지</Label><Input id="location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="지역이나 역 이름" /></div>
                  <Button type="submit" className="submit-button">후보 일정에 추가</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="day-tabs" role="tablist" aria-label="여행 날짜">{days.map((day) => <button key={day.id} role="tab" aria-selected={day.id === activeDayId} onClick={() => setActiveDayId(day.id)}><span>{day.label}</span><strong>{day.date.replace("월 ", ".")}</strong></button>)}</div>
          <div className="day-summary"><div><span>{activeDay.date}</span><strong>{activeDay.items.length}개의 일정</strong></div><p>걷는 시간이 많은 날이에요. 편한 신발을 챙기세요.</p></div>
          <div className="timeline">
            {activeDay.items.length === 0 ? <div className="empty-day"><Navigation /><h3>아직 정해진 일정이 없어요</h3><p>가고 싶은 장소를 첫 후보로 올려보세요.</p><Button variant="outline" onClick={() => setIsOpen(true)}><Plus /> 첫 일정 추가</Button></div> : activeDay.items.map((item, index) => {
              const meta = kindMeta[item.kind]; const Icon = meta.icon;
              return <article className="schedule-card" key={item.id}><time>{item.time}</time><div className="timeline-node" style={{ color: meta.color }}><Icon />{index < activeDay.items.length - 1 && <span />}</div><div className="schedule-copy"><div className="schedule-title-row"><h3>{item.title}</h3>{item.status === "candidate" ? <span className="candidate">투표 중</span> : <span className="confirmed"><Check /> 확정</span>}</div><p>{scheduleDescription(item)}</p></div><button aria-label={`${item.title} 상세 보기`}><ArrowUpRight /></button></article>;
            })}
          </div>
        </section>

        <aside className="insight-rail">
          <div className="destination-card"><div className="destination-image" role="img" aria-label="가을의 교토 골목 풍경" /><div className="destination-caption"><span>KYOTO / 35.0116° N</span><strong>우리의 다음 장면</strong></div></div>
          <section className="decision-card" id="decisions"><div className="section-icon"><CircleDollarSign /></div><p className="eyebrow">오늘 결정할 것</p><h2>료칸 조식,<br />추가할까요?</h2><div className="vote-track"><span style={{ width: "75%" }} /></div><div className="vote-result"><strong>찬성 3</strong><span>대기 1</span></div><Button variant="outline" className="vote-button">투표 보러가기 <ArrowUpRight /></Button></section>
          <div className="weather-note"><span>18°</span><div><strong>맑고 선선해요</strong><p>오후 강수 확률 10%</p></div><Clock3 /></div>
        </aside>
      </div>
    </main>
  );
}
