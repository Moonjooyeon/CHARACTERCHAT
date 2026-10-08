import {db} from './db';
export const testPacks=[{id:'try',name:'가볍게 둘러보기',units:120},{id:'story',name:'이야기 이어가기',units:360},{id:'studio',name:'넉넉하게 체험하기',units:900}] as const;
export async function readTestWallet(owner:string){
 const result=await db().prepare('SELECT l.*,p.pack_id,p.units,p.acknowledged,p.created AS receipt_created FROM ledger l LEFT JOIN test_purchases p ON p.id=l.asset_id AND p.owner=l.owner WHERE l.owner=? ORDER BY l.created DESC,l.id DESC').bind(owner).all<any>();
 const ledger=result.results,receipts=ledger.filter(row=>row.pack_id).map(row=>({id:row.asset_id,pack_id:row.pack_id,units:row.units,acknowledged:row.acknowledged,created:row.receipt_created})),pendingReceipt=receipts.filter(row=>!row.acknowledged).at(-1)||null;
 return {balance:120+ledger.reduce((sum,row)=>sum+Number(row.delta),0),ledger,receipts,pendingReceipt,packs:testPacks,actualCharge:0,currency:'KRW',mode:'test-only'};
}
export async function testWalletAction(owner:string,b:any):Promise<Response|null>{
 if(!['testPurchase','acknowledgeTestReceipt'].includes(b.action))return null;
 const out=(d:any,status=200)=>Response.json(d,{status,headers:{'Cache-Control':'no-store'}}),fail=(error:string,status=400)=>out({error},status);
 if(b.action==='acknowledgeTestReceipt'){if(b.confirmRead!==true||typeof b.receiptId!=='string')return fail('테스트 완료 기록을 확인해 주세요.');const receipt=await db().prepare('SELECT id FROM test_purchases WHERE id=? AND owner=?').bind(b.receiptId,owner).first<any>();if(!receipt)return fail('테스트 기록을 찾을 수 없습니다.',404);await db().prepare('UPDATE test_purchases SET acknowledged=1 WHERE id=? AND owner=?').bind(b.receiptId,owner).run();return out(await readTestWallet(owner))}
 if(b.confirmTest!==true)return fail('실제 결제 없는 테스트 충전임을 확인해 주세요.');
 const pack=testPacks.find(p=>p.id===b.packId);if(!pack||typeof b.requestId!=='string'||!/^[A-Za-z0-9_-]{1,80}$/.test(b.requestId))return fail('테스트 묶음과 요청 정보를 확인해 주세요.');
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(owner+'|test-payment|'+b.requestId)),id='test-payment-'+Array.from(new Uint8Array(digest),v=>v.toString(16).padStart(2,'0')).join('');
 const prior=await db().prepare('SELECT id,pack_id,units,created FROM test_purchases WHERE id=? AND owner=?').bind(id,owner).first<any>();
 if(prior){if(prior.pack_id!==pack.id)return fail('이미 완료한 테스트 요청입니다. 새 묶음을 선택해 주세요.',409);return out({receipt:prior,...await readTestWallet(owner)})}
 const outstanding=await db().prepare('SELECT id,pack_id,units,created FROM test_purchases WHERE owner=? AND acknowledged=0 ORDER BY created,id LIMIT 1').bind(owner).first<any>();if(outstanding)return out({receipt:outstanding,recovered:true,...await readTestWallet(owner)});
 const date=new Date().toISOString();
 await db().batch([
  db().prepare('INSERT OR IGNORE INTO test_purchases(id,owner,request_id,pack_id,units,created) SELECT ?,?,?,?,?,? WHERE (SELECT COALESCE(SUM(units),0) FROM test_purchases WHERE owner=?)+?<=10000 AND NOT EXISTS(SELECT 1 FROM test_purchases WHERE owner=? AND acknowledged=0)').bind(id,owner,b.requestId,pack.id,pack.units,date,owner,pack.units,owner),
  db().prepare('INSERT OR IGNORE INTO ledger(id,owner,asset_id,delta,created) SELECT ?,?,?,?,? WHERE EXISTS(SELECT 1 FROM test_purchases WHERE id=? AND owner=? AND pack_id=? AND units=?)').bind(id+':credit',owner,id,pack.units,date,id,owner,pack.id,pack.units),
 ]);
 const receipt=await db().prepare('SELECT id,pack_id,units,created FROM test_purchases WHERE id=? AND owner=?').bind(id,owner).first<any>();
 if(!receipt){const recovered=await db().prepare('SELECT id,pack_id,units,created FROM test_purchases WHERE owner=? AND acknowledged=0 ORDER BY created,id LIMIT 1').bind(owner).first<any>();if(recovered)return out({receipt:recovered,recovered:true,...await readTestWallet(owner)});return fail('계정당 누적 테스트 충전 한도 10,000 잉크에 도달했어요. 기존 잉크와 기록은 그대로 유지됩니다.',409);}
 if(receipt.pack_id!==pack.id)return fail('다른 묶음으로 완료한 요청입니다. 내역을 확인해 주세요.',409);
 return out({receipt,...await readTestWallet(owner)});
}
