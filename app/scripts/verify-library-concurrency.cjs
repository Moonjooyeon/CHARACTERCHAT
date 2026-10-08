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
const fields=[{key:'place',label:'Place',enabled:true,value:'LIVE_SECRET',persona:'PERSONA_SECRET',manual:'MEMORY_SECRET',unknown:'UNKNOWN_SECRET'}];
let r=await post('savePersona',{id:'p0',name:'First',content:'Old persona'});assert.equal(r.status,200);
for(let i=1;i<100;i++)sql.prepare('INSERT INTO personas(id,owner,name,content,created,updated) VALUES(?,?,?,?,?,?)').run('p'+i,owner,'Seed','seed','date','date');
r=await post('savePersona',{id:'p0',name:'Edit',content:'New persona',revision:0});console.log('PERSONA_EDIT_AT_LIMIT',{status:r.status});assert.equal(r.status,200);
r=await post('archivePersona',{id:'p1',revision:0});assert.equal(r.status,200);
r=await post('savePersona',{id:'p0',name:'Edit',content:'New persona',revision:1});assert.equal(r.status,200);console.log('ARCHIVED_QUOTA_EDIT_FIXED',r.status);
owner='template-user';r=await post('saveTemplate',{id:'t0',name:'First',fields});assert.equal(r.status,200);
for(let i=1;i<100;i++)sql.prepare('INSERT INTO status_templates(id,owner,name,fields,created,updated) VALUES(?,?,?,?,?,?)').run('t'+i,owner,'Seed','[]','date','date');
r=await post('saveTemplate',{id:'t0',name:'Edit',fields,revision:0});console.log('TEMPLATE_EDIT_AT_LIMIT',{status:r.status});assert.equal(r.status,200);
// A stale concurrent work save must not mutate the winner's asset rating.
owner='work-user';const w={...data.blankWork(),id:'review-work',title:'Original',rating:'all',secret:'PRIVATE',characters:[{name:'Adult',age:25,role:'friend',personality:'friendly'}],openings:[{title:'A',text:'opening',suggestions:[]}],cover:data.covers[1]};
r=await post('saveWork',{work:w});assert.equal(r.status,200);const saved=r.data.work;
sql.prepare('INSERT INTO collectible_assets(id,owner,work_id,character_id,character_name,title,condition,storage_key,mime,rating,created,updated) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)').run('asset',owner,saved.id,saved.characters[0].id,'Adult','Asset','{}','mock','image/png','all','date','date');
let release,reachedResolve;const pause=new Promise(x=>release=x),reached=new Promise(x=>reachedResolve=x);let once=false;
afterQuery=async(q,args)=>{if(!once&&q==='SELECT owner,data,revision FROM works WHERE id=?'&&args[0]===saved.id){once=true;reachedResolve();await pause;}};
const stale=post('saveWork',{work:{...saved,title:'Losing draft',rating:'all'}});await reached;const winning=await post('saveWork',{work:{...saved,title:'Winning draft',rating:'19+'}});assert.equal(winning.status,200);release();const staleResult=await stale;afterQuery=null;
console.log('STALE_WORK_SAVE_SIDE_EFFECT',JSON.stringify({staleStatus:staleResult.status,workRating:JSON.parse(sql.prepare('SELECT data FROM works WHERE id=?').get(saved.id).data).rating,assetRating:sql.prepare('SELECT rating FROM collectible_assets WHERE id=?').get('asset').rating}));
assert.equal(staleResult.status,409);assert.equal(sql.prepare('SELECT rating FROM collectible_assets WHERE id=?').get('asset').rating,'19+');
console.log('DONE targeted reproductions in isolated SQLite with mocked auth/storage/provider.');
})().catch(e=>{console.error(e);process.exitCode=1});
