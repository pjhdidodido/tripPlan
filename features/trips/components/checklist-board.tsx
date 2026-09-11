import { FormEvent, useState } from "react";
import { CheckCircle2, Plus, Trash2, UserRound, UsersRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ChecklistItem } from "../model/trip";

type ChecklistBoardProps = {
  members: string[];
  items: ChecklistItem[];
  onCreate: (title: string, owner?: string) => Promise<void>;
  onUpdate: (item: ChecklistItem) => Promise<void>;
  onDelete: (itemId: string) => Promise<void>;
};

type ChecklistSectionProps = {
  title: string;
  owner?: string;
  items: ChecklistItem[];
  onCreate: ChecklistBoardProps["onCreate"];
  onUpdate: ChecklistBoardProps["onUpdate"];
  onDelete: ChecklistBoardProps["onDelete"];
};

function ChecklistSection({ title, owner, items, onCreate, onUpdate, onDelete }: ChecklistSectionProps) {
  const [newTitle, setNewTitle] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = newTitle.trim();
    if (!value) return;
    try {
      await onCreate(value, owner);
      setNewTitle("");
    } catch {
      toast.error("준비물을 추가하지 못했어요.");
    }
  }

  return (
    <section className="checklist-section">
      <div className="checklist-section-heading">
        {owner ? <UserRound /> : <UsersRound />}
        <div><span>{owner ? "개인 준비물" : "모두 함께 준비"}</span><h2>{title}</h2></div>
        <strong>{items.filter((item) => item.checked).length}/{items.length}</strong>
      </div>
      <div className="checklist-items">
        {items.length === 0 && <p className="checklist-empty">아직 등록된 준비물이 없어요.</p>}
        {items.map((item) => (
          <div className={`checklist-row ${item.checked ? "checked" : ""}`} key={item.id}>
            <input type="checkbox" checked={item.checked} aria-label={`${item.title} 준비 완료`} onChange={(event) => void onUpdate({ ...item, checked: event.target.checked })} />
            <input
              className="checklist-title-input"
              defaultValue={item.title}
              aria-label="준비물 이름"
              onBlur={(event) => {
                const nextTitle = event.target.value.trim();
                if (nextTitle && nextTitle !== item.title) void onUpdate({ ...item, title: nextTitle });
                else event.target.value = item.title;
              }}
            />
            <button type="button" className="checklist-delete" aria-label={`${item.title} 삭제`} onClick={() => void onDelete(item.id)}><Trash2 /></button>
          </div>
        ))}
      </div>
      <form className="checklist-add-form" onSubmit={submit}>
        <Input value={newTitle} maxLength={120} onChange={(event) => setNewTitle(event.target.value)} placeholder={`${title} 준비물 추가`} />
        <Button type="submit" size="sm" disabled={!newTitle.trim()}><Plus /> 추가</Button>
      </form>
    </section>
  );
}

export function ChecklistBoard({ members, items, onCreate, onUpdate, onDelete }: ChecklistBoardProps) {
  return (
    <div className="checklist-board">
      <div className="checklist-page-heading">
        <div><p className="kicker"><CheckCircle2 /> 빠뜨리지 않도록 함께 확인해요</p><h1>여행 준비 체크리스트</h1></div>
        <span>항목 이름을 클릭하면 바로 수정할 수 있어요.</span>
      </div>
      <ChecklistSection title="공통 준비물" items={items.filter((item) => !item.owner)} onCreate={onCreate} onUpdate={onUpdate} onDelete={onDelete} />
      {members.map((member) => (
        <ChecklistSection key={member} title={`${member}의 준비물`} owner={member} items={items.filter((item) => item.owner === member)} onCreate={onCreate} onUpdate={onUpdate} onDelete={onDelete} />
      ))}
    </div>
  );
}
