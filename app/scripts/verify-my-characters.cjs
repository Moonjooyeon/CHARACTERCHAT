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
let r=await post('saveCharacter',{character:{name:'  서윤  ',age:25,role:'기록관',personality:'차분한 말투',portrait:data.covers[1]}});
assert.equal(r.status,200);const character=r.data.myCharacters[0];assert.equal(character.name,'서윤');assert.equal(character.age,25);
assert.equal((await get()).data.myCharacters.length,1);
for(const age of [18,25.5,null])assert.equal((await post('saveCharacter',{character:{name:'잘못된 인물',age}})).status,400);
assert.equal((await post('saveCharacter',{character:{name:' ',age:25}})).status,400);
assert.equal((await post('saveCharacter',{character:{name:'인물',age:25,portrait:'https://invalid.test/image'}})).status,400);
owner='test-bob';assert.deepEqual((await get()).data.myCharacters,[]);
assert.equal((await post('saveCharacter',{character:{...character,name:'다른 계정 변경'}})).status,403);
owner='test-alice';
const {id,...copy}=character;const work=data.blankWork();work.title='인물 재사용 작품';work.characters=[copy];
r=await post('saveWork',{work});assert.equal(r.status,200);assert.equal(r.data.work.characters[0].personality,character.personality);assert.equal(r.data.work.characters[0].portrait,character.portrait);assert.notEqual(r.data.work.characters[0].id,id);
const saved=r.data.work;saved.characters[0].name='작품 안의 이름';r=await post('saveWork',{work:saved});assert.equal(r.status,200);assert.equal((await get()).data.myCharacters[0].name,'서윤');
r=await post('saveCharacter',{character:{...character,name:'수정된 원본'}});assert.equal(r.status,200);assert.equal(r.data.myCharacters.length,1);assert.equal(r.data.works[0].characters[0].name,'작품 안의 이름');
console.log('PASS: character persistence, validation, owner isolation, import and independent edits');
})().catch(e=>{console.error(e);process.exit(1)});
