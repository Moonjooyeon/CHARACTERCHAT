'use client';
export const personaTemplate='<유저>\n이름: \n성별: \n나이: \n성격: \n외모: ';
export function updatePersonaFields(value:string,patch:Record<string,string>){let lines=value.split('\n');for(const [key,text] of Object.entries(patch)){const index=lines.findIndex(line=>line.startsWith(key+': '));if(index>=0){if(text.trim())lines[index]=`${key}: ${text}`;else lines.splice(index,1)}else if(text.trim())lines.push(`${key}: ${text}`)}const next=lines.filter((line,i)=>line||i>0).join('\n');if(next.length>2000)throw new Error('설정은 2,000자까지 저장할 수 있어요. 기존 내용을 줄인 뒤 다시 입력해 주세요.');return next}
export default function PersonaBuilder({value,onChange,onDraftChange}:{value:string;onChange:(v:string)=>void;onDraftChange?:(dirty:boolean)=>void}){
 return <div className="persona-builder"><p className="field-help">콜론 뒤에 편하게 적어 주세요. 빈 항목은 그대로 두거나 지워도 돼요.</p><label className="field"><span className="field-label">이야기 속 나<small>{value.length}/2000</small></span><textarea autoFocus className="persona-single" rows={9} maxLength={2000} value={value||personaTemplate} onChange={e=>{onChange(e.target.value);onDraftChange?.(false)}} aria-label="페르소나 설정"/></label></div>
}
