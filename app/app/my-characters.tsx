'use client';
import {useEffect,useState} from 'react';
import {Plus,PenLine} from 'lucide-react';
import {type Character} from './lib/data';
import CharacterMediaEditor from './character-media-editor';
import CharacterVisual from './character-visual';
const blank=():Character=>({name:'',age:25,role:'',personality:''});
export default function MyCharacters({characters,busy,onSave,onDirtyChange}:{characters:Character[];busy:boolean;onSave:(c:Character)=>Promise<boolean>;onDirtyChange:(dirty:boolean)=>void}){
 const [draft,setDraft]=useState<Character|null>(null),[saved,setSaved]=useState('');
 const [mediaBusy,setMediaBusy]=useState(false);
 const dirty=!!draft&&JSON.stringify(draft)!==saved;
 useEffect(()=>{onDirtyChange(dirty||mediaBusy)},[dirty,mediaBusy,onDirtyChange]);
 function edit(c=blank()){if(dirty&&!window.confirm('저장하지 않은 인물 정보가 있어요. 새로 열까요?'))return;setDraft({...c});setSaved(JSON.stringify(c));}
 function change(key:keyof Character,value:unknown){setDraft(c=>c?{...c,[key]:value}:c)}
 return <section><div className="page-heading"><div><h1>내 인물</h1><p>인물을 저장하고 내 작품의 등장인물로 불러오세요.</p></div><button className="primary" disabled={busy||mediaBusy} onClick={()=>edit()}><Plus size={18}/>인물 만들기</button></div>
 {draft&&<form className="form-panel my-character-editor" onSubmit={async e=>{e.preventDefault();if(mediaBusy)return;if(await onSave(draft)){setDraft(null);onDirtyChange(false)}}}><fieldset className="editor-fieldset" disabled={busy||mediaBusy}><h2>{draft.id?'인물 편집':'새 인물'}</h2><div className="form-row"><label className="field"><span>이름 *</span><input required maxLength={40} value={draft.name} onChange={e=>change('name',e.target.value)}/></label><label className="field"><span>나이 *</span><input required type="number" min={19} max={999} step={1} value={draft.age??''} onChange={e=>change('age',e.target.value===''?null:Number(e.target.value))}/></label></div><label className="field"><span>역할</span><input maxLength={100} value={draft.role} placeholder="예: 기억 도서관의 기록관" onChange={e=>change('role',e.target.value)}/></label><label className="field"><span>성격과 말투</span><textarea rows={4} maxLength={2000} value={draft.personality} onChange={e=>change('personality',e.target.value)}/></label><CharacterMediaEditor media={draft.media} onChange={media=>change('media',media)} onBusyChange={setMediaBusy}/><p className="field-help">19세 이상의 성인 인물만 만들 수 있어요.</p><div className="form-footer"><button type="button" className="text-button" onClick={()=>{if(dirty&&!window.confirm('저장하지 않고 닫을까요?'))return;setDraft(null);onDirtyChange(false)}}>취소</button><button className="primary" type="submit">{busy?'저장 중…':'인물 저장'}</button></div></fieldset></form>}
 {characters.length?<div className="my-work-list">{characters.map(c=><article className="my-work" key={c.id}><CharacterVisual character={c}/><div><h3>{c.name}</h3><small>{c.age}세 · {c.role||'역할 미설정'}</small><p>{c.personality||'성격과 말투를 추가해 보세요.'}</p></div><div className="my-work-actions"><button className="secondary" disabled={busy||mediaBusy} onClick={()=>edit(c)}><PenLine size={16}/>편집</button></div></article>)}</div>:!draft&&<div className="collection-empty"><h2>아직 저장한 인물이 없어요</h2><p>이름, 성격과 말투를 담아 첫 인물을 만들어 보세요.</p><button className="primary" disabled={busy||mediaBusy} onClick={()=>edit()}>인물 만들기</button></div>}
 </section>
}
