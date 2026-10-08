const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('node:assert/strict');
const ts=require('typescript');
const {DatabaseSync}=require('node:sqlite');
const root=path.resolve(__dirname,'..');
const sql=new DatabaseSync(':memory:');
for(const f of fs.readdirSync(root+'/drizzle').filter(f=>f.endsWith('.sql')).sort()) sql.exec(fs.readFileSync(root+'/drizzle/'+f,'utf8'));
let owner='test-alice'; const objects=new Map();
let afterQuery=null;let beforeBatch=null;let providerCalls=[];
class Query { constructor(text,args=[]){this.text=text;this.args=args;} bind(...a){return new Query(this.text,a)} async first(){const value=sql.prepare(this.text).get(...this.args)||null; if(afterQuery) await afterQuery(this.text,this.args,value);return value} async all(){const results=sql.prepare(this.text).all(...this.args);if(afterQuery)await afterQuery(this.text,this.args,results);return {results}} async run(){const r=sql.prepare(this.text).run(...this.args);if(afterQuery)await afterQuery(this.text,this.args,r);return {meta:{changes:Number(r.changes)}}}}
const db={prepare:t=>new Query(t),batch:async qs=>{if(beforeBatch)await beforeBatch(qs);sql.exec('BEGIN');try{const r=[];for(const q of qs){const x=sql.prepare(q.text).run(...q.args);r.push({meta:{changes:Number(x.changes)}});}sql.exec('COMMIT');return r;}catch(e){sql.exec('ROLLBACK');throw e}}};
const env={DB:db,BUCKET:{put:async(k,b,o)=>objects.set(k,{body:b,options:o}),get:async k=>objects.get(k),delete:async k=>objects.delete(k)}};
const cache={};
function load(file){file=path.resolve(file);if(cache[file])return cache[file].exports;const module={exports:{}};cache[file]=module;const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;const req=name=>{if(name==='cloudflare:workers')return {env};if(name.endsWith('/providers'))return {sampleChatProvider:{reply:async input=>{providerCalls.push(input);return 'MOCK REPLY'}}};if(name.endsWith('chatgpt-auth'))return {getChatGPTUser:async()=>owner?{userId:owner,email:owner+'@example.test'}:null};if(name.startsWith('.'))return load(path.resolve(path.dirname(file),name)+'.ts');return require(name)};vm.runInThisContext('(function(require,module,exports){'+code+'\n})',{filename:file})(req,module,module.exports);return module.exports;}
const api=load(root+'/app/api/app/route.ts'),media=load(root+'/app/api/media/[id]/route.ts'),memory=load(root+'/app/lib/memory.ts'),data=load(root+'/app/lib/data.ts');
const req=(suffix='',body)=>new Request('https://test.example/api/app'+suffix,body?{method:'POST',headers:{'Content-Type':'application/json','Origin':'https://test.example'},body:JSON.stringify(body)}:{});
async function post(action,body={}){const r=await api.POST(req('',{action,...body}));return {status:r.status,data:await r.json()}}
async function get(q=''){const r=await api.GET(req(q));return {status:r.status,data:await r.json()}}
async function image(id,query=''){const r=await media.GET(new Request('https://test.example/api/media/'+encodeURIComponent(id)+query),{params:Promise.resolve({id})});return r}

(async()=>{
 const attendance=load(root+'/app/lib/attendance.ts');
 assert.equal(attendance.koreaDay(new Date('2026-10-08T14:59:59Z')),'2026-10-08');
 assert.equal(attendance.koreaDay(new Date('2026-10-08T15:00:00Z')),'2026-10-09');
 const firstDay=new Date('2026-10-01T03:00:00Z');
 await Promise.all(Array.from({length:20},()=>attendance.claimAttendance('daily',firstDay)));
 let a=await attendance.readAttendance('daily',firstDay);assert.equal(a.count,1);assert.equal(a.grapes,10);assert.equal(a.claimed,true);
 for(let i=2;i<=7;i++)await attendance.claimAttendance('daily',new Date(`2026-10-${String(i).padStart(2,'0')}T03:00:00Z`));
 a=await attendance.readAttendance('daily',new Date('2026-10-07T03:00:00Z'));assert.equal(a.count,7);assert.equal(a.grapes,90);assert.equal(a.history[0].grapes,30);
 a=await attendance.readAttendance('daily',new Date('2026-10-08T03:00:00Z'));assert.equal(a.claimed,false);assert.equal(a.nextReward,10);
 await attendance.claimAttendance('daily',new Date('2026-10-10T03:00:00Z'));a=await attendance.readAttendance('daily');assert.equal(a.count,8);assert.equal(a.grapes,100);
 assert.equal((await attendance.readAttendance('other')).grapes,0);
 owner=null;assert.equal((await get('?attendance=1')).status,401);assert.equal((await post('claimAttendance')).status,401);
 owner='api-owner';let result=await post('claimAttendance',{owner:'forged',grapes:99999,day:'2100-01-01'});assert.equal(result.status,200);assert.equal(result.data.grapes,10);assert.equal(result.data.day,attendance.koreaDay());assert.equal((await attendance.readAttendance('forged')).grapes,0);
 result=await post('claimAttendance');assert.equal(result.data.grapes,10);assert.equal((await get('?wallet=1')).data.balance,130);
 const cross=await api.POST(new Request('https://test.example/api/app',{method:'POST',headers:{Origin:'https://other.test','Content-Type':'application/json'},body:JSON.stringify({action:'claimAttendance'})}));assert.equal(cross.status,403);
 console.log('PASS: KST midnight, concurrent/retried claims, seventh-day award, gaps, owner isolation, forged inputs, auth/origin checks and unified credit ledger');
})().catch(e=>{console.error(e);process.exitCode=1});
