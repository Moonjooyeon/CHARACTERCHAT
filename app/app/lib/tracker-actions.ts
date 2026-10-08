import {db} from './db';
import {readStatus} from './status';
import {normalizeStatusTemplate} from './status-fields';
import {templateFields} from './library';
import {normalizedWork} from './data';

/** Apply is deliberately separate from editing values: client values are never accepted here. */
export async function applyTracker(owner:string,b:any){
 const out=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
 const fail=(error:string,status=400)=>out({error},status);
 const sid=typeof b.sessionId==='string'?b.sessionId.slice(0,80):'';
 const session=await db().prepare('SELECT snapshot FROM sessions WHERE id=? AND owner=? AND archived=0').bind(sid,owner).first<any>();
 if(!session)return fail('대화를 찾을 수 없습니다.',404);
 const previous=await readStatus(owner,sid);
 if(previous.revision!==b.revision)return fail('다른 창에서 상태가 바뀌었어요. 상태창을 닫고 다시 열어 주세요.',409);
 const work=normalizedWork(JSON.parse(session.snapshot));
 let fields=previous.template,tracker={...previous.tracker},shared:any=null;
 if(b.mode==='none')tracker={...tracker,enabled:false};
 else if(b.mode==='creator'){
  fields=normalizeStatusTemplate(work.statusTemplate);
  tracker={enabled:true,source:'creator',name:work.trackerName||'작품 기본 상태창'};
 }else if(b.mode==='current')tracker={...tracker,enabled:true};
 else if(b.mode==='shared'){
  shared=await db().prepare("SELECT id,name,description,fields,author_name,revision FROM status_templates WHERE id=? AND visibility='shared' AND archived=0").bind(typeof b.sourceId==='string'?b.sourceId.slice(0,80):'').first<any>();
  if(!shared)return fail('공유가 종료되었거나 상태창을 찾을 수 없습니다.',404);
  if(shared.revision!==b.sourceRevision)return fail('공유 상태창이 바뀌었어요. 다시 열어 미리보기를 확인해 주세요.',409);
  fields=templateFields(JSON.parse(shared.fields));
  tracker={enabled:true,source:'shared',sourceId:shared.id,name:shared.name};
 }else return fail('사용할 상태창을 선택해 주세요.');
 const operationId=crypto.randomUUID(),date=new Date().toISOString(),copyId=crypto.randomUUID();
 // The status CAS, source visibility/revision, capacity and import are checked together.
 const sharedGuard=shared?" AND EXISTS(SELECT 1 FROM status_templates WHERE id=? AND visibility='shared' AND archived=0 AND revision=?) AND ((SELECT COUNT(*) FROM status_templates WHERE owner=?)<100 OR EXISTS(SELECT 1 FROM template_imports WHERE owner=? AND source_id=?))":'';
 const args:any[]=[sid,owner,JSON.stringify({values:previous.data,template:fields,tracker,operationId}),date,sid,owner];
 if(shared)args.push(shared.id,shared.revision,owner,owner,shared.id);
 args.push(b.revision);
 const statements=[db().prepare("INSERT INTO session_status(session_id,owner,data,revision,updated) SELECT ?,?,?,1,? WHERE EXISTS(SELECT 1 FROM sessions WHERE id=? AND owner=? AND archived=0)"+sharedGuard+" ON CONFLICT(session_id) DO UPDATE SET data=excluded.data,revision=session_status.revision+1,updated=excluded.updated WHERE session_status.owner=excluded.owner AND session_status.revision=?").bind(...args)];
 if(shared){
  const applied="EXISTS(SELECT 1 FROM session_status WHERE session_id=? AND owner=? AND json_extract(data,'$.operationId')=?)";
  statements.push(db().prepare('INSERT OR IGNORE INTO template_imports(owner,source_id,template_id) SELECT ?,?,? WHERE '+applied).bind(owner,shared.id,copyId,sid,owner,operationId));
  statements.push(db().prepare('INSERT INTO status_templates(id,owner,name,description,fields,author_name,source_id,created,updated) SELECT ?,?,?,?,?,?,?,?,? WHERE '+applied+' AND EXISTS(SELECT 1 FROM template_imports WHERE owner=? AND source_id=? AND template_id=?)').bind(copyId,owner,shared.name,shared.description,JSON.stringify(fields),shared.author_name,shared.id,date,date,sid,owner,operationId,owner,shared.id,copyId));
 }
 const result=await db().batch(statements);
 if(!result[0].meta.changes)return fail('상태나 공유 내용이 바뀌었거나 내 상태창 보관함이 가득 찼어요. 다시 확인해 주세요.',409);
 return out({status:await readStatus(owner,sid)});
}
