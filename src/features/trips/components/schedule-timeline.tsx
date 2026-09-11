"use client";

import { useState } from "react";
import { Check, MapPin, MoreHorizontal, Navigation, Pencil, Plus, TrainFront, Trash2, Utensils } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
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
  onView: (item: ScheduleItem) => void;
  onEdit: (item: ScheduleItem) => void;
  onDelete: (item: ScheduleItem) => Promise<void> | void;
};

export function ScheduleTimeline({ items, onCreate, onView, onEdit, onDelete }: ScheduleTimelineProps) {
  const [deletingItem, setDeletingItem] = useState<ScheduleItem | null>(null);

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
          <article
            className="schedule-card"
            key={item.id}
            onClick={() => onView(item)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onView(item);
              }
            }}
            role="button"
            tabIndex={0}
            aria-label={`${item.title} 일정 편집`}
          >
            <time>{item.time}</time>
            <div className="timeline-node" style={{ color: meta.color }}>
              <Icon />
              {index < items.length - 1 && <span />}
            </div>
            <div className="schedule-copy">
              <div className="schedule-title-row">
                <h3>{item.title}</h3>
                {item.status === "candidate"
                  ? <span className="candidate">후보</span>
                  : <span className="confirmed"><Check /> 확정</span>}
                <span className="confirmed">

                  {<strong>예상 {item.preCost.toLocaleString("ko-KR")}원</strong>}
                </span>
              </div>
              <p>{scheduleDescription(item)}</p>
              {(item.memo) && (
                <div className="schedule-details">
                  {item.memo && <span>{item.memo}</span>}

                </div>
              )}
            </div>
            <div onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild><button className="schedule-actions" aria-label={`${item.title} 메뉴`}><MoreHorizontal /></button></DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => onEdit(item)}><Pencil /> 수정</DropdownMenuItem>
                  <DropdownMenuItem variant="destructive" onSelect={() => setDeletingItem(item)}><Trash2 /> 삭제</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </article>
        );
      })}
      <AlertDialog open={deletingItem !== null} onOpenChange={(open) => { if (!open) setDeletingItem(null); }}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader><AlertDialogTitle>일정을 삭제할까요?</AlertDialogTitle><AlertDialogDescription>“{deletingItem?.title}” 일정이 이 기기에서 삭제됩니다.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>취소</AlertDialogCancel><AlertDialogAction variant="destructive" onClick={() => { if (deletingItem) onDelete(deletingItem); setDeletingItem(null); }}>삭제</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
