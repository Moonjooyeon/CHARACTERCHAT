import {db} from './db';
export function koreaDay(now=new Date()) { return new Date(now.getTime()+9*60*60*1000).toISOString().slice(0,10); }
export async function readAttendance(owner:string,now=new Date()) {
 const day=koreaDay(now);
 const {results}=await db().prepare('SELECT day,grapes FROM attendance WHERE owner=? ORDER BY day DESC').bind(owner).all<{day:string;grapes:number}>();
 return {day,claimed:results.some(r=>r.day===day),count:results.length,grapes:results.reduce((sum,r)=>sum+r.grapes,0),history:results.slice(0,30),nextReward:(results.length+1)%7===0?30:10};
}
export async function claimAttendance(owner:string,now=new Date()) {
 const day=koreaDay(now);
 // A single atomic statement prices and records the award. Retried requests and
 // competing tabs cannot award the same owner/day twice.
 await db().prepare(`INSERT OR IGNORE INTO attendance(owner,day,grapes,created)
 SELECT ?,?,CASE WHEN (COUNT(*)+1)%7=0 THEN 30 ELSE 10 END,? FROM attendance WHERE owner=?`).bind(owner,day,now.toISOString(),owner).run();
 return readAttendance(owner,now);
}
