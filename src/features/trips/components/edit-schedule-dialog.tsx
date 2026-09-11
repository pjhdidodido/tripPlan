import { FormEvent, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ScheduleItem, UpdateScheduleInput, ScheduleKind } from "../model/trip";

type EditScheduleDialogProps = {
  item: ScheduleItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (input: UpdateScheduleInput) => Promise<void> | void;
};

const scheduleKinds = [
  { value: "place", label: "장소" },
  { value: "meal", label: "식사" },
  { value: "transport", label: "이동" },
] satisfies { value: ScheduleKind; label: string }[];

const emptyForm: UpdateScheduleInput = { title: "", time: "09:00", status: "candidate", kind: "place", location: "", memo: "", preCost: 0 };

function getEditableLocation(item: ScheduleItem): string {
  return item.kind === "transport" ? item.from : item.location;
}

export function EditScheduleDialog({ item, open, onOpenChange, onSave }: EditScheduleDialogProps) {
  const [form, setForm] = useState<UpdateScheduleInput>(() => item
    ? { title: item.title, time: item.time, status: item.status, kind: item.kind, location: getEditableLocation(item), memo: item.memo ?? "", preCost: item.preCost }
    : emptyForm);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.title.trim() || !form.location.trim()) {
      toast.error("일정 이름과 장소를 입력해 주세요.");
      return;
    }
    try {
      await onSave({ ...form, title: form.title.trim() });
      onOpenChange(false);
      toast.success("일정을 수정했어요.");
    } catch {
      toast.error("일정을 수정하지 못했어요. Python API가 실행 중인지 확인해 주세요.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="dialog-panel">
        <DialogHeader>
          <DialogTitle>일정 수정</DialogTitle>
          <DialogDescription>종류, 장소, 메모, 예상 비용을 포함한 일정 정보를 변경합니다.</DialogDescription>
        </DialogHeader>
        <form className="schedule-form" onSubmit={handleSubmit}>
          <div><Label htmlFor="edit-title">일정 이름</Label><Input id="edit-title" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></div>
          <div className="form-grid">
            <div><Label htmlFor="edit-time">시간</Label><Input id="edit-time" type="time" value={form.time} onChange={(event) => setForm({ ...form, time: event.target.value })} /></div>
            <div><Label htmlFor="edit-kind">종류</Label><select id="edit-kind" value={form.kind} onChange={(event) => setForm({ ...form, kind: event.target.value as ScheduleKind })}>{scheduleKinds.map((kind) => <option key={kind.value} value={kind.value}>{kind.label}</option>)}</select></div>
          </div>
          <div className="form-grid">
            <div><Label htmlFor="edit-location">장소 또는 출발지</Label><Input id="edit-location" value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} placeholder="지역이나 역 이름" /></div>
            <div><Label htmlFor="edit-pre-cost">예상 비용</Label><Input id="edit-pre-cost" type="number" min="0" step="1000" value={form.preCost} onChange={(event) => setForm({ ...form, preCost: Number(event.target.value) })} placeholder="예상 비용" /></div>
          </div>
          <div><Label htmlFor="edit-status">상태</Label><select id="edit-status" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as UpdateScheduleInput["status"] })}><option value="candidate">후보</option><option value="confirmed">확정</option></select></div>
          <div><Label htmlFor="edit-memo">메모</Label><Textarea id="edit-memo" value={form.memo} onChange={(event) => setForm({ ...form, memo: event.target.value })} placeholder="일정에 대한 추가 정보" /></div>

          <Button type="submit" className="submit-button">변경 내용 저장</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
