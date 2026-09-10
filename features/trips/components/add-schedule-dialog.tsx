import { FormEvent, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { NewScheduleInput, ScheduleKind } from "../model/trip";

const scheduleKinds = [
  { value: "place", label: "장소" },
  { value: "meal", label: "식사" },
  { value: "transport", label: "이동" },
] satisfies { value: ScheduleKind; label: string }[];

type AddScheduleDialogProps = {
  date: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (input: NewScheduleInput) => void;
};

export function AddScheduleDialog({ date, open, onOpenChange, onAdd }: AddScheduleDialogProps) {
  const [form, setForm] = useState<NewScheduleInput>({ title: "", time: "15:00", kind: "place", location: "" });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.title.trim() || !form.location.trim()) {
      toast.error("일정 이름과 장소를 입력해 주세요.");
      return;
    }
    onAdd(form);
    setForm({ title: "", time: "15:00", kind: "place", location: "" });
    onOpenChange(false);
    toast.success(`${date}에 일정을 추가했어요.`);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild><Button className="add-button"><Plus /> 일정 추가</Button></DialogTrigger>
      <DialogContent className="dialog-panel">
        <DialogHeader>
          <DialogTitle>새 일정 추가</DialogTitle>
          <DialogDescription>{date} 일정에 후보를 추가합니다.</DialogDescription>
        </DialogHeader>
        <form className="schedule-form" onSubmit={handleSubmit}>
          <div><Label htmlFor="title">일정 이름</Label><Input id="title" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="예: 니시키 시장 구경" /></div>
          <div className="form-grid">
            <div><Label htmlFor="time">시간</Label><Input id="time" type="time" value={form.time} onChange={(event) => setForm({ ...form, time: event.target.value })} /></div>
            <div><Label htmlFor="kind">종류</Label><select id="kind" value={form.kind} onChange={(event) => setForm({ ...form, kind: event.target.value as ScheduleKind })}>{scheduleKinds.map((kind) => <option key={kind.value} value={kind.value}>{kind.label}</option>)}</select></div>
          </div>
          <div><Label htmlFor="location">장소 또는 출발지</Label><Input id="location" value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} placeholder="지역이나 역 이름" /></div>
          <Button type="submit" className="submit-button">후보 일정에 추가</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
