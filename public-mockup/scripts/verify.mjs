import assert from 'node:assert/strict';
import {readFileSync,readdirSync,existsSync,statSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {works} from '../dist/catalog.js';
import {portraits as variants} from '../dist/portraits.js';
const file=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const root=new URL('..',import.meta.url);
const walk=p=>readdirSync(p).flatMap(n=>statSync(new URL(n,p)).isDirectory()?walk(new URL(n+'/',p)):[new URL(n,p)]);
const inventory=walk(new URL('dist/',root));
const keys=['id','title','hook','tag','desc','world','audience','keywords','cover','author','rating','characters','openings','sampleReplies','creatorGuide'].sort();
assert.equal(works.length,32);assert.equal(new Set(works.map(w=>w.id)).size,32);
let portraits=0,placeholders=0;
for(const work of works){const expected=work.kind==='simulation'?[...keys,'kind','sampleTurns'].sort():keys;assert.deepEqual(Object.keys(work).sort(),expected);assert.equal(work.author,'익명');assert.match(work.cover,/^\/(characters|images)\/[a-zA-Z0-9_./-]+\.(webp|svg|png)$/);assert(existsSync(new URL('dist'+work.cover,root)));if(work.cover.startsWith('/characters/'))work.cover.endsWith('.svg')?placeholders++:portraits++;for(const c of work.characters){assert.deepEqual(Object.keys(c).filter(k=>!['id','ageLabel','portrait'].includes(k)).sort(),['name','age','role','personality'].sort());assert(c.age>=19||work.id==='sample-sim-monstergirl-dorm'&&work.rating==='all'&&c.age===null);if(c.portrait)assert(existsSync(new URL('dist'+c.portrait,root)))}for(const o of work.openings)assert.deepEqual(Object.keys(o).sort(),['title','text','suggestions'].sort());if(work.kind==='simulation'){assert.equal(work.characters.length,3);for(const t of work.sampleTurns){assert.deepEqual(Object.keys(t).sort(),['characterId','content']);assert(work.characters.some(c=>c.id===t.characterId))}}}
assert.equal(portraits,28);assert.equal(placeholders,1);
assert.equal(Object.keys(variants).length,28);assert.equal(Object.values(variants).flatMap(x=>x.variants).length,106);for(const [src,item] of Object.entries(variants)){assert(works.some(w=>w.cover===src));for(const v of item.variants){assert.match(v.src,/^\/characters\/responsive\/character-\d\d-(96|320|640|960)\.webp$/);assert(existsSync(new URL('dist'+v.src,root)));assert(v.width<item.width)}}
assert.equal(inventory.length,154);
for(const url of inventory){assert(!/\.(env|map|db|sqlite|sql|ts|tsx)$/.test(url.pathname));if(/\.(html|js|css|txt|svg)$/.test(url.pathname)){const source=readFileSync(url,'utf8');assert(!/(onseo-story-studio|appgprj_6ac5b0|\/api\/app|\/api\/media|sample-secrets|refinement-secrets|secret\s*[=:]|responseRules\s*[=:]|[\w.+-]+@[\w.-]+\.[a-z]+)/i.test(source),url.pathname)}}
assert.equal(works.filter(w=>w.kind==='simulation').length,3);assert.equal(works.find(w=>w.id==='sample-sim-monstergirl-dorm').characters.find(c=>c.id==='ruby-06').portrait,'/images/simulations/ruby-portrait-pending.svg');
assert.equal(file('dist/discovery-design.css'),readFileSync(new URL('../../app/app/discovery-design.css',import.meta.url),'utf8'));
const app=file('dist/app.js'),catalog=file('dist/catalog.js'),css=file('dist/styles.css'),html=file('dist/index.html');
for(const source of [app,catalog,css,file('dist/discovery-design.css'),file('dist/portraits.js'),file('dist/viewport.js'),file('dist/viewport.css')]){assert(!/\b(fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon|sessionStorage|indexedDB)\s*[.(]/.test(source));assert(!/document\.cookie/.test(source));assert(!/https?:\/\//.test(source))}
assert(!/@import|url\(/.test(css));assert.match(css,/inset:9px 9px auto auto;width:max-content;height:auto/);assert.match(html,/noindex,nofollow/);assert.match(html,/connect-src 'none'/);assert.match(app,/샘플 대화 · AI가 생성한 답변이 아니에요/);assert.match(app,/실제 청구 ₩0/);assert.match(app,/disabled aria-label="스냅샷 생성 · 준비 중"/);
const manifest=JSON.parse(file('.openai/hosting.json'));assert.deepEqual(Object.keys(manifest).sort(),['static']);assert.equal(manifest.static.directory,'dist');
execFileSync(process.execPath,['--check',new URL('../dist/app.js',import.meta.url).pathname]);execFileSync(process.execPath,['--check',new URL('../dist/catalog.js',import.meta.url).pathname]);
for(const name of ['portraits.js','viewport.js'])execFileSync(process.execPath,['--check',new URL('../dist/'+name,import.meta.url).pathname]);
assert.match(file('dist/__viewport.html'),/connect-src 'none'/);assert.match(file('dist/__viewport.html'),/noindex,nofollow/);
console.log(JSON.stringify({checks:'PASS',catalog:works.length,portraits,placeholders,public_files:inventory.length,network_clients:0,bindings:0,storage:'browser-local preview records and display preferences',project_id:manifest.project_id},null,2));

assert(app.includes("const contentKey='onseo.preview.v1'"));assert(app.includes("JSON.stringify({font:state.font,art:state.art})"));
