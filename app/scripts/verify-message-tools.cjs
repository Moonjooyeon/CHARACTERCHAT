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
const w={...data.blankWork(),id:'message-tools-work',title:'Pinned work',rating:'all',secret:'PRIVATE ORIGINAL',characters:[{name:'Guide',age:25,role:'friend',personality:'kind'}],openings:[{title:'Opening',text:'Original opening',suggestions:[]}]};
let r=await post('saveWork',{work:w});assert.equal(r.status,200);const work=r.data.work,sid=(await post('startChat',{workId:work.id})).data.id;
const opening=(await get('?session='+sid)).data.messages[0];
const base=Date.now()+1000;
function addTurn(n){const mid='tools-turn-'+n;sql.prepare('INSERT INTO messages(id,owner,session_id,role,content,created) VALUES(?,?,?,?,?,?)').run(mid,owner,sid,'user','USER '+n,new Date(base+n*100).toISOString());sql.prepare('INSERT INTO messages(id,owner,session_id,role,content,created) VALUES(?,?,?,?,?,?)').run(mid+':reply',owner,sid,'assistant','REPLY '+n,new Date(base+n*100+1).toISOString());return mid+':reply'}
const first=addTurn(1);addTurn(2);const last=addTurn(3);
await post('saveMemory',{sessionId:sid,manual:'FUTURE_MANUAL',userNotes:'FUTURE_NOTES',persona:'FUTURE_PERSONA',interval:2,enabled:true,includeBook:true,revision:0});
await post('saveStatus',{sessionId:sid,revision:0,data:{place:'FUTURE_PLACE'}});
let snap=(await get('?session='+sid)).data,summary=snap.memory.summaries[0];await post('saveSummary',{sessionId:sid,id:summary.id,revision:0,content:'FUTURE_SUMMARY',pinned:true});
await post('saveWork',{work:{...work,title:'Changed world',world:'FUTURE_WORLD',secret:'FUTURE_SECRET'}});
snap=(await get('?session='+sid)).data;
assert.equal((await post('branchAtMessage',{sessionId:sid,messageId:first,revision:0,sourceHash:snap.sourceHash,requestId:'no-confirm'})).status,400);
assert.equal((await post('branchAtMessage',{sessionId:sid,messageId:'tools-turn-1',revision:0,sourceHash:snap.sourceHash,requestId:'user-branch',confirmTranscriptOnly:true})).status,400);
const request={sessionId:sid,messageId:first,revision:0,sourceHash:snap.sourceHash,requestId:'branch-one',confirmTranscriptOnly:true};
r=await post('branchAtMessage',request);assert.equal(r.status,200,JSON.stringify(r));const branch=r.data.id,branched=(await get('?session='+branch)).data;
assert.equal(branched.messages.length,3);assert.equal(branched.messages.at(-1).content,'REPLY 1');assert.equal(branched.memory.settings.manual,'');assert.equal(branched.memory.settings.persona,'');assert.equal(branched.memory.settings.user_notes,'');assert.equal(branched.memory.summaries.length,0);assert.equal(branched.status.data.place,'');assert.equal(branched.session.provenance.transcriptOnly,true);assert.deepEqual(branched.session.personaSnapshot,{});assert.equal(branched.session.snapshot.title,'Pinned work');assert.equal(JSON.stringify(branched).includes('FUTURE_'),false);
assert.equal((await post('branchAtMessage',request)).data.id,branch);
assert.equal((await get('?session='+sid)).data.messages.length,7);
console.log('PASS per-message historical branch: completed answer prefix only, pinned original work, no future transcript/memory/persona/notes/status/summaries, explicit reset consent, idempotency, original preserved.');
// Bookmarks identify one exact message, persist labels, and retain tombstone revisions.
let mark={sessionId:sid,messageId:first,label:'My scene',revision:-1,requestId:'mark-1'};r=await post('bookmarkMessage',mark);assert.equal(r.status,200);assert.equal(r.data.bookmarks[0].message_id,first);assert.equal(r.data.bookmarks[0].label,'My scene');assert.equal((await post('bookmarkMessage',mark)).status,200);
assert.equal((await post('bookmarkMessage',{...mark,requestId:'stale-mark'})).status,409);
r=await post('bookmarkMessage',{...mark,requestId:'remove-mark',active:false,revision:0});assert.equal(r.status,200);assert.equal(r.data.bookmarks[0].active,0);assert.equal(r.data.bookmarks[0].revision,1);
r=await post('bookmarkMessage',{...mark,requestId:'restore-mark',label:'Again',revision:1});assert.equal(r.status,200);assert.equal((await get('?session='+sid)).data.bookmarks[0].active,1);
assert.equal((await get('?session='+branch)).data.bookmarks.length,0);
console.log('PASS message bookmark label/update/remove/re-add/retry/CAS, exact target, same-owner session separation.');
// Edit never rewrites later replies, revisions retain exact originals, invalidated summaries are excluded.
const beforeLater=sql.prepare('SELECT content FROM messages WHERE id=?').get(last).content;
const unchanged=await post('editMessage',{sessionId:sid,messageId:first,content:'REPLY 1',revision:0,requestId:'no-change'});assert.equal(unchanged.status,200);assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM message_revisions').get().n,0);assert.equal((await get('?session='+sid)).data.memory.summaries[0].status,'manual');
const edit={sessionId:sid,messageId:first,content:'EDITED *action*',revision:0,requestId:'edit-first'};
r=await post('editMessage',edit);assert.equal(r.status,200);assert.equal((await post('editMessage',edit)).status,200);assert.equal((await post('editMessage',{...edit,requestId:'edit-stale'})).status,409);
assert.equal(sql.prepare('SELECT content FROM messages WHERE id=?').get(last).content,beforeLater);
snap=(await get('?session='+sid)).data;assert.equal(snap.messages.find(m=>m.id===first).revision,1);assert.equal(snap.memory.summaries[0].status,'invalidated');assert.equal(snap.memory.summaries[0].content,'FUTURE_SUMMARY');assert.equal((await memory.compileProviderContext(owner,sid,work)).readerContext.memoryBook.length,0);
r=await post('messageHistory',{sessionId:sid,messageId:first});assert.equal(r.data.revisions.length,1);assert.equal(r.data.revisions[0].previous_content,'REPLY 1');assert.equal(r.data.revisions[0].content,'EDITED *action*');
assert.equal((await post('branchAtMessage',{...request,requestId:'stale-source'})).status,409);
console.log('PASS edits: exact original/revision history, stable retry, CAS, later replies preserved, summary content retained but invalidated/excluded, stale branch hash rejected.');
// Missing users, foreign owners, cross-session references, archived sources.
owner='test-bob';for(const action of ['editMessage','bookmarkMessage','messageHistory','branchAtMessage','rerollMessage'])assert.equal((await post(action,{...edit})).status,404,action);owner='test-alice';for(const action of ['editMessage','bookmarkMessage','messageHistory','branchAtMessage'])assert.equal((await post(action,{...edit,sessionId:branch})).status,404,action);
const balance=(await get()).data.balance;assert.equal((await post('rerollMessage',{sessionId:sid,messageId:first})).status,503);assert.equal((await get()).data.balance,balance);
console.log('PASS owner/session isolation and unavailable real reroll has no credit/message mutation.');
// A concurrent prefix edit prevents a captured old transcript being committed to a new branch.
snap=(await get('?session='+sid)).data;let once=false;beforeBatch=async qs=>{if(!once&&qs[0].text.startsWith('INSERT OR IGNORE INTO sessions')){once=true;sql.prepare('UPDATE messages SET revision=revision+1,content=? WHERE id=?').run('CONCURRENT EDIT',opening.id)}};
r=await post('branchAtMessage',{...request,requestId:'prefix-race',sourceHash:snap.sourceHash,revision:1});beforeBatch=null;assert.equal(r.status,409);snap=(await get('?session='+sid)).data;
once=false;beforeBatch=async qs=>{if(!once&&qs[0].text.startsWith('INSERT OR IGNORE INTO sessions')){once=true;sql.prepare('UPDATE messages SET revision=revision+1,content=? WHERE id=?').run('SECOND EDIT',opening.id)}};
r=await post('branchSession',{sessionId:sid,lastMessageId:last,sourceHash:snap.sourceHash,requestId:'current-prefix-race'});beforeBatch=null;assert.equal(r.status,409);
// Race on message edit is rejected without phantom history.
once=false;beforeBatch=async qs=>{if(!once&&qs[0].text.startsWith('UPDATE messages')){once=true;sql.prepare('UPDATE messages SET revision=revision+1,content=? WHERE id=?').run('OTHER WRITER',first)}};
r=await post('editMessage',{...edit,content:'Different revised text',revision:1,requestId:'edit-race'});beforeBatch=null;assert.equal(r.status,409);assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM message_revisions WHERE request_id=?').get('edit-race').n,0);
console.log('PASS atomic historical/current branch prefix-edit races and edit CAS race with no phantom revision.');
// Concurrent historical retries cannot merge a later source into the winner.
snap=(await get('?session='+sid)).data;const retryRequest={...request,requestId:'branch-race',sourceHash:snap.sourceHash,revision:2};
let release,reachedResolve;const paused=new Promise(x=>release=x),reached=new Promise(x=>reachedResolve=x);once=false;
afterQuery=async(q,args)=>{if(!once&&q==='SELECT id FROM sessions WHERE id=? AND owner=?'&&args[0]!==sid){once=true;reachedResolve();await paused}};
const pending=post('branchAtMessage',retryRequest);await reached;const winner=await post('branchAtMessage',retryRequest);assert.equal(winner.status,200);release();const other=await pending;afterQuery=null;assert.equal(other.status,200);assert.equal(other.data.id,winner.data.id);assert.equal((await get('?session='+winner.data.id)).data.messages.length,3);
await post('archiveSession',{id:sid});assert.equal((await post('messageHistory',{sessionId:sid,messageId:first})).status,404);assert.equal((await post('editMessage',{...edit,revision:2,requestId:'archived-edit'})).status,404);
console.log('PASS concurrent historical retry winner isolation and archived-session protection.');
})().catch(e=>{console.error(e);process.exitCode=1});
