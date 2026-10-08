import {db} from './db';
import {readWork,mayChat} from './collectibles';
import {normalizedWork} from './data';
import {readSessionDetails} from './library';
const clean=(v:unknown,n:number)=>typeof v==='string'?v.trim().slice(0,n):'';
const out=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}}),fail=(error:string,status=400)=>out({error},status);
// Copies retain display order even when concurrent source turns share timestamps.
export function orderedCloneTimes(messages:any[]){let previous=-Infinity;return messages.map(m=>{const parsed=Date.parse(m.created);previous=Math.max(Number.isFinite(parsed)?parsed:0,previous+1);return new Date(previous).toISOString()})}
export async function transcriptHash(messages:any[]){const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(messages.map(m=>[m.id,m.role,m.content,m.revision||0,m.created]))));return Array.from(new Uint8Array(bytes),v=>v.toString(16).padStart(2,'0')).join('');}
export async function readMessageTools(owner:string,sid:string){const r=await db().prepare('SELECT message_id,label,active,revision,updated FROM message_bookmarks WHERE owner=? AND session_id=?').bind(owner,sid).all();return {bookmarks:r.results};}
export async function messageAction(owner:string,b:any):Promise<Response|null>{
 if(!['editMessage','bookmarkMessage','branchAtMessage','messageHistory','rerollMessage'].includes(b.action))return null;
 const sid=clean(b.sessionId,80),mid=clean(b.messageId,300),s=await db().prepare('SELECT * FROM sessions WHERE id=? AND owner=? AND archived=0').bind(sid,owner).first<any>();if(!s)return fail('대화를 찾을 수 없습니다.',404);
 const m=await db().prepare('SELECT * FROM messages WHERE id=? AND session_id=? AND owner=?').bind(mid,sid,owner).first<any>();if(!m)return fail('메시지를 찾을 수 없습니다.',404);
 if(!await mayChat(owner,await readWork(owner,s.work_id)||normalizedWork(JSON.parse(s.snapshot))))return fail('19+ 이용 확인이 필요합니다.',403);
 if(b.action==='rerollMessage')return fail('다시 생성하려면 실제 AI 연결이 필요해요. 메시지와 잉크는 바뀌지 않았습니다.',503);
 if(b.action==='messageHistory'){const r=await db().prepare('SELECT revision,previous_content,content,created FROM message_revisions WHERE owner=? AND session_id=? AND message_id=? ORDER BY revision').bind(owner,sid,mid).all();return out({revisions:r.results});}
 const request=clean(b.requestId,80);if(!/^[A-Za-z0-9_-]{1,80}$/.test(request))return fail('요청을 다시 시작해 주세요.');
 if(b.action==='editMessage'){
  const prior=await db().prepare('SELECT message_id,session_id FROM message_revisions WHERE owner=? AND request_id=?').bind(owner,request).first<any>();if(prior)return prior.message_id===mid&&prior.session_id===sid?out({ok:true}):fail('다른 수정 요청입니다.',409);
  const content=clean(b.content,m.role==='user'?2000:8000);if(!content)return fail('메시지 내용을 입력해 주세요.');if(m.revision!==b.revision)return fail('다른 창에서 이 메시지가 바뀌었어요. 다시 열어 확인해 주세요.',409);
  if(m.content===content)return out({ok:true});if(m.revision>=100)return fail('이 메시지는 수정 기록 100개를 모두 사용했어요. 새 갈래에서 이어 써 주세요.');
  const prefix=await db().prepare("SELECT COUNT(*) AS n FROM messages WHERE owner=? AND session_id=? AND role='user' AND (created<? OR (created=? AND id<=?))").bind(owner,sid,m.created,m.created,mid).first<any>();
  const time=new Date().toISOString(),capture=crypto.randomUUID(),rid=crypto.randomUUID();
  const r=await db().batch([
   db().prepare('UPDATE messages SET content=?,revision=revision+1 WHERE id=? AND owner=? AND session_id=? AND revision=? AND EXISTS(SELECT 1 FROM sessions WHERE id=? AND owner=? AND archived=0)').bind(content,mid,owner,sid,b.revision,sid,owner),
   db().prepare('INSERT INTO message_revisions(id,owner,session_id,message_id,request_id,capture_key,revision,previous_content,content,created) SELECT ?,?,?,?,?,?,?,?,?,? WHERE changes()=1').bind(rid,owner,sid,mid,request,capture,b.revision+1,m.content,content,time),
   db().prepare("UPDATE memory_summaries SET status='invalidated',revision=revision+1,updated=? WHERE owner=? AND session_id=? AND to_turn>=? AND EXISTS(SELECT 1 FROM message_revisions WHERE id=? AND capture_key=?)").bind(time,owner,sid,Math.max(1,prefix.n),rid,capture)
  ]);
  if(!r[0].meta.changes){const retry=await db().prepare('SELECT id FROM message_revisions WHERE owner=? AND request_id=? AND message_id=? AND session_id=?').bind(owner,request,mid,sid).first();if(retry)return out({ok:true});return fail('메시지가 바뀌었어요. 다시 열어 확인해 주세요.',409);}return out({ok:true});
 }
 if(b.action==='bookmarkMessage'){
  const previous=await db().prepare('SELECT revision,request_id FROM message_bookmarks WHERE message_id=? AND owner=? AND session_id=?').bind(mid,owner,sid).first<any>();if(previous?.request_id===request)return out(await readMessageTools(owner,sid));
  if((previous?.revision??-1)!==b.revision)return fail('책갈피가 다른 창에서 바뀌었어요. 다시 열어 주세요.',409);
  const label=clean(b.label,80);if(b.active!==false&&!label)return fail('책갈피 이름을 입력해 주세요.');
  const r=await db().prepare('INSERT INTO message_bookmarks(message_id,owner,session_id,label,active,revision,request_id,updated) SELECT ?,?,?,?,?,0,?,? WHERE EXISTS(SELECT 1 FROM sessions WHERE id=? AND owner=? AND archived=0) ON CONFLICT(message_id) DO UPDATE SET label=excluded.label,active=excluded.active,revision=message_bookmarks.revision+1,request_id=excluded.request_id,updated=excluded.updated WHERE message_bookmarks.owner=excluded.owner AND message_bookmarks.session_id=excluded.session_id AND message_bookmarks.revision=?').bind(mid,owner,sid,label,b.active===false?0:1,request,new Date().toISOString(),sid,owner,b.revision).run();
  if(!r.meta.changes){const retry=await db().prepare('SELECT request_id FROM message_bookmarks WHERE message_id=? AND owner=? AND session_id=?').bind(mid,owner,sid).first<any>();if(retry?.request_id===request)return out(await readMessageTools(owner,sid));return fail('책갈피가 바뀌었어요. 다시 열어 확인해 주세요.',409);}return out(await readMessageTools(owner,sid));
 }
 // Historical branches deliberately copy transcript only. No modern memory or persona is guessed at an earlier point.
 const target=await transcriptHash([{id:owner,role:sid,content:mid,revision:0,created:request}]),branchId=target;
 const prior=await db().prepare('SELECT id FROM sessions WHERE id=? AND owner=?').bind(branchId,owner).first();if(prior)return out({id:branchId});
 const all=await db().prepare('SELECT * FROM messages WHERE session_id=? AND owner=? ORDER BY created,id').bind(sid,owner).all<any>();const index=all.results.findIndex(x=>x.id===mid),prefix=all.results.slice(0,index+1);
 if(index<0||m.role!=='assistant'||index>0&&(all.results[index-1].role!=='user'||mid!==all.results[index-1].id+':reply'))return fail('캐릭터의 답변이 끝난 지점에서 갈래를 만들 수 있어요.');
 if(prefix.some(x=>x.role==='user'&&!prefix.some(a=>a.id===x.id+':reply'&&a.role==='assistant')))return fail('아직 답변이 끝나지 않은 메시지가 포함되어 있어요. 답변이 모두 끝난 지점에서 분기해 주세요.');
 if(prefix.length>401)return fail('갈래는 처음부터 200턴까지 만들 수 있어요. 원본은 계속 이어 쓸 수 있습니다.');
 if(m.revision!==b.revision||await transcriptHash(all.results)!==b.sourceHash)return fail('대화가 바뀌었어요. 다시 열고 갈래를 만들어 주세요.',409);
 if(b.confirmTranscriptOnly!==true)return fail('이 지점의 대화문만 가져오고 기억과 상태를 비워서 시작하는지 확인해 주세요.');
 const d=await readSessionDetails(owner,sid),work=normalizedWork(JSON.parse(s.snapshot)),time=new Date().toISOString(),capture=crypto.randomUUID();
 const provenance={captureKey:capture,kind:'branch',sourceSessionId:sid,sourceMessageId:mid,sourceTitle:d.title||work.title,turns:prefix.filter(x=>x.role==='user').length,capturedAt:time,inherited:'대화문만 · 당시 기억과 상태 기록 없음',transcriptOnly:true};
 const guard=' WHERE EXISTS(SELECT 1 FROM session_details WHERE session_id=? AND owner=? AND json_extract(provenance,\'$.captureKey\')=?)';
 const stmts=[db().prepare('INSERT OR IGNORE INTO sessions(id,owner,work_id,snapshot,opening,created) SELECT ?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM sessions WHERE id=? AND owner=? AND archived=0) AND (SELECT COUNT(*) FROM messages WHERE session_id=? AND owner=? AND (created<? OR (created=? AND id<=?)))=? AND (SELECT COALESCE(SUM(revision),0) FROM messages WHERE session_id=? AND owner=? AND (created<? OR (created=? AND id<=?)))=?').bind(branchId,owner,s.work_id,s.snapshot,s.opening,time,sid,owner,sid,owner,m.created,m.created,mid,prefix.length,sid,owner,m.created,m.created,mid,prefix.reduce((sum,x)=>sum+x.revision,0)),db().prepare("INSERT OR IGNORE INTO session_details(session_id,owner,title,persona_snapshot,provenance,updated) SELECT ?,?,?,'{}',?,? WHERE changes()=1").bind(branchId,owner,clean(b.title,80)||((d.title||work.title)+' · 갈래').slice(0,80),JSON.stringify(provenance),time)];
 const ids=new Map(prefix.map((x,i)=>[x.id,branchId+':m'+String(i).padStart(6,'0')]));for(const x of prefix)if(x.id.endsWith(':reply')&&ids.has(x.id.slice(0,-6)))ids.set(x.id,ids.get(x.id.slice(0,-6))+':reply');
 const cloneTimes=orderedCloneTimes(prefix);for(const [index,x] of prefix.entries())stmts.push(db().prepare('INSERT OR IGNORE INTO messages(id,owner,session_id,role,content,created) SELECT ?,?,?,?,?,?'+guard).bind(ids.get(x.id),owner,branchId,x.role,x.content,cloneTimes[index],branchId,owner,capture));
 stmts.push(db().prepare('INSERT OR IGNORE INTO session_memory(session_id,owner,updated) SELECT ?,?,?'+guard).bind(branchId,owner,time,branchId,owner,capture));
 const r=await db().batch(stmts);if(!r[0].meta.changes){const duplicate=await db().prepare('SELECT id FROM sessions WHERE id=? AND owner=?').bind(branchId,owner).first();if(duplicate)return out({id:branchId});return fail('대화가 바뀌었어요. 다시 열고 갈래를 만들어 주세요.',409);}return out({id:branchId});
}
