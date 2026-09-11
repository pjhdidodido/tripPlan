import { ChangeEvent, FormEvent, useRef, useState } from "react";
import { Camera, MessageCircle, Pencil, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { getApiAssetUrl } from "../api/trip-api";
import type { ScheduleItem } from "../model/trip";

type ScheduleDetailDialogProps = {
  item: ScheduleItem | null;
  members: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: () => void;
  onUploadImage: (file: File) => Promise<void>;
  onDeleteImage: () => Promise<void>;
  onAddComment: (member: string, content: string) => Promise<void>;
};

function locationText(item: ScheduleItem): string {
  if (item.kind === "transport") return `${item.from} → ${item.to}`;
  return item.location;
}

export function ScheduleDetailDialog({ item, members, open, onOpenChange, onEdit, onUploadImage, onDeleteImage, onAddComment }: ScheduleDetailDialogProps) {
  const [member, setMember] = useState(members[0] ?? "");
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  if (!item) return null;

  async function handleImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setSaving(true);
    try {
      await onUploadImage(file);
      toast.success("일정 사진을 저장했어요.");
    } catch {
      toast.error("사진을 저장하지 못했어요. 8MB 이하 이미지인지 확인해 주세요.");
    } finally {
      setSaving(false);
      event.target.value = "";
    }
  }

  async function handleComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!member || !comment.trim()) return;
    setSaving(true);
    try {
      await onAddComment(member, comment.trim());
      setComment("");
    } catch {
      toast.error("코멘트를 저장하지 못했어요.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="schedule-detail-dialog">
        <DialogHeader>
          <DialogTitle>{item.title}</DialogTitle>
          <DialogDescription>{item.time} · {locationText(item)}</DialogDescription>
        </DialogHeader>

        <section className="schedule-photo-section">
          {item.imageUrl ? (
            // 일정 이미지는 사용자가 올린 로컬 API 파일이라 Next Image 최적화 대상이 아닙니다.
            // eslint-disable-next-line @next/next/no-img-element
            <img className="schedule-photo" src={getApiAssetUrl(item.imageUrl)} alt={`${item.title} 첨부 사진`} />
          ) : (
            <button className="schedule-photo-empty" type="button" onClick={() => fileInput.current?.click()}>
              <Camera />
              <span>일정 사진 추가</span>
            </button>
          )}
          <input ref={fileInput} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleImage} />
          <div className="schedule-photo-actions">
            <Button type="button" variant="outline" size="sm" disabled={saving} onClick={() => fileInput.current?.click()}><Upload /> {item.imageUrl ? "사진 변경" : "사진 추가"}</Button>
            {item.imageUrl && <Button type="button" variant="ghost" size="sm" disabled={saving} onClick={() => void onDeleteImage()}><Trash2 /> 삭제</Button>}
          </div>
        </section>

        <div className="schedule-detail-meta">
          <div><span>상태</span><strong>{item.status === "confirmed" ? "확정" : "후보"}</strong></div>
          <div><span>예상 비용</span><strong>{item.preCost.toLocaleString("ko-KR")}원</strong></div>
        </div>
        {item.memo && <p className="schedule-detail-memo">{item.memo}</p>}
        <Button type="button" variant="outline" onClick={onEdit}><Pencil /> 일정 정보 수정</Button>

        <section className="comment-section">
          <div className="comment-heading"><MessageCircle /><strong>동행자 코멘트</strong><span>{item.comments.length}</span></div>
          <div className="comment-list">
            {item.comments.length === 0 && <p className="comment-empty">아직 코멘트가 없어요.</p>}
            {item.comments.map((entry) => (
              <div className="comment-item" key={entry.id}>
                <span className="comment-avatar">{entry.member.slice(0, 1)}</span>
                <div><strong>{entry.member}</strong><p>{entry.content}</p></div>
              </div>
            ))}
          </div>
          <form className="comment-form" onSubmit={handleComment}>
            <select aria-label="코멘트 작성자" value={member} onChange={(event) => setMember(event.target.value)}>
              {members.map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
            <Textarea value={comment} maxLength={500} onChange={(event) => setComment(event.target.value)} placeholder="이 일정에 대한 의견을 남겨보세요." />
            <Button type="submit" disabled={saving || !member || !comment.trim()}>코멘트 등록</Button>
          </form>
        </section>
      </DialogContent>
    </Dialog>
  );
}
