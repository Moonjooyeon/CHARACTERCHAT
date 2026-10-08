import {getChatGPTUser} from '../../chatgpt-auth';
import {db} from '../../lib/db';
import {paymentConfig,sha256} from '../../lib/payment-config';
const out=(value:unknown,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'no-store'}});
export async function GET(req:Request){const user=await getChatGPTUser();if(!user)return out({error:'로그인이 필요합니다.'},401);const config=paymentConfig();const id=new URL(req.url).searchParams.get('order');if(id){const order=await db().prepare('SELECT id,pack_id,units,amount,mode,status,created FROM payment_orders WHERE id=? AND owner=?').bind(id,user.userId).first();return order?out({order}):out({error:'주문을 찾을 수 없습니다.'},404)}const orders=await db().prepare('SELECT id,pack_id,units,amount,mode,status,created FROM payment_orders WHERE owner=? ORDER BY created DESC LIMIT 30').bind(user.userId).all();return out({ready:config.ready,mode:config.mode,packs:config.packs,orders:orders.results})}
export async function POST(req:Request){try{
 const user=await getChatGPTUser();if(!user)return out({error:'로그인이 필요합니다.'},401);
 if(req.headers.get('origin')!==new URL(req.url).origin)return out({error:'요청 출처를 확인해 주세요.'},403);
 const c=paymentConfig();if(!c.ready||new URL(req.url).origin!==c.origin)return out({error:'결제 준비 중입니다. 가맹점 설정과 판매 가격 등록 후 이용할 수 있어요.'},503);
 const b:any=await req.json(),pack=c.packs.find(p=>p.id===b.packId);
 if(!pack||b.confirm!==true||typeof b.requestId!=='string'||!/^[a-zA-Z0-9-]{16,80}$/.test(b.requestId))return out({error:'상품과 결제 동의를 확인해 주세요.'},400);
 if(typeof b.name!=='string'||!b.name.trim()||b.name.length>30||typeof b.phone!=='string'||!/^[-0-9]{8,20}$/.test(b.phone)||typeof b.email!=='string'||! /^[a-zA-Z0-9._+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(b.email)||b.email.length>60)return out({error:'구매자 이름, 휴대폰, 이메일을 확인해 주세요.'},400);
 const id=crypto.randomUUID(),token=crypto.randomUUID(),now=new Date().toISOString();
 await db().prepare('INSERT OR IGNORE INTO payment_orders(id,owner,request_id,pack_id,units,amount,mode,mid,token,created,updated) VALUES(?,?,?,?,?,?,?,?,?,?,?)').bind(id,user.userId,b.requestId,pack.id,pack.units,pack.price,c.mode,c.mid,token,now,now).run();
 const order=await db().prepare('SELECT * FROM payment_orders WHERE owner=? AND request_id=?').bind(user.userId,b.requestId).first<any>();
 if(!order||order.status!=='pending'||order.pack_id!==pack.id||order.amount!==pack.price||order.mode!==c.mode||order.mid!==c.mid||Date.now()-Date.parse(order.created)>15*60*1000)return out({error:'주문이 변경되었거나 만료됐습니다. 결제 내역을 확인한 뒤 새로 시작해 주세요.'},409);
 const timestamp=String(Date.now()),price=String(order.amount),base=`oid=${order.id}&price=${price}`;
 return out({orderId:order.id,fields:{version:'1.0',gopaymethod:'Card',mid:c.mid,oid:order.id,price,timestamp,use_chkfake:'Y',signature:await sha256(`${base}&timestamp=${timestamp}`),verification:await sha256(`${base}&signKey=${c.signKey}&timestamp=${timestamp}`),mKey:await sha256(c.signKey),currency:'WON',goodname:pack.name,buyername:b.name.trim(),buyertel:b.phone,buyeremail:b.email,returnUrl:`${c.origin}/api/payments/return?order=${order.id}&token=${order.token}`,closeUrl:`${c.origin}/api/payments/close`,acceptmethod:'centerCd(Y)',charset:'UTF-8',payViewType:'overlay'}});
 }catch{return out({error:'결제 요청을 준비하지 못했습니다. 잠시 후 다시 시도해 주세요.'},500)}}
