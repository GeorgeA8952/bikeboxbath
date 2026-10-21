import test from 'node:test';
import assert from 'node:assert/strict';
import {createApi} from '../api/server.mjs';
import {hashPassword,sessionCookie} from '../api/security.mjs';
import {todayLondon,addDays} from '../dist/domain.js';
test('protected rental API checks authentication, CSRF, origin, quotes and logout',async()=>{
 const password='nonproduction-test-only-password',origin='http://127.0.0.1:4173',hash=await hashPassword(password),app=createApi({dataPath:':memory:',origin,adminUser:'test-admin',passwordHash:hash,dev:true});
 await new Promise(resolve=>app.server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+app.server.address().port;
 let cookie='',csrf='';
 const call=(path,method='GET',body,headers={})=>fetch(base+path,{method,headers:{Origin:origin,...(body?{'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{}),...(csrf?{'X-CSRF-Token':csrf}:{}),...headers},...(body?{body:JSON.stringify(body)}:{})});
 try{
  assert.equal((await call('/hires')).status,401);
  assert.equal((await call('/login','POST',{username:'test-admin',password},{Origin:'https://wrong.example'})).status,403);
  const login=await call('/login','POST',{username:'test-admin',password});assert.equal(login.status,200);assert.match(login.headers.get('set-cookie'),/HttpOnly; SameSite=Strict/);cookie=login.headers.get('set-cookie').split(';')[0];csrf=(await login.json()).csrf;
  assert.equal((await call('/cases','POST',{name:'Other',active:true},{'X-CSRF-Token':'wrong'})).status,403);
  assert.equal((await call('/hires')).status,200);
  const today=todayLondon(),input={requestKey:'33333333-3333-4333-8333-333333333333',start:addDays(today,2),end:addDays(today,6),name:'Test rider',email:'test@example.test',bike:'Road bike',airline:'',message:'',payment:'PayPal',acceptedTerms:true,termsVersion:'2026-10-20',hire_pence:1,totalPence:1};
  assert.equal((await call('/requests','POST',{...input,acceptedTerms:false})).status,400);
  assert.equal((await call('/requests','POST',{...input,termsVersion:'outdated'})).status,400);
  const response=await call('/requests','POST',input);assert.equal(response.status,201);const saved=await response.json();assert.equal(saved.quote.totalPence,20500);
  const duplicate=await call('/requests','POST',input);assert.equal(duplicate.status,200);assert.equal((await duplicate.json()).id,saved.id);
  const short=await call('/requests','POST',{...input,requestKey:'44444444-4444-4444-8444-444444444444',end:addDays(today,4)});assert.equal(short.status,400);
  assert.equal((await call('/logout','POST',{})).status,200);assert.equal((await call('/hires')).status,401);
  assert.match(sessionCookie('test',false),/^__Host-bbb_admin=.*; Secure$/);
 }finally{await app.close();}
});
