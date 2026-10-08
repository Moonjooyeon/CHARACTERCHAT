import {getChatGPTUser} from '../../chatgpt-auth';
import {db} from '../../lib/db';
import {bucket} from '../../lib/collectibles';
import {imageMime,mp4Duration,IMAGE_LIMIT,VIDEO_LIMIT} from '../../lib/character-media';
export async function POST(req:Request){
 const user=await getChatGPTUser();if(!user)return Response.json({error:'로그인이 필요합니다.'},{status:401});
 if(req.headers.get('origin')&&req.headers.get('origin')!==new URL(req.url).origin)return Response.json({error:'요청 출처를 확인할 수 없습니다.'},{status:403});
 try{if(Number(req.headers.get('content-length'))>VIDEO_LIMIT+1024*1024)throw Error('영상은 20 MB, 이미지는 5 MB 이내로 선택해 주세요.');
 const reader=req.body?.getReader();if(!reader)throw Error('파일을 선택해 주세요.');const chunks:Uint8Array[]=[];let size=0;while(true){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>VIDEO_LIMIT+1024*1024){await reader.cancel();throw Error('업로드 파일 크기를 확인해 주세요.');}chunks.push(value);}const body=new Blob(chunks as BlobPart[],{type:req.headers.get('content-type')||''});const form=await new Response(body,{headers:{'Content-Type':req.headers.get('content-type')||''}}).formData(),file=form.get('file');if(!(file instanceof File)||!file.size||file.size>VIDEO_LIMIT)throw Error('영상은 20 MB, 이미지는 5 MB 이내로 선택해 주세요.');
 const bytes=new Uint8Array(await file.arrayBuffer()),image=imageMime(bytes);let mime=image,duration:number|null=null;if(image){if(bytes.length>IMAGE_LIMIT)throw Error('이미지는 5 MB 이내로 선택해 주세요.');}else{duration=mp4Duration(bytes);mime='video/mp4';}
 const id=crypto.randomUUID(),key='character-media/'+id;await bucket().put(key,bytes,{httpMetadata:{contentType:mime!}});
 try{await db().prepare('INSERT INTO character_media(id,owner,storage_key,mime,duration,created) VALUES(?,?,?,?,?,?)').bind(id,user.userId,key,mime,duration===null?null:Math.ceil(duration*1000),new Date().toISOString()).run();}catch(e){await bucket().delete(key);throw e;}
 return Response.json({media:{url:'/api/character-media/'+id,type:image?'image':'video',...(duration!==null?{duration}:{})}},{headers:{'Cache-Control':'no-store'}});
 }catch(e){return Response.json({error:e instanceof Error?e.message:'업로드하지 못했습니다.'},{status:400});}
}
