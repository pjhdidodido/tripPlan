import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type MemberFieldsProps = {
  members: string[];
  onChange: (members: string[]) => void;
};

export function MemberFields({ members, onChange }: MemberFieldsProps) {
  return (
    <div className="member-fields">
      {members.map((member, index) => (
        <div className="member-field" key={index}>
          <Input aria-label={`동행인 ${index + 1}`} value={member} onChange={(event) => onChange(members.map((name, memberIndex) => memberIndex === index ? event.target.value : name))} placeholder="이름" />
          <Button type="button" variant="ghost" size="icon" disabled={members.length === 1} onClick={() => onChange(members.filter((_, memberIndex) => memberIndex !== index))} aria-label={`${member || `동행인 ${index + 1}`} 삭제`}><Trash2 /></Button>
        </div>
      ))}
      <Button type="button" variant="outline" className="member-add" onClick={() => onChange([...members, ""])} disabled={members.length >= 12}><Plus /> 동행인 추가</Button>
    </div>
  );
}
