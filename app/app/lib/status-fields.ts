const legacyFields=[{key:'date',label:'날짜',variable:'날짜',format:'plain'},{key:'weekday',label:'요일',variable:'요일',format:'plain'},{key:'time',label:'시각',variable:'시각',format:'plain'},{key:'place',label:'장소',variable:'장소',format:'plain'},{key:'relationship',label:'관계',variable:'관계',format:'plain'},{key:'emotion',label:'감정',variable:'감정',format:'plain'},{key:'mood',label:'기분',variable:'기분',format:'plain'},{key:'pc_clothes',label:'PC 복장',variable:'PC복장',format:'plain'},{key:'pc_detail',label:'PC 세부',variable:'PC세부',format:'italic'},{key:'npc_clothes',label:'NPC 복장',variable:'NPC복장',format:'plain'},{key:'npc_detail',label:'NPC 세부',variable:'NPC세부',format:'italic'},{key:'schedule',label:'일정',variable:'일정',format:'bold'},{key:'inner_thought',label:'속마음',variable:'속마음',format:'thought'}] as const;
export const statusFields=[
{key:'date',label:'날짜 / 시간 / 장소',variable:'날짜시간장소',format:'plain'},
{key:'npc_clothes',label:'복장 (NPC, PC)',variable:'복장',format:'plain'},
{key:'position',label:'현재 행동 · 위치와 자세(POS)',variable:'POS',format:'plain'},
{key:'relationship',label:'관계',variable:'관계',format:'plain'},
{key:'emotion',label:'감정 (NPC→PC / PC→NPC)',variable:'감정',format:'plain'},
{key:'affection',label:'❤ 호감도',variable:'호감도',format:'plain'},
{key:'schedule',label:'다음 일정',variable:'일정',format:'plain'},
{key:'nsfw_count',label:'NSFW 횟수',variable:'NSFW횟수',format:'plain'},
...legacyFields.filter(f=>!['date','npc_clothes','relationship','emotion','schedule'].includes(f.key))
];
export type StatusField={key:string;label:string;enabled:boolean};
export const validStatusKey=(key:unknown):key is string=>typeof key==='string'&&(statusFields.some(f=>f.key===key)||/^custom_[a-z0-9_]{1,60}$/.test(key));
export const defaultStatusTemplate=():StatusField[]=>statusFields.slice(0,8).map(f=>({key:f.key,label:f.label,enabled:true}));
export function normalizeStatusTemplate(value:any):StatusField[]{if(!Array.isArray(value))return defaultStatusTemplate();const valid=value.filter(v=>validStatusKey(v?.key)).slice(0,32);if(new Set(valid.map(v=>v.key)).size!==valid.length)return defaultStatusTemplate();return valid.map(v=>({key:v.key,label:typeof v.label==='string'?v.label.trim().slice(0,60)||'새 항목':statusFields.find(f=>f.key===v.key)?.label||'새 항목',enabled:v.enabled!==false}));}
export function cleanStatusData(value:any){const keys=Array.from(new Set([...statusFields.map(f=>f.key),...Object.keys(value||{}).filter(validStatusKey).slice(0,32)]));return Object.fromEntries(keys.map(key=>[key,typeof value?.[key]==='string'?value[key].trim().slice(0,300):'']));}
