import json,pathlib,subprocess,sys
commit=sys.argv[1] if len(sys.argv)>1 else None
source=pathlib.Path(__file__).resolve().parents[2]/'app'
root=pathlib.Path(__file__).resolve().parents[1]
raw=(subprocess.check_output(['git','-C',str(source),'show',f'{commit}:app/app/lib/portrait-variants.ts'],text=True) if commit else (source/'app/lib/portrait-variants.ts').read_text())
manifest,_=json.JSONDecoder().raw_decode(raw.split('export const portraitVariants = ',1)[1])
public={}
count=0
for src,item in manifest.items():
 assert src.startswith('/characters/character-') and src.endswith('.webp')
 public[src]={'width':item['width'],'height':item['height'],'variants':[]}
 for variant in item['variants']:
  path=variant['src'];assert path.startswith('/characters/responsive/') and path.endswith('.webp')
  destination=root/'dist'/path.lstrip('/');destination.parent.mkdir(parents=True,exist_ok=True)
  data=(subprocess.check_output(['git','-C',str(source),'show',f'{commit}:app/public{path}']) if commit else (source/'public'/path.lstrip('/')).read_bytes())
  assert len(data)==variant['bytes'];destination.write_bytes(data)
  public[src]['variants'].append({k:variant[k] for k in ('src','width')});count+=1
assert len(public)==28 and count==106
(root/'dist/portraits.js').write_text('export const portraits='+json.dumps(public,ensure_ascii=False,separators=(',',':'))+';\n')
(root/'portrait-provenance.json').write_text(json.dumps({'source_commit':commit or 'working-tree','originals':28,'derivatives':count,'content':'Approved original artworks proportionally resized; no repaint or crop'},indent=2)+'\n')
print('Copied 106 approved proportional image derivatives with original fallbacks')
