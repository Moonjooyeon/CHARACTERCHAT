import {env} from 'cloudflare:workers';
export function paymentConfig(){
 const e=env as unknown as Record<string,string|undefined>;
 const mode=e.KG_PAYMENT_MODE==='live'?'live':'test';
 const mid=e.KG_MID||'',signKey=e.KG_SIGN_KEY||'',origin=e.PAYMENT_ORIGIN||'';
 let packs:{id:string;name:string;units:number;price:number}[]=[];
 try{const input=JSON.parse(e.KG_PACKS_JSON||'[]');if(Array.isArray(input))packs=input.filter(p=>/^[a-z0-9_-]{1,40}$/.test(p.id)&&typeof p.name==='string'&&p.name.length<=40&&Number.isSafeInteger(p.units)&&p.units>0&&p.units<=100000&&Number.isSafeInteger(p.price)&&p.price>=100&&p.price<=1000000);if(new Set(packs.map(p=>p.id)).size!==packs.length)packs=[]}catch{}
 const ready=e.KG_ENABLED==='true'&&/^[a-zA-Z0-9]{10}$/.test(mid)&&!!signKey&&/^https:\/\/[^/?#]+$/.test(origin)&&packs.length>0&&(mode==='test'?mid==='INIpayTest':mid!=='INIpayTest'&&e.KG_LIVE_CONFIRMED==='true');
 return {ready,mode,mid,signKey,origin,packs};
}
export async function sha256(value:string){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),v=>v.toString(16).padStart(2,'0')).join('')}
export function approvalURL(raw:string,kind:'approve'|'cancel'){
 const u=new URL(raw);const hosts=['fcstdpay.inicis.com','ksstdpay.inicis.com','stgstdpay.inicis.com'];
 if(u.protocol!=='https:'||u.port||u.username||u.password||!hosts.includes(u.hostname)||u.search||u.hash||u.pathname!==(kind==='approve'?'/api/payAuth':'/api/netCancel'))throw Error('결제 승인 주소를 확인할 수 없습니다.');return u.href;
}
