import {db} from './db';
import {normalizeStatusTemplate,defaultStatusTemplate,type StatusField} from './status-fields';
export {templatePresets} from './template-presets';
export type Persona={id:string;name:string;content:string;revision:number;archived:number;created:string;updated:string};
export type Template={id:string;name:string;description:string;author_name?:string;fields:StatusField[];visibility:string;source_id?:string;revision:number;archived:number;imports?:number;updated:string};
// All template writes cross this explicit allowlist. No current status, memory, persona or work setting may travel with a template.
export function templateFields(value:unknown){if(!Array.isArray(value)||value.length>13)throw Error('상태창 항목을 확인해 주세요.');return normalizeStatusTemplate(value);}
export async function readLibrary(owner:string){const [p,t,g]=await Promise.all([
 db().prepare('SELECT id,name,content,revision,archived,created,updated FROM personas WHERE owner=? ORDER BY updated DESC').bind(owner).all<Persona>(),
 db().prepare('SELECT id,name,description,fields,author_name,visibility,source_id,revision,archived,updated FROM status_templates WHERE owner=? ORDER BY updated DESC').bind(owner).all<any>(),
 db().prepare("SELECT t.id,t.name,t.description,t.fields,t.author_name,t.revision,t.updated,(SELECT COUNT(*) FROM template_imports i WHERE i.source_id=t.id) AS imports FROM status_templates t WHERE t.visibility='shared' AND t.archived=0 ORDER BY t.updated DESC").all<any>()
]);return {personas:p.results,templates:t.results.map(r=>({...r,fields:normalizeStatusTemplate(JSON.parse(r.fields))})),sharedTemplates:g.results.map(r=>({...r,fields:normalizeStatusTemplate(JSON.parse(r.fields))}))};}
export async function personaSnapshot(owner:string,personaId:unknown){if(!personaId)return {};const p=await db().prepare('SELECT id,name,content,revision FROM personas WHERE id=? AND owner=? AND archived=0').bind(String(personaId),owner).first<any>();if(!p)throw Error('페르소나가 보관되었거나 변경됐어요. 다시 선택해 주세요.');return {...p,capturedAt:new Date().toISOString()};}
export async function readSessionDetails(owner:string,sid:string){const d=await db().prepare('SELECT title,persona_snapshot,provenance,updated FROM session_details WHERE session_id=? AND owner=?').bind(sid,owner).first<any>();return d?{title:d.title,personaSnapshot:JSON.parse(d.persona_snapshot),provenance:JSON.parse(d.provenance),updated:d.updated}:{title:'',personaSnapshot:{},provenance:{}};}
