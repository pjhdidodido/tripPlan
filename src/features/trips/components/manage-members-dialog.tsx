import { FormEvent, useState } from "react";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import type { Trip } from "../model/trip";
import { MemberFields } from "./member-fields";

type ManageMembersDialogProps = {
  trip: Trip;
  onSave: (members: string[]) => Promise<void>;
};

export function ManageMembersDialog({ trip, onSave }: ManageMembersDialogProps) {
  const [open, setOpen] = useState(false);
  const [members, setMembers] = useState(trip.members);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleaned = members.map((name) => name.trim()).filter(Boolean);
    if (cleaned.length === 0) {
      toast.error("동행인을 한 명 이상 입력해 주세요.");
      return;
    }
    setSaving(true);
    try {
      await onSave(cleaned);
      setOpen(false);
      toast.success("함께 가는 사람을 변경했어요.");
    } catch {
      toast.error("동행인 정보를 저장하지 못했어요.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button variant="ghost" size="icon" className="member-edit" aria-label="동행인 편집"><Pencil /></Button></DialogTrigger>
      <DialogContent className="dialog-panel">
        <DialogHeader><DialogTitle>함께 가는 사람</DialogTitle><DialogDescription>{trip.title}에 참여할 사람을 추가하거나 변경합니다.</DialogDescription></DialogHeader>
        <form className="schedule-form" onSubmit={handleSubmit}>
          <div><Label>동행인</Label><MemberFields members={members} onChange={setMembers} /></div>
          <Button type="submit" className="submit-button" disabled={saving}>{saving ? "저장 중..." : "동행인 저장"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
