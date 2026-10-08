const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('node:assert/strict');
const ts=require('typescript');
const {DatabaseSync}=require('node:sqlite');
const root=path.resolve(__dirname,'..');
const sql=new DatabaseSync(':memory:');
for(const f of fs.readdirSync(root+'/drizzle').filter(f=>f.endsWith('.sql')).sort()) sql.exec(fs.readFileSync(root+'/drizzle/'+f,'utf8'));
let owner='test-alice'; const objects=new Map();
let afterQuery=null;
class Query { constructor(text,args=[]){this.text=text;this.args=args;} bind(...a){return new Query(this.text,a)} async first(){const value=sql.prepare(this.text).get(...this.args)||null; if(afterQuery) await afterQuery(this.text,this.args,value);return value} async all(){const results=sql.prepare(this.text).all(...this.args);if(afterQuery)await afterQuery(this.text,this.args,results);return {results}} async run(){const r=sql.prepare(this.text).run(...this.args);if(afterQuery)await afterQuery(this.text,this.args,r);return {meta:{changes:Number(r.changes)}}}}
const db={prepare:t=>new Query(t),batch:async qs=>{sql.exec('BEGIN');try{const r=[];for(const q of qs)r.push(await q.run());sql.exec('COMMIT');return r;}catch(e){sql.exec('ROLLBACK');throw e}}};
const env={DB:db,BUCKET:{put:async(k,b,o)=>objects.set(k,{body:b,options:o}),get:async k=>objects.get(k),delete:async k=>objects.delete(k)}};
const cache={};
function load(file){file=path.resolve(file);if(cache[file])return cache[file].exports;const module={exports:{}};cache[file]=module;const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;const req=name=>{if(name==='cloudflare:workers')return {env};if(name.endsWith('chatgpt-auth'))return {getChatGPTUser:async()=>owner?{userId:owner,email:owner+'@example.test'}:null};if(name.startsWith('.'))return load(path.resolve(path.dirname(file),name)+'.ts');return require(name)};vm.runInThisContext('(function(require,module,exports){'+code+'\n})',{filename:file})(req,module,module.exports);return module.exports;}
const api=load(root+'/app/api/app/route.ts'),media=load(root+'/app/api/media/[id]/route.ts'),memory=load(root+'/app/lib/memory.ts'),data=load(root+'/app/lib/data.ts');
const req=(suffix='',body)=>new Request('https://test.example/api/app'+suffix,body?{method:'POST',headers:{'Content-Type':'application/json','Origin':'https://test.example'},body:JSON.stringify(body)}:{});
async function post(action,body={}){const r=await api.POST(req('',{action,...body}));return {status:r.status,data:await r.json()}}
async function get(q=''){const r=await api.GET(req(q));return {status:r.status,data:await r.json()}}
async function image(id,query=''){const r=await media.GET(new Request('https://test.example/api/media/'+encodeURIComponent(id)+query),{params:Promise.resolve({id})});return r}
(async()=>{
const w={...data.blankWork(),title:'QA memory and grants',rating:'all',secret:'PRIVATE_SETTING_SENTINEL',responseRules:{ooc:'PRIVATE_RULE_SENTINEL',style:'style',length:'balanced',perspective:'third'},characters:[{name:'Adult',age:25,role:'friend',personality:'friendly'}],openings:[{title:'A',text:'opening',suggestions:[]}],cover:data.covers[1]};
let r=await post('saveWork',{work:w});assert.equal(r.status,200);const saved=r.data.work;
let s=await post('startChat',{workId:saved.id});assert.equal(s.status,200);const sid=s.data.id;
r=await get();assert.equal(JSON.stringify(r.data).includes('PRIVATE_SETTING_SENTINEL'),false);assert.equal(JSON.stringify(r.data).includes('PRIVATE_RULE_SENTINEL'),false);
r=await get('?session='+sid);assert.equal(JSON.stringify(r.data).includes('PRIVATE_SETTING_SENTINEL'),false);assert.equal(JSON.stringify(r.data).includes('PRIVATE_RULE_SENTINEL'),false);
r=await get('?editWork='+saved.id);assert.equal(r.data.work.secret,'PRIVATE_SETTING_SENTINEL');
const png='data:image/png;base64,'+Buffer.from([137,80,78,71,13,10,26,10,0,0,0,0]).toString('base64');
r=await post('saveCollectible',{workId:saved.id,characterId:saved.characters[0].id,title:'secret reward',condition:{type:'messages',value:2},requestId:'asset',file:png});assert.equal(r.status,200);const aid=r.data.assets[0].id;
assert.equal((await image(aid)).status,403);assert.equal((await image(aid,'?preview=creator')).status,200);
owner='test-bob';assert.equal((await image(aid,'?preview=creator')).status,403);assert.equal((await get('?editWork='+saved.id)).status,404);assert.equal((await get('?session='+sid)).status,404);assert.equal((await post('saveSummary',{sessionId:sid,id:'x',revision:0,content:'intrusion'})).status,404);assert.equal((await post('saveCollectible',{workId:saved.id})).status,403);assert.equal((await get()).data.assets.length,0);
owner='test-alice';r=await post('message',{sessionId:sid,content:'one',requestId:'message-1'});assert.equal(r.status,200);assert.equal(r.data.earned.length,0);r=await post('message',{sessionId:sid,content:'different retry content',requestId:'message-1'});assert.equal(r.data.earned.length,0);assert.equal(sql.prepare("SELECT COUNT(*) AS n FROM messages WHERE role='user' AND session_id=?").get(sid).n,1);assert.equal((await image(aid)).status,403);
r=await post('message',{sessionId:sid,content:'two',requestId:'message-2'});assert.equal(r.data.earned.length,1);assert.equal((await image(aid)).status,200);r=await post('message',{sessionId:sid,content:'two retry',requestId:'message-2'});assert.equal(r.data.earned.length,0);assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM collection_grants WHERE owner=? AND asset_id=?').get(owner,aid).n,1);
console.log('PASS ownership, no public private settings, locked/creator/earned media, duplicate normal request grants.');
r=await post('saveMemory',{sessionId:sid,manual:'ALICE_MEMORY',userNotes:'notes',persona:'persona',interval:2,enabled:true,revision:0});assert.equal(r.status,200);assert.deepEqual(r.data.memory.summaries.map(s=>[s.from_turn,s.to_turn,s.status,s.content]),[[1,2,'provider_required','']]);r=await post('saveMemory',{sessionId:sid,manual:'stale',interval:2,enabled:true,revision:0});assert.equal(r.status,409);const summary=(await get('?session='+sid)).data.memory.summaries[0];r=await post('saveSummary',{sessionId:sid,id:summary.id,revision:0,content:'edited memory',pinned:true,from_turn:-999,to_turn:999});assert.equal(r.status,200);assert.equal(r.data.memory.summaries[0].from_turn,1);assert.equal(r.data.memory.summaries[0].to_turn,2);assert.equal(r.data.memory.summaries[0].status,'manual');r=await post('saveSummary',{sessionId:sid,id:summary.id,revision:0,content:'stale'});assert.equal(r.status,409);
s=await post('startChat',{workId:saved.id});const other=s.data.id;r=await post('saveSummary',{sessionId:other,id:summary.id,revision:1,content:'cross session'});assert.equal(r.status,409);const context=await memory.compileProviderContext(owner,other,saved);assert.equal(context.readerContext.longTermMemory,'');assert.deepEqual(context.readerContext.memoryBook,[]);
console.log('PASS memory compare-and-swap, source bounds immutable, manual/pending status, and same-owner cross-session separation.');
// Client request IDs should not collide with the reserved assistant reply ID suffix.
const before=sql.prepare('SELECT COUNT(*) AS n FROM messages WHERE session_id=?').get(sid).n;
r=await post('message',{sessionId:sid,content:'this user input is silently lost',requestId:'message-1:reply'});
assert.equal(r.status,400);assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM messages WHERE session_id=?').get(sid).n,before);console.log('REQUEST_SUFFIX_COLLISION',JSON.stringify({status:r.status,before,after:sql.prepare('SELECT COUNT(*) AS n FROM messages WHERE session_id=?').get(sid).n,storedUserInput:sql.prepare("SELECT COUNT(*) AS n FROM messages WHERE content='this user input is silently lost'").get().n}));
// Simulate a summary scheduler paused after its first block while the user changes cadence.
for(let i=1;i<=20;i++){sql.prepare('INSERT INTO messages(id,owner,session_id,role,content,created) VALUES(?,?,?,?,?,?)').run('turn-'+i,owner,other,'user','test',new Date(i).toISOString());sql.prepare('INSERT INTO messages(id,owner,session_id,role,content,created) VALUES(?,?,?,?,?,?)').run('turn-'+i+':reply',owner,other,'assistant','test',new Date(i+1).toISOString());}
let release;let pause=new Promise(resolve=>release=resolve);let sawPause;const reached=new Promise(resolve=>sawPause=resolve);let once=false;
afterQuery=async (q,args)=>{if(!once&&q.startsWith('INSERT OR IGNORE INTO memory_summaries')&&args[2]===other){once=true;sawPause();await pause;}};
const schedule=memory.scheduleSummary(owner,other);await reached;
r=await post('saveMemory',{sessionId:other,manual:'',interval:2,enabled:true,revision:0});assert.equal(r.status,200);release();await schedule;afterQuery=null;
const ranges=sql.prepare('SELECT from_turn,to_turn FROM memory_summaries WHERE owner=? AND session_id=? ORDER BY from_turn,to_turn').all(owner,other);
for(let i=1;i<ranges.length;i++)assert.ok(ranges[i].from_turn>ranges[i-1].to_turn);console.log('CONCURRENT_CADENCE_RANGES',JSON.stringify(ranges));
// Fill this work to its supported limit, then retry the final successful upload.
for(let i=2;i<=30;i++){r=await post('saveCollectible',{workId:saved.id,characterId:saved.characters[0].id,title:'reward '+i,condition:{type:'messages',value:2},requestId:'asset-'+i,file:png});assert.equal(r.status,200);}
const countBefore=sql.prepare('SELECT COUNT(*) AS n FROM collectible_assets').get().n;
r=await post('saveCollectible',{workId:saved.id,characterId:saved.characters[0].id,title:'reward 30',condition:{type:'messages',value:2},requestId:'asset-30',file:png});
assert.equal(r.status,200);assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM collectible_assets').get().n,countBefore);console.log('DUPLICATE_UPLOAD_AT_LIMIT',JSON.stringify({status:r.status,error:r.data.error,countBefore,countAfter:sql.prepare('SELECT COUNT(*) AS n FROM collectible_assets').get().n}));
// Direct safe-MIME, signed-out media and adult-declaration checks.
r=await post('saveCollectible',{workId:saved.id,characterId:saved.characters[0].id,title:'svg',condition:{type:'messages',value:2},requestId:'unsafe-svg',file:'data:image/svg+xml;base64,PHN2Zy8+'});assert.equal(r.status,400);
owner=null;assert.equal((await image(aid)).status,401);owner='test-alice';
sql.prepare("UPDATE collectible_assets SET rating='19+' WHERE id=?").run(aid);assert.equal((await image(aid)).status,403);assert.equal((await image(aid,'?preview=creator')).status,200);await post('declareAdult',{confirm:true});const imageResponse=await image(aid);assert.equal(imageResponse.status,200);assert.equal(imageResponse.headers.get('Cache-Control'),'private, no-store');assert.equal(imageResponse.headers.get('X-Content-Type-Options'),'nosniff');assert.equal(imageResponse.headers.get('Content-Type'),'image/png');
console.log('PASS authenticated media, age-declaration enforcement, private cache headers.');
// Concurrent duplicate uploads race after both existing-request reads observe null.
r=await post('saveWork',{work:{...w,title:'concurrent upload QA'}});const concurrentWork=r.data.work;
let reachedBothResolve,unpause;const reachedBoth=new Promise(resolve=>reachedBothResolve=resolve),bothPause=new Promise(resolve=>unpause=resolve);let seen=0;
afterQuery=async(q,args)=>{if(q==='SELECT work_id FROM collectible_assets WHERE id=? AND owner=?'&&args[0]===owner+':same-concurrent'){seen++;if(seen===2)reachedBothResolve();await bothPause;}};
const concurrentBody={workId:concurrentWork.id,characterId:concurrentWork.characters[0].id,title:'concurrent',condition:{type:'messages',value:2},requestId:'same-concurrent',file:png};
const concurrent=Promise.all([post('saveCollectible',concurrentBody),post('saveCollectible',concurrentBody)]);await reachedBoth;unpause();const duplicateResults=await concurrent;afterQuery=null;
assert.deepEqual(duplicateResults.map(x=>x.status),[200,200]);assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM collectible_assets WHERE work_id=?').get(concurrentWork.id).n,1);assert.equal(objects.size-sql.prepare('SELECT COUNT(*) AS n FROM collectible_assets').get().n,0);console.log('CONCURRENT_DUPLICATE_UPLOAD',JSON.stringify({statuses:duplicateResults.map(x=>x.status),rows:sql.prepare('SELECT COUNT(*) AS n FROM collectible_assets WHERE work_id=?').get(concurrentWork.id).n,orphanObjectCount:objects.size-sql.prepare('SELECT COUNT(*) AS n FROM collectible_assets').get().n}));
// Concurrent distinct uploads race through the same 29-of-30 quota observation.
for(let i=2;i<=29;i++){r=await post('saveCollectible',{...concurrentBody,title:'seed '+i,requestId:'concurrent-seed-'+i});assert.equal(r.status,200);}
let quotaBothResolve,quotaUnpause;const quotaReached=new Promise(resolve=>quotaBothResolve=resolve),quotaPause=new Promise(resolve=>quotaUnpause=resolve);seen=0;
afterQuery=async(q,args)=>{if(q==='SELECT COUNT(*) AS n FROM collectible_assets WHERE owner=? AND work_id=? AND active=1'&&args[1]===concurrentWork.id){seen++;if(seen===2)quotaBothResolve();await quotaPause;}};
const quota=Promise.all([post('saveCollectible',{...concurrentBody,requestId:'quota-a'}),post('saveCollectible',{...concurrentBody,requestId:'quota-b'})]);await quotaReached;quotaUnpause();const quotaResults=await quota;afterQuery=null;
assert.deepEqual(quotaResults.map(x=>x.status).sort(),[200,400]);assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM collectible_assets WHERE work_id=?').get(concurrentWork.id).n,30);console.log('CONCURRENT_QUOTA',JSON.stringify({statuses:quotaResults.map(x=>x.status),rows:sql.prepare('SELECT COUNT(*) AS n FROM collectible_assets WHERE work_id=?').get(concurrentWork.id).n}));
console.log('DONE isolated memory-only test database; no external provider, R2, auth, or D1 access.');
})().catch(e=>{console.error(e);process.exitCode=1});
