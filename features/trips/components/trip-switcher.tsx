import { FormEvent, useState } from "react";
import { CalendarDays, Check, ChevronDown, MapPin, Plus, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CreateTripInput, Trip } from "../model/trip";
import { MemberFields } from "./member-fields";

type TripSwitcherProps = {
  trips: Trip[];
  currentTrip: Trip | null;
  onSelect: (trip: Trip) => void;
  onCreate: (input: CreateTripInput) => Promise<void>;
  onDelete: (trip: Trip) => Promise<void>;
};

const initialForm: CreateTripInput = { title: "", destination: "", startDate: "", endDate: "", members: [""], budget: 0 };

export function TripSwitcher({ trips, currentTrip, onSelect, onCreate, onDelete }: TripSwitcherProps) {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [deletingTrip, setDeletingTrip] = useState<Trip | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = { ...form, title: form.title.trim(), destination: form.destination.trim(), members: form.members.map((name) => name.trim()).filter(Boolean) };
    if (!input.title || !input.destination || !input.startDate || !input.endDate || input.members.length === 0) {
      toast.error("여행 정보와 동행인을 모두 입력해 주세요.");
      return;
    }
    if (input.endDate < input.startDate) {
      toast.error("종료일은 시작일보다 빠를 수 없어요.");
      return;
    }
    setSaving(true);
    try {
      await onCreate(input);
      setForm(initialForm);
      setCreating(false);
      setOpen(false);
      toast.success("새 여행을 만들었어요.");
    } catch {
      toast.error("여행을 만들지 못했어요. 여행 기간은 최대 14일입니다.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild><button className="trip-switcher-trigger"><span>여행 선택</span><strong>{currentTrip?.destination ?? "새 여행"}</strong><ChevronDown /></button></DialogTrigger>
        <DialogContent className="dialog-panel trip-manager">
          <DialogHeader><DialogTitle>{creating ? "새 여행 만들기" : "내 여행"}</DialogTitle><DialogDescription>{creating ? "여행 기간과 함께 가는 사람을 입력합니다." : "여행을 선택하면 각 여행의 일정으로 이동합니다."}</DialogDescription></DialogHeader>
          {creating ? (
            <form className="schedule-form" onSubmit={handleCreate}>
              <div><Label htmlFor="trip-title">여행 이름</Label><Input id="trip-title" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="예: 부산 여름 휴가" /></div>
              <div><Label htmlFor="trip-destination">여행지</Label><Input id="trip-destination" value={form.destination} onChange={(event) => setForm({ ...form, destination: event.target.value })} placeholder="예: 부산" /></div>
              <div className="form-grid">
                <div><Label htmlFor="trip-start">시작일</Label><Input id="trip-start" type="date" value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} /></div>
                <div><Label htmlFor="trip-end">종료일</Label><Input id="trip-end" type="date" min={form.startDate} value={form.endDate} onChange={(event) => setForm({ ...form, endDate: event.target.value })} /></div>
              </div>
              <div className="form-grid">
                <div><Label htmlFor="trip-budget">공동 예산</Label><Input id="trip-budget" type="number" min="0" step="10000" value={form.budget} onChange={(event) => setForm({ ...form, budget: Number(event.target.value) })} placeholder="예: 1000000" /></div>
              </div>
              <div><Label>함께 가는 사람</Label><MemberFields members={form.members} onChange={(members) => setForm({ ...form, members })} /></div>
              <div className="dialog-actions"><Button type="button" variant="outline" onClick={() => setCreating(false)}>목록으로</Button><Button type="submit" disabled={saving}>{saving ? "생성 중..." : "여행 만들기"}</Button></div>
            </form>
          ) : (
            <div className="trip-list">
              {trips.map((trip) => (
                <div className={`trip-list-item ${trip.id === currentTrip?.id ? "selected" : ""}`} key={trip.id}>
                  <button className="trip-select" onClick={() => { onSelect(trip); setOpen(false); }}>
                    <span className="trip-list-icon"><MapPin /></span>
                    <span><strong>{trip.title}</strong><small><CalendarDays /> {trip.startDate} — {trip.endDate}</small><small><Users /> {trip.members.length}명 · {trip.destination}</small></span>
                    {trip.id === currentTrip?.id && <Check className="selected-check" />}
                  </button>
                  <Button variant="ghost" size="icon" className="trip-delete" onClick={() => setDeletingTrip(trip)} aria-label={`${trip.title} 삭제`}><Trash2 /></Button>
                </div>
              ))}
              {trips.length === 0 && <div className="trip-list-empty"><MapPin /><strong>아직 여행이 없어요</strong><span>첫 여행을 만들어 일정을 계획해 보세요.</span></div>}
              <Button variant="outline" className="create-trip-button" onClick={() => setCreating(true)}><Plus /> 새 여행 만들기</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <AlertDialog open={deletingTrip !== null} onOpenChange={(nextOpen) => { if (!nextOpen) setDeletingTrip(null); }}>
        <AlertDialogContent size="sm"><AlertDialogHeader><AlertDialogTitle>여행을 삭제할까요?</AlertDialogTitle><AlertDialogDescription>“{deletingTrip?.title}”의 날짜와 모든 일정이 함께 삭제됩니다.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>취소</AlertDialogCancel><AlertDialogAction variant="destructive" onClick={() => { if (deletingTrip) void onDelete(deletingTrip); setDeletingTrip(null); }}>여행 삭제</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </>
  );
}
