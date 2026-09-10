import { FormEvent, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ScheduleItem, UpdateScheduleInput } from "../model/trip";

type EditScheduleDialogProps = {
  item: ScheduleItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (input: UpdateScheduleInput) => void;
};

const emptyForm: UpdateScheduleInput = { title: "", time: "09:00", status: "candidate" };

export function EditScheduleDialog({ item, open, onOpenChange, onSave }: EditScheduleDialogProps) {
  const [form, setForm] = useState<UpdateScheduleInput>(() => item
    ? { title: item.title, time: item.time, status: item.status }
    : emptyForm);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.title.trim()) {
      toast.error("일정 이름을 입력해 주세요.");
      return;
    }
    onSave({ ...form, title: form.title.trim() });
    onOpenChange(false);
    toast.success("일정을 수정했어요.");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="dialog-panel">
        <DialogHeader>
          <DialogTitle>일정 수정</DialogTitle>
          <DialogDescription>이름, 시간, 확정 상태를 변경할 수 있습니다.</DialogDescription>
        </DialogHeader>
        <form className="schedule-form" onSubmit={handleSubmit}>
          <div><Label htmlFor="edit-title">일정 이름</Label><Input id="edit-title" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></div>
          <div className="form-grid">
            <div><Label htmlFor="edit-time">시간</Label><Input id="edit-time" type="time" value={form.time} onChange={(event) => setForm({ ...form, time: event.target.value })} /></div>
            <div><Label htmlFor="edit-status">상태</Label><select id="edit-status" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as UpdateScheduleInput["status"] })}><option value="candidate">투표 중</option><option value="confirmed">확정</option></select></div>
          </div>
          <Button type="submit" className="submit-button">변경 내용 저장</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
