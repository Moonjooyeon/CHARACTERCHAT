const fs = require('fs'), path = require('path'), ts = require('typescript'), assert = require('node:assert/strict');
const React = require('react'), { renderToStaticMarkup } = require('react-dom/server');
const root = path.resolve(__dirname, '..'), cache = {};
function load(file) {
  if (cache[file]) return cache[file].exports;
  const mod = { exports: {} }; cache[file] = mod;
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  new Function('require', 'module', 'exports', code)(name => name==='react' ? {...React,useState:v=>[typeof v==='function'?v():v,()=>{}],useEffect:()=>{}} : name.startsWith('.') ? load(path.resolve(path.dirname(file), name) + (fs.existsSync(path.resolve(path.dirname(file), name) + '.tsx') ? '.tsx' : '.ts')) : require(name), mod, mod.exports);
  return mod.exports;
}
const Featured = load(root + '/app/featured-work.tsx').default;
const data = load(root + '/app/lib/data.ts'); let opened;
const tree = Featured({ onOpen: work => opened = work });
function walk(node) { if (!node || typeof node !== 'object') return []; return [node, ...React.Children.toArray(node.props?.children).flatMap(walk)]; }
const nodes = walk(tree), button = nodes.find(node => node.type === 'button');
button.props.onClick();
const expected = data.sampleWorks.find(work => work.id === 'sample-female-quiet-bookbinder');
assert.equal(opened, expected); assert.ok(expected.characters.every(person => person.age >= 19));
const html = renderToStaticMarkup(React.createElement(Featured, { onOpen: () => {} }));
for (const value of [expected.title, data.workHook(expected), data.workAuthor(expected), expected.cover, '작품 보기', '19+', 'aria-roledescription="carousel"', 'loading="eager"']) assert.ok(html.includes(value), value);
assert.equal(nodes.filter(node => node.type === 'img').length, 1);
const app = fs.readFileSync(root + '/app/studio-app.tsx', 'utf8');
assert.ok(app.indexOf('<FeaturedWork onOpen={openDetail}/>') < app.indexOf('className="discovery-controls"'));
assert.ok(app.includes("workRating(launch.work)==='19+'&&!state.adultDeclared"));
const css = fs.readFileSync(root + '/app/globals.css', 'utf8'); require('postcss').parse(css);
const vars = Object.fromEntries([...css.matchAll(/--([\w-]+):\s*(#[\da-f]{6})\s*;/gi)].map(match => [match[1], match[2]]));
function luminance(hex) { const c = hex.slice(1).match(/../g).map(v => parseInt(v,16)/255).map(v => v <= .04045 ? v/12.92 : ((v+.055)/1.055)**2.4); return c[0]*.2126+c[1]*.7152+c[2]*.0722; }
function contrast(a,b) { const x=luminance(a),y=luminance(b); return (Math.max(x,y)+.05)/(Math.min(x,y)+.05); }
assert.ok(luminance(vars.bg) < .02); assert.ok(luminance(vars.paper) < .02);
for (const surface of [vars.bg, vars.paper, vars['accent-soft'], '#251f27', '#30232c']) {
  for (const name of ['ink', 'muted', 'faint', 'accent', 'action']) assert.ok(contrast(vars[name],surface) >= 4.5, `${name} on ${surface}`);
}
for (const [ink,surface] of [['#fff4f6','#431b27'],['#edb4c1','#431b27'],['#edd2da','#431b27'],['#edc4cf','#431b27'],['#421724','#f0dfe4'],['#ffffff',vars['accent-solid']],['#ffffff',vars['accent-hover']],['#bab0b5','#3b2832'],['#ffc1cc','#3c1d29']]) assert.ok(contrast(ink,surface) >= 4.5, `${ink} on ${surface}`);
assert.notEqual(vars.ink,vars.action); assert.ok(css.includes('font-style: italic')); assert.ok(css.includes('gap: 1lh'));
for (const old of ['#fffefa','#f7f6f2','#f4f2ed','#f1eee8','#eeebe4','#435f8e']) assert.ok(!css.includes(old), old);
for (const value of ['color-scheme: dark','var(--focus)','prefers-reduced-motion','.featured-art>img','.primary:disabled','.message-actions .reroll-unavailable']) assert.ok(css.includes(value),value);
console.log(`PASS featured-work render and CTA: same adult work, real cover/title/hook/byline, unchanged age gate. Dark surfaces and all foregrounds >=4.5:1; action on chat ${contrast(vars.action,vars.paper).toFixed(2)}:1, speech ${contrast(vars.ink,vars.paper).toFixed(2)}:1. Responsive source and focus/reduced-motion rules present. No browser-layout claim.`);

const order = load(root + '/app/lib/discovery-order.ts');
const neutral = [...data.sampleWorks].sort((a,b) => order.compareRecommendations(a,b,data.sampleWorks,new Map(),new Map()));
assert.equal(neutral.length,29); assert.equal(new Set(neutral.map(w=>w.id)).size,29);
const first = neutral.slice(0,10).map(w=>Number(w.cover.match(/character-(\d+)/)[1]));
const female = new Set([1,2,3,4,5,6,7,9,21,22,23,24,25,26]);
assert.equal(first.slice(0,5).filter(n=>female.has(n)).length,2);
assert.equal(first.filter(n=>female.has(n)).length,5);
assert.deepEqual(first,[28,26,8,2,29,9,16,21,11,1]);
const all=neutral.map(w=>Number(w.cover.match(/character-(\d+)/)[1]));
for (let i=1;i<all.length;i++) if(all[i]!==27&&all[i-1]!==27) assert.notEqual(female.has(all[i]),female.has(all[i-1]),'Characters alternate independently of audience');
assert.equal(neutral[5].characters[0].name,'한서인'); assert.ok(neutral[5].characters[0].role.includes('여성'));
const preferred=data.sampleWorks.find(w=>w.id==='sample-ruby');
const personalized=[...data.sampleWorks].sort((a,b)=>order.compareRecommendations(a,b,data.sampleWorks,new Map([[preferred.id,{turns:5}]]),new Map()));assert.equal(personalized[0].id,preferred.id);
assert.ok(app.includes("sort==='랭킹'?(activity.get(b.id)?.turns||0)-(activity.get(a.id)?.turns||0)||catalog.indexOf(a)-catalog.indexOf(b)"));
assert.ok(app.includes("sort==='신작'?((b.created||b.updated||'').localeCompare(a.created||a.updated||'')"));
console.log('PASS deterministic 29-work default shelf: male/female alternate, first row 3/2 and first two rows 5/5; expressive covers included at positions4 and8. Han Seoin is correctly female; taste scoring and honest rank/newest ordering stay intact.');
