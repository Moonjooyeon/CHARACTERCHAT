import {db} from '../../../lib/db';
import {paymentConfig,approvalURL,sha256} from '../../../lib/payment-config';
function result(message:string){return new Response(`<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>결제 결과</title><body><h1>${message}</h1><p>결제 내역에서 최종 처리 상태를 확인해 주세요.</p><a href="/" target="_top">온서로 돌아가기</a></body></html>`,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'none'; frame-ancestors 'self'"}})}
export async function POST(req:Request){
 let order:any,body:URLSearchParams|undefined,cancelURL='';
 try{
 const c=paymentConfig(),url=new URL(req.url);if(!c.ready)return result('결제 설정을 확인해 주세요.');
 order=await db().prepare('SELECT * FROM payment_orders WHERE id=? AND token=?').bind(url.searchParams.get('order'),url.searchParams.get('token')).first<any>();
 if(!order||order.mid!==c.mid||order.mode!==c.mode)return result('주문을 확인할 수 없습니다.');
 if(order.status!=='pending')return result(order.status==='paid'?'이미 완료된 결제입니다.':'결제 처리 상태를 확인해 주세요.');
 const form=await req.formData(),get=(key:string)=>String(form.get(key)||'');
 if(get('resultCode')!=='0000')return result('결제가 취소되었거나 인증되지 않았습니다.');
 if(get('mid')!==order.mid||get('orderNumber')!==order.id||!get('authToken')||get('authToken').length>4096||Date.now()-Date.parse(order.created)>15*60*1000)return result('결제 인증 정보가 일치하지 않습니다.');
 const authURL=approvalURL(get('authUrl'),'approve');cancelURL=approvalURL(get('netCancelUrl'),'cancel');
 if(!['fc','ks','stg'].includes(get('idc_name'))||new URL(authURL).hostname!==get('idc_name')+'stdpay.inicis.com'||new URL(cancelURL).hostname!==new URL(authURL).hostname)return result('결제 서버 정보가 일치하지 않습니다.');
 const timestamp=String(Date.now()),authToken=get('authToken');body=new URLSearchParams({mid:c.mid,authToken,timestamp,signature:await sha256(`authToken=${authToken}&timestamp=${timestamp}`),verification:await sha256(`authToken=${authToken}&signKey=${c.signKey}&timestamp=${timestamp}`),charset:'UTF-8',format:'JSON',price:String(order.amount)});
 const lock=await db().prepare("UPDATE payment_orders SET status='processing',updated=? WHERE id=? AND status='pending'").bind(new Date().toISOString(),order.id).run();if(!lock.meta.changes)return result('이미 처리 중인 결제입니다.');
 const response=await fetch(authURL,{method:'POST',body,redirect:'error',signal:AbortSignal.timeout(15000)});if(!response.ok)throw Error('approval transport');const approved:any=await response.json();
 if(approved.resultCode!=='0000'){await db().prepare("UPDATE payment_orders SET status='failed',updated=? WHERE id=? AND status='processing'").bind(new Date().toISOString(),order.id).run();return result('결제가 승인되지 않았습니다.');}
 if(approved.mid!==order.mid||approved.MOID!==order.id||String(approved.TotPrice)!==String(order.amount)||typeof approved.tid!=='string'||!approved.tid||approved.tid.length>100)throw Error('approval mismatch');
 const now=new Date().toISOString();await db().batch([
 db().prepare("UPDATE payment_orders SET status='paid',tid=?,updated=? WHERE id=? AND status='processing'").bind(approved.tid,now,order.id),
 db().prepare("INSERT INTO ledger(id,owner,asset_id,delta,created) SELECT ?,owner,id,units,? FROM payment_orders WHERE id=? AND status='paid' AND mode='live'").bind('kg:'+order.id,now,order.id)
 ]);
 return result(order.mode==='live'?'결제가 완료되고 잉크가 지급되었습니다.':'KG 테스트 승인이 완료되었습니다. 실제 잉크는 지급되지 않습니다.');
 }catch{
 if(order&&body&&cancelURL){let cancelled=false;try{const r=await fetch(cancelURL,{method:'POST',body,redirect:'error',signal:AbortSignal.timeout(15000)});const j:any=await r.json();cancelled=r.ok&&j.resultCode==='0000'}catch{}try{await db().prepare("UPDATE payment_orders SET status=?,updated=? WHERE id=? AND status='processing'").bind(cancelled?'cancelled':'review',new Date().toISOString(),order.id).run()}catch{}}
 return result('결제 결과를 확인 중입니다. 다시 결제하지 말고 내역을 확인해 주세요.');
 }
}
