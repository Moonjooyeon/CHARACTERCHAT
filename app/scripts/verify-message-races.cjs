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
const w={...data.blankWork(),id:'review-work',title:'Review',rating:'all',secret:'FIXTURE',characters:[{name:'Adult',age:25,role:'friend',personality:'friendly'}],openings:[{title:'A',text:'opening',suggestions:[]}],cover:data.covers[1]};
let r=await post('saveWork',{work:w});assert.equal(r.status,200);r=await post('startChat',{workId:w.id});assert.equal(r.status,200);const sid=r.data.id;
const base=Date.now();sql.prepare('UPDATE messages SET created=? WHERE session_id=?').run(new Date(base).toISOString(),sid);
for(let n=1;n<=7;n++) {const id='turn-'+String(n).padStart(2,'0'); sql.prepare('INSERT INTO messages(id,owner,session_id,role,content,created) VALUES(?,?,?,?,?,?)').run(id,owner,sid,'user','USER '+n,new Date(base+n).toISOString());sql.prepare('INSERT INTO messages(id,owner,session_id,role,content,created) VALUES(?,?,?,?,?,?)').run(id+':reply',owner,sid,'assistant','ASSISTANT '+n,new Date(base+n+1).toISOString());}
const source=(await get('?session='+sid)).data;
r=await post('branchAtMessage',{sessionId:sid,messageId:'turn-06:reply',revision:0,sourceHash:source.sourceHash,confirmTranscriptOnly:true,requestId:'order-test'});assert.equal(r.status,200);
const copied=(await get('?session='+r.data.id)).data.messages;
const wanted=source.messages.slice(0,13).map(x=>x.content),actual=copied.map(x=>x.content);
assert.deepEqual(actual,wanted);console.log('BRANCH_ORDER',JSON.stringify({source:wanted,branch:actual,keptOrder:JSON.stringify(wanted)===JSON.stringify(actual)}));

// Valid concurrent turn timestamps can interleave source rows despite each user's reply being +1 ms.
const two=(await post('startChat',{workId:w.id})).data.id;sql.prepare('UPDATE messages SET created=? WHERE session_id=?').run(new Date(base).toISOString(),two);
for(const [id,t] of [['z',1],['a',2]]) {sql.prepare('INSERT INTO messages(id,owner,session_id,role,content,created) VALUES(?,?,?,?,?,?)').run(id,owner,two,'user','USER '+id,new Date(base+t).toISOString());sql.prepare('INSERT INTO messages(id,owner,session_id,role,content,created) VALUES(?,?,?,?,?,?)').run(id+':reply',owner,two,'assistant','ASSISTANT '+id,new Date(base+t+1).toISOString());}
const src2=(await get('?session='+two)).data;r=await post('branchSession',{sessionId:two,lastMessageId:'a:reply',sourceHash:src2.sourceHash,requestId:'interleave-order-test'});assert.equal(r.status,200);const dst2=(await get('?session='+r.data.id)).data;
assert.deepEqual(dst2.messages.map(x=>x.content),src2.messages.map(x=>x.content));console.log('INTERLEAVED_BRANCH_ORDER',JSON.stringify({source:src2.messages.map(x=>x.content),branch:dst2.messages.map(x=>x.content),keptOrder:JSON.stringify(src2.messages.map(x=>x.content))===JSON.stringify(dst2.messages.map(x=>x.content))}));


// A delayed append can commit older timestamps while the previously captured last ID is unchanged.
let insertedLate=false;beforeBatch=async qs=>{if(!insertedLate&&qs[0].text.startsWith('INSERT OR IGNORE INTO sessions')){insertedLate=true;for(const [id,role,t] of [['late','user',-2],['late:reply','assistant',-1]])sql.prepare('INSERT INTO messages(id,owner,session_id,role,content,created) VALUES(?,?,?,?,?,?)').run(id,owner,two,role,'DELAYED '+role,new Date(base+t).toISOString());}};
r=await post('branchSession',{sessionId:two,lastMessageId:'a:reply',sourceHash:src2.sourceHash,requestId:'late-append-test'});beforeBatch=null;
assert.equal(r.status,409);console.log('LATEST_BRANCH_DELAYED_APPEND',JSON.stringify({status:r.status,sourceRows:sql.prepare('SELECT COUNT(*) n FROM messages WHERE session_id=?').get(two).n,copiedRows:r.status===200?sql.prepare('SELECT COUNT(*) n FROM messages WHERE session_id=?').get(r.data.id).n:null}));

// A new manual summary started before an edit can commit afterwards and escape invalidation.
let once=false;afterQuery=async(q,args)=>{if(!once&&q==='SELECT COALESCE(MAX(to_turn),0) AS n FROM memory_summaries WHERE owner=? AND session_id=?'&&args[1]===sid){once=true;const edit=await post('editMessage',{sessionId:sid,messageId:'turn-01',revision:0,content:'EDITED USER 1',requestId:'summary-edit-race'});assert.equal(edit.status,200)}};
r=await post('createSummary',{sessionId:sid,content:'Summary prepared from old messages',requestId:'stale-summary'});afterQuery=null;
const context=await memory.compileProviderContext(owner,sid,w);assert.equal(r.status,409);assert.equal(context.readerContext.memoryBook.length,0);console.log('SUMMARY_EDIT_RACE',JSON.stringify({status:r.status,summaries:r.data.memory?.summaries.map(x=>({status:x.status,from:x.from_turn,to:x.to_turn})),providerMemory:context.readerContext.memoryBook}));
})().catch(e=>{console.error(e);process.exitCode=1});
