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
const w={...data.blankWork(),id:'branch-work',title:'Original',rating:'all',secret:'PRIVATE',characters:[{name:'Adult',age:25,role:'friend',personality:'friendly'}],openings:[{title:'A',text:'opening',suggestions:[]}],cover:data.covers[1]};
let r=await post('saveWork',{work:w});assert.equal(r.status,200);const saved=r.data.work;
r=await post('startChat',{workId:saved.id});assert.equal(r.status,200);const sid=r.data.id;
function addTurn(n){const mid='test-'+n;sql.prepare('INSERT INTO messages(id,owner,session_id,role,content,created) VALUES(?,?,?,?,?,?)').run(mid,owner,sid,'user','TURN '+n,new Date(Date.now()+n*100).toISOString());sql.prepare('INSERT INTO messages(id,owner,session_id,role,content,created) VALUES(?,?,?,?,?,?)').run(mid+':reply',owner,sid,'assistant','REPLY '+n,new Date(Date.now()+n*100+1).toISOString());return mid+':reply'}
let last=addTurn(1);last=addTurn(2);
r=await post('saveMemory',{sessionId:sid,manual:'OLD_MANUAL',userNotes:'NOTES',persona:'PERSONA',interval:2,enabled:true,includeBook:true,revision:0});assert.equal(r.status,200);const summary=r.data.memory.summaries[0];
r=await post('saveSummary',{sessionId:sid,id:summary.id,revision:0,content:'OLD SUMMARY',pinned:false});assert.equal(r.status,200);
// Guard should include summary state, not only the separate session_memory revision.
let once=false;beforeBatch=async qs=>{if(!once&&qs[0].text.startsWith('INSERT OR IGNORE INTO sessions')){once=true;sql.prepare("UPDATE memory_summaries SET content='NEW SUMMARY',revision=revision+1 WHERE id=?").run(summary.id);}};
r=await post('branchSession',{sessionId:sid,lastMessageId:last,requestId:'summary-race'});beforeBatch=null;assert.equal(r.status,409);
console.log('SUMMARY_RACE_BLOCKED',r.status);
// A branch begun before the source is archived currently succeeds after archive commits.
once=false;beforeBatch=async qs=>{if(!once&&qs[0].text.startsWith('INSERT OR IGNORE INTO sessions')){once=true;sql.prepare('UPDATE sessions SET archived=1 WHERE id=?').run(sid);}};
r=await post('branchSession',{sessionId:sid,lastMessageId:last,requestId:'archive-race'});beforeBatch=null;console.log('BRANCH_AFTER_ARCHIVE_RACE',JSON.stringify({status:r.status,sourceArchived:sql.prepare('SELECT archived FROM sessions WHERE id=?').get(sid).archived}));assert.equal(r.status,409);
sql.prepare('UPDATE sessions SET archived=0 WHERE id=?').run(sid);
// Concurrent retries: early existing-snapshot check sees null, later batch must not add future data to another request's winner.
const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(owner+'|'+sid+'|'+'retry-race'));const branchId=Buffer.from(digest).toString('hex');
let release,reachedResolve;const paused=new Promise(x=>release=x),reached=new Promise(x=>reachedResolve=x);once=false;
afterQuery=async(q,args)=>{if(!once&&q==='SELECT id FROM sessions WHERE id=? AND owner=?'&&args[0]===branchId){once=true;reachedResolve();await paused;}};
const futureRetry=post('branchSession',{sessionId:sid,lastMessageId:'test-3:reply',requestId:'retry-race'});await reached;
const winner=await post('branchSession',{sessionId:sid,lastMessageId:last,requestId:'retry-race'});assert.equal(winner.status,200);const before=sql.prepare('SELECT COUNT(*) AS n FROM messages WHERE session_id=?').get(branchId).n;
last=addTurn(3);release();const loser=await futureRetry;afterQuery=null;const after=sql.prepare('SELECT COUNT(*) AS n FROM messages WHERE session_id=?').get(branchId).n;
console.log('BRANCH_RETRY_FUTURE_CONTAMINATION',JSON.stringify({winner:winner.status,loser:loser.status,before,after,provenance:JSON.parse(sql.prepare('SELECT provenance FROM session_details WHERE session_id=?').get(branchId).provenance)}));
assert.equal(loser.status,200);assert.equal(after,before);assert.equal(loser.data.id,winner.data.id);
console.log('DONE branch reproductions in isolated SQLite, no actual provider/auth/storage calls.');
})().catch(e=>{console.error(e);process.exitCode=1});
