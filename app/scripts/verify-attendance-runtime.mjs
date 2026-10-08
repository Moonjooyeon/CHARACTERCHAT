import assert from 'node:assert/strict';
const base=process.env.QA_BASE||'http://127.0.0.1:5196';
assert.ok(['127.0.0.1','localhost'].includes(new URL(base).hostname),'Only isolated local databases are allowed');
const owner='attendance-qa-'+crypto.randomUUID();
async function call(user,action){const headers={'Content-Type':'application/json',Origin:base};if(user){headers['oai-authenticated-user-id']=user;headers['oai-authenticated-user-email']=user+'@example.test'}const r=await fetch(base+'/api/app'+(action?'':'?attendance=1'),{method:action?'POST':'GET',headers,body:action?JSON.stringify({action,grapes:99999,owner:'forged',day:'2100-01-01'}):undefined});return {status:r.status,data:await r.json()}}
assert.equal((await call(null)).status,401);assert.equal((await call(null,'claimAttendance')).status,401);
assert.equal((await call(owner)).data.grapes,0);
const attempts=await Promise.all(Array.from({length:12},()=>call(owner,'claimAttendance')));
assert(attempts.every(r=>r.status===200&&r.data.grapes===10&&r.data.count===1&&r.data.claimed));
assert.equal((await call(owner,'claimAttendance')).data.grapes,10);
assert.equal((await call(owner+'-other')).data.grapes,0);
assert.equal((await call(owner)).data.day,new Date(Date.now()+9*3600000).toISOString().slice(0,10));
console.log('PASS actual local Worker/D1 attendance: authentication, 12 concurrent requests award once, replay, server date/reward, account isolation');
