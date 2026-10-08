export type DialoguePart={text:string;action:boolean};
// Matched single asterisks mark actions. Unmatched and escaped stars stay literal.
export function parseDialogue(text:string):DialoguePart[]{
 const result:DialoguePart[]=[];let plain='';
 for(let i=0;i<text.length;){
  if(text[i]==='\\'&&text[i+1]==='*'){plain+='*';i+=2;continue;}
  if(text[i]==='*'&&text[i+1]!=='*'&&text[i-1]!=='*'){
   let end=i+1;while(end<text.length){if(text[end]==='*'&&text[end-1]!=='\\'&&text[end-1]!=='*'&&text[end+1]!=='*')break;end++;}
   if(end<text.length&&end>i+1){if(plain){result.push({text:plain,action:false});plain='';}result.push({text:text.slice(i+1,end).replace(/\\\\\*/g,'*'),action:true});i=end+1;continue;}
  }
  plain+=text[i++];
 }
 if(plain)result.push({text:plain,action:false});return result;
}

// Each marked action and spoken segment gets its own prose block. Boundary
// newlines are represented by the layout gap once, while paragraphs inside a
// segment and meaningful spaces (including before a closing *) stay intact.
export function dialogueBlocks(text:string):DialoguePart[]{
 const parts=parseDialogue(text);
 if(parts.length<2)return parts;
 const blocks=parts.filter(part=>part.text.trim().length>0);
 return blocks.map((part,index)=>{
  let content=part.text;
  if(index>0)content=content.replace(/^[\t ]*(?:\r?\n[\t ]*)+/,'');
  if(index<blocks.length-1)content=content.replace(/(?:[\t ]*\r?\n)+[\t ]*$/,'');
  return {...part,text:content};
 });
}

export function dialoguePreview(text:string){return parseDialogue(text).map(part=>part.text).join(' ').replace(/\s+/g,' ').trim();}

// Put the visible prose blocks into a plain-text editor without losing actions.
// Literal stars in spoken text stay literal after an intentional edit/save.
export function editableDialogue(text:string){const parts=dialogueBlocks(text);if(!parts.some(p=>p.action))return text;return parts.map(p=>p.action?'*'+p.text+'*':p.text.replace(/\*/g,'\\*')).join('\n\n');}
