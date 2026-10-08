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
function load(file){file=path.resolve(file);if(!fs.existsSync(file)&&fs.existsSync(file+'x'))file+='x';if(cache[file])return cache[file].exports;const module={exports:{}};cache[file]=module;const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;const req=name=>{if(name==='react'&&(file.endsWith('/status-panel.tsx')||file.endsWith('/memory-panel.tsx')||file.endsWith('/tracker-picker.tsx')||file.endsWith('/chat-art.tsx')))return fakeReact;if(name==='cloudflare:workers')return {env};if(name.endsWith('chatgpt-auth'))return {getChatGPTUser:async()=>owner?{userId:owner,email:owner+'@example.test'}:null};if(name.startsWith('.'))return load(path.resolve(path.dirname(file),name)+'.ts');return require(require.resolve(name,{paths:[root]}))};vm.runInThisContext('(function(require,module,exports){'+code+'\n})',{filename:file})(req,module,module.exports);return module.exports;}
const api=load(root+'/app/api/app/route.ts'),media=load(root+'/app/api/media/[id]/route.ts'),memory=load(root+'/app/lib/memory.ts'),data=load(root+'/app/lib/data.ts');
const req=(suffix='',body)=>new Request('https://test.example/api/app'+suffix,body?{method:'POST',headers:{'Content-Type':'application/json','Origin':'https://test.example'},body:JSON.stringify(body)}:{});
async function post(action,body={}){const r=await api.POST(req('',{action,...body}));return {status:r.status,data:await r.json()}}
async function get(q=''){const r=await api.GET(req(q));return {status:r.status,data:await r.json()}}
async function image(id,query=''){const r=await media.GET(new Request('https://test.example/api/media/'+encodeURIComponent(id)+query),{params:Promise.resolve({id})});return r}


(async()=>{
let r=await post('startChat',{workId:'sample-sori'});assert.equal(r.status,200);const sid=r.data.id;
assert.equal((await get('?characters=1')).data.characters.length,0);
await post('message',{sessionId:sid,content:'같이 조사하자',requestId:'collect-one'});
let chars=(await get('?characters=1')).data.characters;assert.equal(chars.length,1);assert.equal(chars[0].name,'한소리');
await post('message',{sessionId:sid,content:'같이 조사하자',requestId:'collect-one'});assert.equal((await get('?characters=1')).data.characters.length,1);
r=await post('editCollectedCharacter',{key:chars[0].character_key,revision:0,name:'나의 탐정 친구',note:'함께 적은 기록',favorite:true,hidden:true});assert.equal(r.status,200);assert.equal(r.data.characters[0].hidden,1);assert.equal(r.data.characters[0].note,'함께 적은 기록');
assert.equal((await post('editCollectedCharacter',{key:chars[0].character_key,revision:0,name:'stale'})).status,409);
assert.equal((await get('?characters=1')).data.characters[0].name,'나의 탐정 친구');
assert.equal((await post('saveModelPreference',{sessionId:sid,choice:'Claude Opus'})).status,200);assert.equal((await get('?modelPreference='+sid)).data.choice,'Claude Opus');assert.equal((await post('saveModelPreference',{sessionId:sid,choice:'invented'})).status,400);
owner='test-bob';assert.equal((await get('?characters=1')).data.characters.length,0);assert.equal((await post('editCollectedCharacter',{key:chars[0].character_key,revision:1,name:'hijack'})).status,409);assert.equal((await get('?modelPreference='+sid)).status,404);owner='test-alice';
r=await post('startChat',{workId:'sample-sim-monstergirl-dorm'});assert.equal(r.status,200);const sim=r.data.id;await post('message',{sessionId:sim,content:'안녕',requestId:'sim-first'});chars=(await get('?characters=1')).data.characters;assert.equal(chars.filter(c=>c.character_key.startsWith('sample-sim-')).length,1);await post('message',{sessionId:sim,content:'다른 친구도 만나고 싶어',requestId:'sim-second'});chars=(await get('?characters=1')).data.characters;assert.equal(chars.filter(c=>c.character_key.startsWith('sample-sim-')).length,2);
for(const w of data.sampleWorks){assert.equal(w.creatorGuide.settings.length,3);assert.equal(w.creatorGuide.models.length,2)}
console.log('PASS character collection: no view-only award, spoken cast only, dedup, private edits, hide persistence, stale edit rejection, account isolation; model preference allowlist and session ownership; all 32 creator guides.');
})().catch(e=>{console.error(e);process.exitCode=1});
