import { ArrowUpRight, Check, MapPin, Navigation, Plus, TrainFront, Utensils } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ScheduleItem, ScheduleKind } from "../model/trip";

const kindMeta = {
  place: { label: "장소", icon: MapPin, color: "var(--cobalt)" },
  meal: { label: "식사", icon: Utensils, color: "var(--coral)" },
  transport: { label: "이동", icon: TrainFront, color: "var(--mint-dark)" },
} satisfies Record<ScheduleKind, { label: string; icon: typeof MapPin; color: string }>;

function scheduleDescription(item: ScheduleItem): string {
  switch (item.kind) {
    case "place":
      return `${item.location} · ${item.durationMinutes}분`;
    case "meal":
      return `${item.location}${item.reservationName ? ` · ${item.reservationName} 이름으로 예약` : ""}`;
    case "transport":
      return `${item.from} → ${item.to}`;
  }
}

type ScheduleTimelineProps = {
  items: ScheduleItem[];
  onCreate: () => void;
};

export function ScheduleTimeline({ items, onCreate }: ScheduleTimelineProps) {
  if (items.length === 0) {
    return (
      <div className="timeline">
        <div className="empty-day">
          <Navigation />
          <h3>아직 정해진 일정이 없어요</h3>
          <p>가고 싶은 장소를 첫 후보로 올려보세요.</p>
          <Button variant="outline" onClick={onCreate}><Plus /> 첫 일정 추가</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="timeline">
      {items.map((item, index) => {
        const meta = kindMeta[item.kind];
        const Icon = meta.icon;
        return (
          <article className="schedule-card" key={item.id}>
            <time>{item.time}</time>
            <div className="timeline-node" style={{ color: meta.color }}>
              <Icon />
              {index < items.length - 1 && <span />}
            </div>
            <div className="schedule-copy">
              <div className="schedule-title-row">
                <h3>{item.title}</h3>
                {item.status === "candidate"
                  ? <span className="candidate">투표 중</span>
                  : <span className="confirmed"><Check /> 확정</span>}
              </div>
              <p>{scheduleDescription(item)}</p>
            </div>
            <button aria-label={`${item.title} 상세 보기`}><ArrowUpRight /></button>
          </article>
        );
      })}
    </div>
  );
}
