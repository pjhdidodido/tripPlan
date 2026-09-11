import { FormEvent, useState } from "react";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Trip } from "../model/trip";

type ManageBudgetDialogProps = {
  trip: Trip;
  onSave: (budget: number) => Promise<void>;
};

export function ManageBudgetDialog({ trip, onSave }: ManageBudgetDialogProps) {
  const [open, setOpen] = useState(false);
  const [budget, setBudget] = useState(trip.budget);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!Number.isFinite(budget) || budget < 0) {
      toast.error("0원 이상의 예산을 입력해 주세요.");
      return;
    }
    setSaving(true);
    try {
      await onSave(Math.round(budget));
      setOpen(false);
      toast.success("공동 예산을 변경했어요.");
    } catch {
      toast.error("공동 예산을 저장하지 못했어요.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button variant="ghost" size="icon" className="member-edit" aria-label="공동 예산 편집"><Pencil /></Button></DialogTrigger>
      <DialogContent className="dialog-panel">
        <DialogHeader><DialogTitle>공동 예산</DialogTitle><DialogDescription>{trip.title}에서 함께 사용할 총예산을 설정합니다.</DialogDescription></DialogHeader>
        <form className="schedule-form" onSubmit={handleSubmit}>
          <div><Label htmlFor="budget">예산</Label><Input id="budget" type="number" min="0" step="10000" value={budget} onChange={(event) => setBudget(Number(event.target.value))} /></div>
          <Button type="submit" className="submit-button" disabled={saving}>{saving ? "저장 중..." : "예산 저장"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
