import {getChatGPTUser} from '../../../chatgpt-auth';
import {db} from '../../../lib/db';
import {bucket} from '../../../lib/collectibles';
export async function GET(req:Request,{params}:{params:Promise<{id:string}>}){
 const headers={'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'};
 try{const user=await getChatGPTUser();if(!user)return new Response('로그인이 필요합니다.',{status:401,headers});const {id}=await params;
 const row=await db().prepare('SELECT storage_key,mime FROM character_media WHERE id=? AND owner=?').bind(id,user.userId).first<any>();if(!row)return new Response('찾을 수 없습니다.',{status:404,headers});
 const file=await bucket().get(row.storage_key);if(!file)return new Response('찾을 수 없습니다.',{status:404,headers});
 return new Response(file.body,{headers:{...headers,'Content-Type':row.mime,'Content-Disposition':'inline','Accept-Ranges':'none'}});
 }catch{return new Response('미디어를 불러오지 못했습니다.',{status:503,headers});}
}
