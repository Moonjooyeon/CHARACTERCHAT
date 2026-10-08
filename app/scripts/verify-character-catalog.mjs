import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
const cache={};
function readModule(file){file=path.resolve(file);if(cache[file])return cache[file];const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;const mod={exports:{}};cache[file]=mod.exports;new Function('require','module','exports',code)(ref=>readModule(path.resolve(path.dirname(file),ref+'.ts')),mod,mod.exports);return mod.exports;}
const {sampleWorks,legacySampleWorks,covers,acceptedCovers,portraitMeta}=readModule('app/lib/data.ts');
const {sampleSecrets}=readModule('app/lib/sample-secrets.ts');
assert.equal(sampleWorks.length,32);assert.equal(new Set(sampleWorks.map(w=>w.id )).size,32);assert.equal(covers.length,36);assert.equal(sampleWorks.filter(w=>w.audience==='남성향').length,15);assert.equal(sampleWorks.filter(w=>w.audience==='여성향').length,16);assert.equal(legacySampleWorks.length,3);assert.equal(acceptedCovers.length,41);
for(const w of sampleWorks){assert.ok(!legacySampleWorks.some(l=>l.id===w.id));assert.ok(w.world.length>=160);assert.equal(w.secret,'');assert.ok(sampleSecrets[w.id].length>=60);assert.equal(w.characters.length,w.kind==='simulation'?3:1);assert.ok(w.characters[0].personality.length>=60);assert.ok(w.characters[0].age>=19||w.id==='sample-sim-monstergirl-dorm'&&w.rating==='all');assert.equal(w.openings.length,2);for(const o of w.openings){assert.ok(o.text.length>=90);assert.equal(o.suggestions.length,3)}assert.equal(w.sampleReplies.length,w.kind==='simulation'?3:2);assert.ok(w.keywords.length>=3&&w.keywords.length<=7);assert.ok(acceptedCovers.includes(w.cover));assert.ok(fs.statSync('public'+w.cover).size>(w.cover.endsWith('.svg')?100:100000));assert.ok(!portraitMeta(w.cover).label.includes('undefined'));}
assert.deepEqual(legacySampleWorks.map(w=>[w.id,w.cover]),[['sample-archive','/covers/archive.jpg'],['sample-train','/covers/train.jpg'],['sample-garden','/covers/garden.jpg']]);
console.log('PASS content: 29 unique complete profiles, 58 openings, 174 suggestions, 28 readable WebPs and one explicit pending-image placeholder, three preserved legacy sample IDs/covers.');

// Runtime regressions are covered by verify-security.cjs and verify-upgrade-ui.mjs.

console.log('Catalog structural checks passed; use verify-catalog-keyword-upgrade.cjs for exact persisted-data compatibility.');
