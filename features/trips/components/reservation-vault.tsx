import { ChangeEvent, FormEvent, useRef, useState } from "react";
import { BedDouble, CalendarClock, ExternalLink, FileImage, Plane, Plus, Ticket, TrainFront, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getApiAssetUrl } from "../api/trip-api";
import type { Reservation, ReservationInput, ReservationKind } from "../model/trip";

const kinds = [
  { value: "stay", label: "숙소", icon: BedDouble },
  { value: "flight", label: "항공", icon: Plane },
  { value: "train", label: "기차", icon: TrainFront },
  { value: "ticket", label: "입장권", icon: Ticket },
  { value: "other", label: "기타", icon: FileImage },
] satisfies { value: ReservationKind; label: string; icon: typeof BedDouble }[];

const emptyForm: ReservationInput = { kind: "stay", title: "", provider: "", startAt: "", confirmationNumber: "", address: "", link: "", memo: "" };

type ReservationVaultProps = {
  reservations: Reservation[];
  onCreate: (input: ReservationInput) => Promise<void>;
  onUpdate: (id: string, input: ReservationInput) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onUploadImage: (id: string, file: File) => Promise<Reservation>;
  onDeleteImage: (id: string) => Promise<Reservation>;
};

function ReservationDialog({ reservation, open, onOpenChange, onSave, onDelete, onUploadImage, onDeleteImage }: {
  reservation: Reservation | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (input: ReservationInput) => Promise<void>;
  onDelete?: () => Promise<void>;
  onUploadImage?: (file: File) => Promise<void>;
  onDeleteImage?: () => Promise<void>;
}) {
  const [form, setForm] = useState<ReservationInput>(() => reservation ? { kind: reservation.kind, title: reservation.title, provider: reservation.provider ?? "", startAt: reservation.startAt ?? "", confirmationNumber: reservation.confirmationNumber ?? "", address: reservation.address ?? "", link: reservation.link ?? "", memo: reservation.memo ?? "" } : emptyForm);
  const [saving, setSaving] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      await onSave({ ...form, title: form.title.trim() });
      onOpenChange(false);
    } catch {
      toast.error("예약 정보를 저장하지 못했어요.");
    } finally {
      setSaving(false);
    }
  }

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !onUploadImage) return;
    setSaving(true);
    try { await onUploadImage(file); toast.success("바우처 이미지를 저장했어요."); }
    catch { toast.error("8MB 이하 이미지인지 확인해 주세요."); }
    finally { setSaving(false); event.target.value = ""; }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="dialog-panel reservation-dialog">
        <DialogHeader><DialogTitle>{reservation ? "예약 정보 수정" : "예약 추가"}</DialogTitle><DialogDescription>예약번호와 바우처를 함께 보관할 수 있습니다.</DialogDescription></DialogHeader>
        <form className="schedule-form" onSubmit={submit}>
          <div className="form-grid">
            <div><Label htmlFor="reservation-kind">종류</Label><select id="reservation-kind" value={form.kind} onChange={(event) => setForm({ ...form, kind: event.target.value as ReservationKind })}>{kinds.map((kind) => <option key={kind.value} value={kind.value}>{kind.label}</option>)}</select></div>
            <div><Label htmlFor="reservation-title">예약명</Label><Input id="reservation-title" value={form.title} maxLength={120} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="예: 교토역 앞 호텔" /></div>
          </div>
          <div className="form-grid">
            <div><Label htmlFor="reservation-provider">업체</Label><Input id="reservation-provider" value={form.provider} onChange={(event) => setForm({ ...form, provider: event.target.value })} placeholder="항공사, 호텔, 판매처" /></div>
            <div><Label htmlFor="reservation-start">이용 일시</Label><Input id="reservation-start" type="datetime-local" value={form.startAt} onChange={(event) => setForm({ ...form, startAt: event.target.value })} /></div>
          </div>
          <div><Label htmlFor="reservation-number">예약번호</Label><Input id="reservation-number" value={form.confirmationNumber} onChange={(event) => setForm({ ...form, confirmationNumber: event.target.value })} /></div>
          <div><Label htmlFor="reservation-address">주소</Label><Input id="reservation-address" value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} /></div>
          <div><Label htmlFor="reservation-link">예약 링크</Label><Input id="reservation-link" type="url" value={form.link} onChange={(event) => setForm({ ...form, link: event.target.value })} placeholder="https://" /></div>
          <div><Label htmlFor="reservation-memo">메모</Label><Textarea id="reservation-memo" value={form.memo} maxLength={1000} onChange={(event) => setForm({ ...form, memo: event.target.value })} /></div>
          {reservation && <div className="reservation-voucher">
            {reservation.imageUrl && <><img src={getApiAssetUrl(reservation.imageUrl)} alt={`${reservation.title} 바우처`} />{/* eslint-disable-line @next/next/no-img-element */}</>}
            <input ref={fileInput} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={upload} />
            <Button type="button" variant="outline" onClick={() => fileInput.current?.click()}><FileImage /> {reservation.imageUrl ? "바우처 변경" : "바우처 첨부"}</Button>
            {reservation.imageUrl && <Button type="button" variant="ghost" onClick={() => void onDeleteImage?.()}><Trash2 /> 이미지 삭제</Button>}
          </div>}
          <div className="reservation-form-actions">
            {reservation && onDelete && <Button type="button" variant="destructive" onClick={() => void onDelete()}><Trash2 /> 예약 삭제</Button>}
            <Button type="submit" disabled={saving || !form.title.trim()}>{saving ? "저장 중..." : "저장"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ReservationVault({ reservations, onCreate, onUpdate, onDelete, onUploadImage, onDeleteImage }: ReservationVaultProps) {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Reservation | null>(null);
  return (
    <div className="reservation-vault">
      <div className="reservation-page-heading"><div><p className="kicker"><Ticket /> 예약 정보를 한곳에</p><h1>예약 보관함</h1></div><Button onClick={() => setCreating(true)}><Plus /> 예약 추가</Button></div>
      <div className="reservation-list">
        {reservations.length === 0 && <div className="reservation-empty"><Ticket /><h2>저장된 예약이 없어요</h2><p>숙소나 교통편 예약부터 추가해 보세요.</p></div>}
        {reservations.map((reservation) => {
          const meta = kinds.find((kind) => kind.value === reservation.kind) ?? kinds[4];
          const Icon = meta.icon;
          return <article className="reservation-card" key={reservation.id} onClick={() => setEditing(reservation)}>
            <span className="reservation-kind"><Icon /> {meta.label}</span>
            <div><h2>{reservation.title}</h2><p>{reservation.provider || "업체 미등록"}</p></div>
            <div className="reservation-card-meta">{reservation.startAt && <span><CalendarClock /> {reservation.startAt.replace("T", " ")}</span>}{reservation.confirmationNumber && <span>예약번호 {reservation.confirmationNumber}</span>}</div>
            {reservation.link && <a href={reservation.link} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}>예약 페이지 <ExternalLink /></a>}
          </article>;
        })}
      </div>
      <ReservationDialog key="new-reservation" reservation={null} open={creating} onOpenChange={setCreating} onSave={onCreate} />
      <ReservationDialog
        key={editing?.id ?? "reservation-closed"}
        reservation={editing}
        open={editing !== null}
        onOpenChange={(open) => { if (!open) setEditing(null); }}
        onSave={async (input) => { if (editing) await onUpdate(editing.id, input); }}
        onDelete={async () => { if (editing) await onDelete(editing.id); setEditing(null); }}
        onUploadImage={async (file) => { if (editing) setEditing(await onUploadImage(editing.id, file)); }}
        onDeleteImage={async () => { if (editing) setEditing(await onDeleteImage(editing.id)); }}
      />
    </div>
  );
}
