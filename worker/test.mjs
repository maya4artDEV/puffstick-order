// Worker v3.0 offline test — run:  node worker/test.mjs
// Generates throwaway RSA keys; mocks Google OAuth/JWK, RTDB (requires access_token) and Telegram. No secrets.
import { webcrypto as wc } from 'node:crypto';
var subtle = wc.subtle;
var b64u = b => Buffer.from(b).toString('base64url');
var enc = s => new TextEncoder().encode(s);
async function genRsa(){ return subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']); }
async function sign(key, header, payload){ var u=b64u(enc(JSON.stringify(header)))+'.'+b64u(enc(JSON.stringify(payload)));
  var s=await subtle.sign('RSASSA-PKCS1-v1_5',key,enc(u)); return u+'.'+b64u(new Uint8Array(s)); }
async function verify(pub, jwt){ var p=jwt.split('.'); var ok=await subtle.verify('RSASSA-PKCS1-v1_5',pub,Buffer.from(p[2],'base64url'),enc(p[0]+'.'+p[1]));
  return ok ? JSON.parse(Buffer.from(p[1],'base64url').toString()) : null; }

var saKeys = await genRsa(), stKeys = await genRsa();
var pkcs8 = Buffer.from(await subtle.exportKey('pkcs8', saKeys.privateKey)).toString('base64');
var pem = '-----BEGIN PRIVATE KEY-----\n' + pkcs8.match(/.{1,64}/g).join('\n') + '\n-----END PRIVATE KEY-----\n';
var PID='puffstick-order-staging';
var SA = {type:'service_account',project_id:PID,private_key_id:'k1',private_key:pem,client_email:'fb@'+PID+'.iam.gserviceaccount.com'};
var stJwk = await subtle.exportKey('jwk', stKeys.publicKey); stJwk.kid='st1';

var env = { TELEGRAM_BOT_TOKEN:'TGTOKEN', TELEGRAM_CHAT_ID:'-100', FIREBASE_URL:'https://rtdb.test', FIREBASE_PATH:'puffstick',
  FIREBASE_SA_JSON: JSON.stringify(SA), ADMIN_PASSWORD:'S3cret!pw' };
var db = { puffstick: { branches_v2:{_ts:1,_payload:{ b01:{name:'สุราษฎร์',pin:'1111',currentLot:35}, b02:{name:'บ้านสวน',pin:'2222',currentLot:66} }},
  orders:{ o100:{id:'o100',branchId:'b01',lotNo:35}, o200:{id:'o200',branchId:'b02',lotNo:66} }, config:{adminPassword:'x'} } };
var oauthCalls=0, tgCalls=[], badAuth=0, now=Date.now(); var realNow=Date.now; Date.now=()=>now;

function getP(segs){ var n=db; for (var s of segs){ if(n==null) return null; n=n[s]; } return n===undefined?null:n; }
function setP(segs,v){ var n=db; for (var i=0;i<segs.length-1;i++){ n[segs[i]]=n[segs[i]]||{}; n=n[segs[i]]; } if(v===null) delete n[segs[segs.length-1]]; else n[segs[segs.length-1]]=v; }
globalThis.fetch = async function(url, opt){ opt=opt||{}; var u=new URL(url); var m=opt.method||'GET';
  if (u.host==='oauth2.googleapis.com'){ oauthCalls++; var a=new URLSearchParams(opt.body).get('assertion'); var p=await verify(saKeys.publicKey,a);
    if(!p||p.aud!=='https://oauth2.googleapis.com/token'||p.iss!==SA.client_email||p.scope.indexOf('firebase.database')<0) return new Response('{"error":"invalid_grant"}',{status:400});
    return Response.json({access_token:'AT-OK',expires_in:3600}); }
  if (u.host==='www.googleapis.com') return Response.json({keys:[stJwk]},{headers:{'Cache-Control':'public, max-age=20000'}});
  if (u.host==='api.telegram.org'){ tgCalls.push(u.pathname.split('/').pop()); return Response.json({ok:true,result:{message_id:tgCalls.length}}); }
  if (u.host==='rtdb.test'){ if(u.searchParams.get('access_token')!=='AT-OK'){ badAuth++; return new Response('{"error":"Permission denied"}',{status:401}); }
    var segs=u.pathname.replace(/^\//,'').replace(/\.json$/,'').split('/');
    if(m==='GET') return Response.json(getP(segs));
    if(m==='PUT'){ setP(segs,JSON.parse(opt.body)); return Response.json(JSON.parse(opt.body)); }
    if(m==='PATCH'){ var cur=getP(segs)||{}; Object.assign(cur,JSON.parse(opt.body)); setP(segs,cur); return Response.json(cur); }
    if(m==='DELETE'){ setP(segs,null); return Response.json(null); }
    if(m==='POST'){ var k='-k'+Math.random().toString(36).slice(2,8); setP(segs.concat(k),JSON.parse(opt.body)); return Response.json({name:k}); } }
  throw new Error('unexpected fetch '+url); };

import { readFileSync } from 'node:fs';
var W = (await import('data:text/javascript;base64,' + readFileSync(new URL('./index.js', import.meta.url)).toString('base64'))).default;
var waits=[]; var ctx={waitUntil:p=>waits.push(p)};
async function call(method, path, body, headers){ var init={method, headers:Object.assign({Origin:'https://maya4artdev.github.io'},headers||{})};
  if (body instanceof FormData) init.body=body; else if (body){ init.body=JSON.stringify(body); init.headers['Content-Type']='application/json'; }
  var r=await W.fetch(new Request('https://w.test'+path,init),env,ctx); await Promise.all(waits); var t=await r.text(); return {s:r.status,j:t?JSON.parse(t):null,h:r.headers}; }
function form(orderId, caption){ var f=new FormData(); f.append('orderId',orderId); f.append('photo',new Blob([new Uint8Array([137,80,78,71])],{type:'image/png'}),'i.png'); f.append('caption',caption||'Lot #35'); return f; }
async function idToken(uid, role, over){ var iat=Math.floor(now/1000); return sign(stKeys.privateKey,{alg:'RS256',kid:'st1'},Object.assign({iss:'https://securetoken.google.com/'+PID,aud:PID,sub:uid,user_id:uid,role:role,iat:iat,exp:iat+3600},over||{})); }
var fails=0; function check(name, cond, info){ console.log((cond?'PASS':'FAIL')+'  '+name+(info?'  → '+info:'')); if(!cond) fails++; }
var logins=()=>Object.values(getP(['puffstick','branch_health','logins'])||{});

var r=await call('GET','/health'); check('GET /health 200 v3.0', r.s===200&&r.j.v==='3.0');
r=await call('OPTIONS','/auth/branch'); check('OPTIONS 204 + CORS allows Authorization', r.s===204&&/Authorization/.test(r.h.get('Access-Control-Allow-Headers'))&&r.h.get('Access-Control-Allow-Origin')==='https://maya4artdev.github.io');
r=await call('POST','/auth/branch',{branchId:'../config',pin:'1111'}); check('branchId "../config" rejected 400', r.s===400, r.j.error);
r=await call('POST','/auth/branch',{branchId:'b99',pin:'1111'}); check('unknown branch 404, no auth_fail node', r.s===404&&!getP(['puffstick','auth_fail','b99']));
for (var i=1;i<=4;i++){ r=await call('POST','/auth/branch',{branchId:'b01',pin:'0000',deviceId:'devA',appVersion:'3.9.0'}); }
check('4 wrong PINs → 401, attemptsLeft 1', r.s===401&&r.j.attemptsLeft===1, JSON.stringify(r.j));
r=await call('POST','/auth/branch',{branchId:'b01',pin:'0000',deviceId:'devA'}); check('5th wrong → 429 locked 300s', r.s===429&&r.j.retryAfterSec===300);
r=await call('POST','/auth/branch',{branchId:'b01',pin:'1111',deviceId:'devA'}); check('correct PIN while locked → still 429', r.s===429);
check('5 failed logins logged ok:false (app schema)', logins().filter(e=>e.ok===false&&e.branchId==='b01'&&e.deviceId==='devA'&&e.branchName==='สุราษฎร์').length===5);
now += 5*60*1000+1000;
r=await call('POST','/auth/branch',{branchId:'b01',pin:'1111',deviceId:'devA',appVersion:'3.9.0'});
var ct = r.s===200 ? await verify(saKeys.publicKey, r.j.customToken) : null;
check('after 5 min correct PIN → 200 + custom token signed by SA', r.s===200&&!!ct);
check('custom token: uid b01, claim role branch, IdentityToolkit aud, exp ≤ 1h', ct&&ct.uid==='b01'&&ct.claims.role==='branch'&&ct.aud.indexOf('identitytoolkit')>0&&ct.exp-ct.iat===3600&&ct.iss===SA.client_email&&ct.sub===SA.client_email);
check('branch returned WITHOUT pin, with id + currentLot', r.j.branch&&!('pin' in r.j.branch)&&r.j.branch.id==='b01'&&r.j.branch.currentLot===35);
check('auth_fail/b01 cleared + ok:true login logged', !getP(['puffstick','auth_fail','b01'])&&logins().some(e=>e.ok===true&&e.branchId==='b01'&&e.via==='worker'));
r=await call('POST','/auth/branch',{branchId:'b02',pin:'0000'}); now += 6*60*1000;
r=await call('POST','/auth/branch',{branchId:'b02',pin:'0000'}); check('old failure outside 5-min window does not accumulate', r.j.attemptsLeft===4, JSON.stringify(r.j));
r=await call('POST','/auth/admin',{password:'wrong'}); check('admin wrong password 401', r.s===401&&r.j.error==='wrong-password');
r=await call('POST','/auth/admin',{password:'S3cret!pw'}); ct = r.s===200 ? await verify(saKeys.publicKey, r.j.customToken) : null;
check('admin correct → token uid admin, role admin; fail counter cleared', ct&&ct.uid==='admin'&&ct.claims.role==='admin'&&!getP(['puffstick','auth_fail','_admin']));

var tg0=tgCalls.length;
r=await call('POST','/send-order',form('o100')); check('send-order tokenless (app v3.8.x) → 200 + Telegram + notified', r.s===200&&tgCalls.length===tg0+1&&getP(['puffstick','orders','o100']).notifiedBy==='worker-proxy');
r=await call('POST','/send-order',form('o100'),{Authorization:'Bearer '+await idToken('b01','branch')}); check('branch token on OWN order → 200', r.s===200);
r=await call('POST','/send-order',form('o200'),{Authorization:'Bearer '+await idToken('b01','branch')}); check('branch token on OTHER branch order → 403', r.s===403&&r.j.error==='not-your-order');
r=await call('POST','/send-order',form('o200'),{Authorization:'Bearer '+await idToken('admin','admin')}); check('admin token on any order → 200', r.s===200);
r=await call('POST','/send-order',form('o100'),{Authorization:'Bearer '+await idToken('b01','branch',{exp:Math.floor(now/1000)-10})}); check('expired idToken → 401', r.s===401&&r.j.error==='bad-token');
r=await call('POST','/send-order',form('o100'),{Authorization:'Bearer '+await idToken('b01','branch',{aud:'other-project'})}); check('idToken for another project → 401', r.s===401);
var forged = await sign(saKeys.privateKey,{alg:'RS256',kid:'st1'},{iss:'https://securetoken.google.com/'+PID,aud:PID,sub:'admin',role:'admin',iat:Math.floor(now/1000),exp:Math.floor(now/1000)+3600});
r=await call('POST','/resend',form('o100'),{Authorization:'Bearer '+forged}); check('forged token (wrong signing key) → 401', r.s===401);
r=await call('POST','/send-order',form('../config')); check('orderId "../config" → 400 (no path injection)', r.s===400&&r.j.error==='bad-order-id');
r=await call('POST','/send-order',form('o999')); check('missing order → 404 order-not-found', r.s===404&&r.j.error==='order-not-found');
r=await call('POST','/resend',form('o100')); check('/resend tokenless → 403 admin-only', r.s===403);
r=await call('POST','/resend',form('o100'),{Authorization:'Bearer '+await idToken('b01','branch')}); check('/resend with branch token → 403', r.s===403);
r=await call('POST','/resend',form('o100'),{Authorization:'Bearer '+await idToken('admin','admin')}); check('/resend with admin token → 200', r.s===200);
var long='x'.repeat(3000); tg0=tgCalls.length;
r=await call('POST','/send-order',form('o100',long)); check('long caption → sendPhoto + sendMessage follow-up (v2.2 kept)', r.s===200&&tgCalls.slice(tg0).join(',')==='sendPhoto,sendMessage', tgCalls.slice(tg0).join(','));
env.REQUIRE_AUTH='1'; r=await call('POST','/send-order',form('o100')); check('REQUIRE_AUTH=1 tokenless → 401', r.s===401&&r.j.error==='auth-required'); delete env.REQUIRE_AUTH;
check('every RTDB call carried the SA access token', badAuth===0, 'unauthenticated RTDB calls: '+badAuth);
check('OAuth token minted once and cached', oauthCalls===1, 'oauth calls: '+oauthCalls);
var e2=Object.assign({},env); delete e2.FIREBASE_SA_JSON;
r=await W.fetch(new Request('https://w.test/send-order',{method:'POST',body:form('o100')}),e2,ctx); check('missing FIREBASE_SA_JSON → 500 worker-misconfigured (not a crash)', r.status===500);
console.log('\n'+(fails?fails+' FAILED':'ALL PASSED'));
process.exitCode = fails?1:0;
