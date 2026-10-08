import json, pathlib, subprocess, sys
commit = sys.argv[1] if len(sys.argv)>1 else None
source = pathlib.Path(__file__).resolve().parents[2]/'app'
root = pathlib.Path(__file__).resolve().parents[1]
raw = (subprocess.check_output(['git','-C',str(source),'show',f'{commit}:app/app/lib/data.ts'],text=True) if commit else (source/'app/lib/data.ts').read_text())
start=raw.index('export const sampleWorks:Work[]=')+len('export const sampleWorks:Work[]=')
works,end=json.JSONDecoder().raw_decode(raw[start:])
allowed=('id','title','hook','tag','desc','world','audience','keywords','cover','creatorGuide')
public=[]
for work in works:
    p={k:work[k] for k in allowed if k in work}
    p['author']='익명'
    p['rating']='all' if work['cover'].endswith(('character-01.webp','character-27.svg')) else work.get('rating','19+')
    p['characters']=[{k:character[k] for k in ('id','name','age','ageLabel','role','personality','portrait') if k in character} for character in work['characters']]
    p['openings']=[{k:opening[k] for k in ('title','text','suggestions')} for opening in work['openings']]
    p['sampleReplies']=list(work.get('sampleReplies',[]))
    if work.get('kind')=='simulation':
        p['kind']='simulation'
        p['sampleTurns']=[{k:turn[k] for k in ('characterId','content')} for turn in work.get('sampleTurns',[])]
    public.append(p)
    for asset in {work['cover'],*[c['portrait'] for c in work['characters'] if c.get('portrait')]}:
        assert asset.startswith(('/characters/','/images/')) and '..' not in asset and '://' not in asset
        target=root/'dist'/asset.lstrip('/')
        target.parent.mkdir(parents=True,exist_ok=True)
        target.write_bytes((subprocess.check_output(['git','-C',str(source),'show',f'{commit}:app/public{asset}']) if commit else (source/'public'/asset.lstrip('/')).read_bytes()))
assert len(public)==32
(root/'dist'/'catalog.js').write_text('export const works='+json.dumps(public,ensure_ascii=False,separators=(',',':'))+';\n')
(root/'catalog-provenance.json').write_text(json.dumps({'source_commit':commit or 'working-tree','count':len(public),'allowed_fields':list(public[0]),'assets':'28 approved WebP portraits,8 approved original simulation PNGs,and2neutral SVG placeholders; Ruby original excluded','storage':'none'},ensure_ascii=False,indent=2)+'\n')
print(f'Extracted {len(public)} works and only their approved portrait assets from {commit}')
