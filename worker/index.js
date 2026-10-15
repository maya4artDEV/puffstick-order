// ==============================================
// PuffStick Order — Worker v3.0 (SECURITY_PLAN_C Phase 1)
// ==============================================
// PURPOSE
// - Telegram proxy: branch sends multipart { orderId, photo (PNG), caption } →
//   Telegram sendPhoto (token only in Worker secrets) → PATCH order notified=true
// - Auth (v3.0): PIN / admin password checked SERVER-side → Firebase custom token.
//   The app exchanges it for an idToken and talks to RTDB REST itself (option C).
//   RTDB Rules = single source of truth for permissions (Phase 3).
//
// v3.0 CHANGE LOG (2026-10-15) — non-breaking for app v3.8.x
// - Every RTDB call authenticates with an OAuth2 access token minted from the
//   service account (decision D1) → works with open AND locked rules.
// - POST /auth/branch {branchId, pin, deviceId?, appVersion?}
//     → {ok, customToken, branch (pin removed)}; lockout 5 wrong → 5 min in
//     RTDB auth_fail/{branchId}; every attempt logged to branch_health/logins
//     (same shape as app v3.6.1+, plus via:'worker').
// - POST /auth/admin {password} → {ok, customToken} (uid 'admin', claim role 'admin');
//     same lockout under auth_fail/_admin.
// - POST /resend: admin idToken required (Authorization: Bearer <idToken>).
//     App v3.8.x never calls /resend (admin resend goes through /send-order).
// - POST /send-order: optional Bearer idToken. A branch token must own the order.
//     Tokenless still accepted until var REQUIRE_AUTH = '1' (flip after Phase 2).
// - orderId / branchId validated before they reach an RTDB path (the Worker now
//   holds a full-access credential — no path injection like '../config').
// - CORS: Authorization header allowed; origins from ALLOWED_ORIGINS.
// - Telegram logic (v2.1 timeout/retry, v2.2 long caption) unchanged.
//
// SECRETS / VARS
// - TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, FIREBASE_URL, FIREBASE_PATH   (as v2.2)
// - FIREBASE_SA_JSON  whole service-account key file — FULL DB ACCESS, secret only
// - ADMIN_PASSWORD    admin login password
// - REQUIRE_AUTH      optional var, '1' = /send-order requires an idToken
// - ALLOWED_ORIGINS   optional var, comma-separated (default GitHub Pages origin)
//
// ENDPOINTS
// - GET  /health
// - POST /send-order   (branch confirm + admin resend in app v3.8.x)
// - POST /resend       (admin only)
// - POST /auth/branch
// - POST /auth/admin
// ==============================================

var DEFAULT_ORIGIN = 'https://maya4artdev.github.io';
var WORKER_VERSION = '3.0';
var ID_RE = /^[A-Za-z0-9_-]{1,64}$/;          // branchId / orderId allowed in RTDB paths
var LOCK_MAX = 5;                              // wrong attempts before lockout
var LOCK_MS = 5 * 60 * 1000;                   // lockout length + counting window
var ADMIN_LOCK_KEY = '_admin';
var NET_TIMEOUT = 8000;
var OAUTH_SCOPE = 'https://www.googleapis.com/auth/firebase.database https://www.googleapis.com/auth/userinfo.email';
var CUSTOM_TOKEN_AUD = 'https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit';
var SECURETOKEN_JWK_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';

export default {
  async fetch(request, env, ctx) {
    var origin = pickOrigin(request, env);
    var res;
    try {
      res = await route(request, env, ctx);
    } catch (e) {
      res = reply({ ok: false, error: 'worker-error', detail: String((e && e.message) || e).slice(0, 120) }, 500);
    }
    return withCors(res, origin);
  }
};

async function route(request, env, ctx) {
  var path = new URL(request.url).pathname;
  var m = request.method;
  if (m === 'OPTIONS') return new Response(null, { status: 204 });
  if (m === 'GET' && path === '/health') return reply({ ok: true, v: WORKER_VERSION, ts: Date.now() }, 200);
  if (m === 'POST') {
    if (path === '/send-order') return handleSendOrder(request, env, false);
    if (path === '/resend') return handleSendOrder(request, env, true);
    if (path === '/auth/branch') return handleAuthBranch(request, env, ctx);
    if (path === '/auth/admin') return handleAuthAdmin(request, env);
  }
  return reply({ ok: false, error: 'not-found' }, 404);
}

// ============================================================
// HTTP helpers — CORS, JSON reply, timeout
// ============================================================
function pickOrigin(request, env) {
  var list = String(env.ALLOWED_ORIGINS || DEFAULT_ORIGIN).split(',').map(function (s) { return s.trim(); });
  var o = request.headers.get('Origin');
  return (o && list.indexOf(o) !== -1) ? o : list[0];
}

function withCors(res, origin) {
  var h = new Headers(res.headers);
  h.set('Access-Control-Allow-Origin', origin);
  h.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  h.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  h.set('Access-Control-Max-Age', '86400');
  h.set('Vary', 'Origin');
  return new Response(res.body, { status: res.status, headers: h });
}

function reply(body, status) {
  return new Response(JSON.stringify(body), { status: status, headers: { 'Content-Type': 'application/json' } });
}

async function readJson(request) {
  try { return await request.json(); } catch (e) { return null; }
}

function clip(v, n) { return String(v == null ? '' : v).slice(0, n); }

// v2.1: abort any outbound fetch after timeoutMs (stalled upstream = Worker hang)
async function fetchWithTimeout(url, options, timeoutMs) {
  var controller = new AbortController();
  var timer = setTimeout(function () { controller.abort(); }, timeoutMs);
  var opts = options || {};
  opts.signal = controller.signal;
  try {
    var res = await fetch(url, opts);
    clearTimeout(timer);
    return res;
  } catch (e) {
    clearTimeout(timer);
    throw e;
  }
}

// ============================================================
// Crypto — base64url + RS256 signing with the service account (WebCrypto)
// ============================================================
function b64url(bytes) {
  var s = '';
  for (var i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlDecode(str) {
  str = String(str).replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  var bin = atob(str);
  var out = new Uint8Array(bin.length);
  for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function utf8(s) { return new TextEncoder().encode(s); }
function b64urlJson(obj) { return b64url(utf8(JSON.stringify(obj))); }

var _sa = null;
var _saKey = null;

function serviceAccount(env) {
  if (!_sa) {
    if (!env.FIREBASE_SA_JSON) throw new Error('missing FIREBASE_SA_JSON');
    var sa = JSON.parse(env.FIREBASE_SA_JSON);
    if (!sa.client_email || !sa.private_key || !sa.project_id) throw new Error('bad FIREBASE_SA_JSON');
    _sa = sa;
  }
  return _sa;
}

async function saSigningKey(env) {
  if (!_saKey) {
    var pem = serviceAccount(env).private_key;
    var der = b64urlDecode(pem.replace(/-----[A-Z ]+-----/g, '').replace(/\s+/g, ''));
    _saKey = await crypto.subtle.importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  }
  return _saKey;
}

async function signJwt(env, payload) {
  var unsigned = b64urlJson({ alg: 'RS256', typ: 'JWT', kid: serviceAccount(env).private_key_id }) + '.' + b64urlJson(payload);
  var sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', await saSigningKey(env), utf8(unsigned));
  return unsigned + '.' + b64url(new Uint8Array(sig));
}

// ============================================================
// RTDB access — OAuth2 access token from the service account (D1)
// Bypasses rules like the legacy secret; cached ~55 min per isolate.
// ============================================================
var _access = { token: null, exp: 0 };

async function accessToken(env) {
  var now = Date.now();
  if (_access.token && now < _access.exp - 5 * 60 * 1000) return _access.token;
  var sa = serviceAccount(env);
  var iat = Math.floor(now / 1000);
  var assertion = await signJwt(env, {
    iss: sa.client_email, scope: OAUTH_SCOPE, aud: 'https://oauth2.googleapis.com/token', iat: iat, exp: iat + 3600
  });
  var r = await fetchWithTimeout('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=' + encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer') + '&assertion=' + assertion
  }, NET_TIMEOUT);
  var j = await r.json().catch(function () { return {}; });
  if (!r.ok || !j.access_token) throw new Error('oauth HTTP ' + r.status + ' ' + clip(j.error, 40));
  _access = { token: j.access_token, exp: now + (j.expires_in || 3600) * 1000 };
  return _access.token;
}

// path is relative to FIREBASE_PATH; ids inside it must already pass ID_RE
async function rtdb(env, method, path, body) {
  var base = String(env.FIREBASE_URL || '').replace(/\/$/, '');
  var root = String(env.FIREBASE_PATH || 'puffstick').replace(/^\/|\/$/g, '');
  var url = base + '/' + root + '/' + path + '.json?access_token=' + encodeURIComponent(await accessToken(env));
  var opt = { method: method };
  if (body !== undefined) {
    opt.headers = { 'Content-Type': 'application/json' };
    opt.body = JSON.stringify(body);
  }
  var r = await fetchWithTimeout(url, opt, NET_TIMEOUT);
  if (!r.ok) {
    var err = new Error('rtdb ' + method + ' ' + path.split('/')[0] + ' HTTP ' + r.status);
    err.status = r.status;
    throw err;
  }
  return r.json();
}

// ============================================================
// Firebase Auth — custom token out, idToken in
// ============================================================
async function mintCustomToken(env, uid, claims) {
  var sa = serviceAccount(env);
  var iat = Math.floor(Date.now() / 1000);
  return signJwt(env, {
    iss: sa.client_email, sub: sa.client_email, aud: CUSTOM_TOKEN_AUD,
    iat: iat, exp: iat + 3600, uid: uid, claims: claims
  });
}

var _jwks = { keys: null, exp: 0 };

async function securetokenKeys() {
  if (_jwks.keys && Date.now() < _jwks.exp) return _jwks.keys;
  var r = await fetchWithTimeout(SECURETOKEN_JWK_URL, {}, NET_TIMEOUT);
  if (!r.ok) throw new Error('jwks HTTP ' + r.status);
  var j = await r.json();
  var m = /max-age=(\d+)/.exec(r.headers.get('Cache-Control') || '');
  _jwks = { keys: j.keys || [], exp: Date.now() + (m ? parseInt(m[1], 10) : 3600) * 1000 };
  return _jwks.keys;
}

// Returns the idToken payload, or null for any invalid token (never throws on bad input)
async function verifyIdToken(env, token) {
  var parts = String(token || '').split('.');
  if (parts.length !== 3) return null;
  var header, payload;
  try {
    header = JSON.parse(new TextDecoder().decode(b64urlDecode(parts[0])));
    payload = JSON.parse(new TextDecoder().decode(b64urlDecode(parts[1])));
  } catch (e) { return null; }
  if (header.alg !== 'RS256') return null;
  var keys = await securetokenKeys();
  var jwk = null;
  for (var i = 0; i < keys.length; i++) { if (keys[i].kid === header.kid) jwk = keys[i]; }
  if (!jwk) return null;
  var key = await crypto.subtle.importKey('jwk', { kty: jwk.kty, n: jwk.n, e: jwk.e },
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  var ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64urlDecode(parts[2]), utf8(parts[0] + '.' + parts[1]));
  if (!ok) return null;
  var pid = serviceAccount(env).project_id;
  var now = Math.floor(Date.now() / 1000);
  if (payload.aud !== pid || payload.iss !== 'https://securetoken.google.com/' + pid) return null;
  if (!(payload.exp > now) || !(payload.iat <= now + 300) || !payload.sub) return null;
  return payload;
}

// {none} no header · {invalid} bad token · {uid, admin} verified caller
async function callerOf(request, env) {
  var m = /^Bearer\s+(\S+)$/i.exec(request.headers.get('Authorization') || '');
  if (!m) return { none: true };
  var p = await verifyIdToken(env, m[1]);
  return p ? { uid: p.sub, admin: p.role === 'admin' } : { invalid: true };
}

// ============================================================
// Lockout + login audit
// ============================================================
function sameSecret(a, b) {
  a = String(a == null ? '' : a);
  b = String(b == null ? '' : b);
  var diff = a.length ^ b.length;
  var n = Math.max(a.length, b.length);
  for (var i = 0; i < n; i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0 && a.length > 0;
}

// → {state, left}: left = ms still locked (0 = free)
async function readLock(env, key) {
  var s = (await rtdb(env, 'GET', 'auth_fail/' + key)) || {};
  var left = s.until ? s.until - Date.now() : 0;
  return { state: s, left: left > 0 ? left : 0 };
}

// Count resets when the last failure is older than the window
async function recordFail(env, key, state) {
  var now = Date.now();
  var count = ((state.last && now - state.last < LOCK_MS) ? (state.count || 0) : 0) + 1;
  var next = count >= LOCK_MAX ? { count: 0, until: now + LOCK_MS, last: now } : { count: count, until: 0, last: now };
  await rtdb(env, 'PUT', 'auth_fail/' + key, next);
  return next;
}

async function clearFail(env, key, state) {
  if (state.count || state.until) await rtdb(env, 'DELETE', 'auth_fail/' + key);
}

function lockedReply(ms) {
  return reply({ ok: false, error: 'locked', retryAfterSec: Math.ceil(ms / 1000) }, 429);
}

// Same shape the app writes (v3.6.1+) so Branch Health keeps working; never blocks login
function logLogin(env, ctx, branchId, branchName, ok, body) {
  var entry = {
    ts: Date.now(), deviceId: clip(body.deviceId, 64) || 'unknown', branchId: branchId,
    branchName: branchName || branchId, appVersion: clip(body.appVersion, 16), ok: ok, via: 'worker'
  };
  var p = rtdb(env, 'POST', 'branch_health/logins', entry).catch(function () {});
  if (ctx && ctx.waitUntil) ctx.waitUntil(p);
}

// ============================================================
// POST /auth/branch {branchId, pin, deviceId?, appVersion?}
// ============================================================
async function handleAuthBranch(request, env, ctx) {
  var body = await readJson(request);
  if (!body) return reply({ ok: false, error: 'bad-json' }, 400);
  var id = String(body.branchId || '');
  if (!ID_RE.test(id) || body.pin == null || body.pin === '') return reply({ ok: false, error: 'missing-fields' }, 400);

  var lock = await readLock(env, id);
  if (lock.left) return lockedReply(lock.left);

  var branch = await rtdb(env, 'GET', 'branches_v2/_payload/' + id);
  if (!branch) return reply({ ok: false, error: 'unknown-branch' }, 404);

  if (!sameSecret(body.pin, branch.pin)) {
    var st = await recordFail(env, id, lock.state);
    logLogin(env, ctx, id, branch.name, false, body);
    if (st.until) return lockedReply(LOCK_MS);
    return reply({ ok: false, error: 'wrong-pin', attemptsLeft: LOCK_MAX - st.count }, 401);
  }

  await clearFail(env, id, lock.state);
  logLogin(env, ctx, id, branch.name, true, body);
  var safe = { id: id };
  for (var k in branch) { if (k !== 'pin') safe[k] = branch[k]; }
  return reply({ ok: true, customToken: await mintCustomToken(env, id, { role: 'branch' }), branch: safe }, 200);
}

// ============================================================
// POST /auth/admin {password}
// ============================================================
async function handleAuthAdmin(request, env) {
  if (!env.ADMIN_PASSWORD) return reply({ ok: false, error: 'worker-misconfigured' }, 500);
  var body = await readJson(request);
  if (!body || body.password == null || body.password === '') return reply({ ok: false, error: 'missing-fields' }, 400);

  var lock = await readLock(env, ADMIN_LOCK_KEY);
  if (lock.left) return lockedReply(lock.left);

  if (!sameSecret(body.password, env.ADMIN_PASSWORD)) {
    var st = await recordFail(env, ADMIN_LOCK_KEY, lock.state);
    if (st.until) return lockedReply(LOCK_MS);
    return reply({ ok: false, error: 'wrong-password', attemptsLeft: LOCK_MAX - st.count }, 401);
  }

  await clearFail(env, ADMIN_LOCK_KEY, lock.state);
  return reply({ ok: true, customToken: await mintCustomToken(env, 'admin', { role: 'admin' }) }, 200);
}

// ============================================================
// POST /send-order (adminOnly=false) · POST /resend (adminOnly=true)
// FormData: orderId, photo (PNG blob), caption
// ============================================================
async function handleSendOrder(request, env, adminOnly) {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID || !env.FIREBASE_URL || !env.FIREBASE_SA_JSON) {
    return reply({ ok: false, error: 'worker-misconfigured' }, 500);
  }

  var caller = await callerOf(request, env);
  if (caller.invalid) return reply({ ok: false, error: 'bad-token' }, 401);
  if (adminOnly && !caller.admin) return reply({ ok: false, error: 'admin-only' }, 403);
  if (caller.none && env.REQUIRE_AUTH === '1') return reply({ ok: false, error: 'auth-required' }, 401);

  var formData;
  try {
    formData = await request.formData();
  } catch (e) {
    return reply({ ok: false, error: 'bad-multipart' }, 400);
  }
  var orderId = String(formData.get('orderId') || '');
  var photo = formData.get('photo');
  var caption = formData.get('caption') || '';
  if (!orderId || !photo) return reply({ ok: false, error: 'missing-fields' }, 400);
  if (!ID_RE.test(orderId)) return reply({ ok: false, error: 'bad-order-id' }, 400);

  // Anti-abuse: order must exist (and belong to the calling branch when a token is sent)
  var orderData;
  try {
    orderData = await rtdb(env, 'GET', 'orders/' + orderId);
  } catch (e) {
    if (e.status) return reply({ ok: false, error: 'fb-fetch-failed', status: e.status }, 502);
    return reply({ ok: false, error: 'fb-network', detail: String(e).slice(0, 100) + (e.name === 'AbortError' ? ' (timeout 8s)' : '') }, 502);
  }
  if (!orderData || !orderData.id) return reply({ ok: false, error: 'order-not-found' }, 404);
  if (caller.uid && !caller.admin && orderData.branchId !== caller.uid) {
    return reply({ ok: false, error: 'not-your-order' }, 403);
  }

  var tg = await telegramSend(env, photo, caption);
  if (!tg.ok) return reply(tg.body, 502);

  // Success — mark notified (Telegram already sent: a failed mark must not fail the reply)
  try {
    await rtdb(env, 'PATCH', 'orders/' + orderId, {
      notified: true, notifiedAt: Date.now(), notifiedBy: 'worker-proxy', notifyError: null
    });
  } catch (e) { /* admin can still resend; order stays notified=false */ }

  return reply({ ok: true, tg: { message_id: tg.messageId } }, 200);
}

// ============================================================
// Telegram — logic unchanged from v2.2
// - sendPhoto: timeout 8s, retry once (v2.1)
// - caption > 1000 chars → short caption + full text via sendMessage chunks (v2.2)
// → {ok:true, messageId} | {ok:false, body:{ok,error,status?,detail?}}
// ============================================================
async function telegramSend(env, photo, caption) {
  var token = env.TELEGRAM_BOT_TOKEN;
  var chatId = env.TELEGRAM_CHAT_ID;
  var fullText = caption;
  var isLong = caption.length > 1000;
  if (isLong) {
    caption = caption.slice(0, 940);
    var cut = caption.lastIndexOf('\n');
    if (cut > 200) caption = caption.slice(0, cut);
    caption += '\n…(รายละเอียดเต็มในข้อความถัดไป)';
  }

  var tgUrl = 'https://api.telegram.org/bot' + token + '/sendPhoto';
  var tgResult = null;
  var tgLastError = null;
  for (var attempt = 1; attempt <= 2; attempt++) {
    // FormData rebuilt each attempt — a Blob body can only be read once
    var tgForm = new FormData();
    tgForm.append('chat_id', chatId);
    tgForm.append('photo', photo, 'invoice.png');
    tgForm.append('caption', caption);
    try {
      var rTg = await fetchWithTimeout(tgUrl, { method: 'POST', body: tgForm }, NET_TIMEOUT);
      tgResult = await rTg.json();
      if (rTg.ok && tgResult.ok) { tgLastError = null; break; }
      tgLastError = { ok: false, error: 'tg-failed', status: rTg.status, detail: (tgResult && tgResult.description) || 'unknown' };
    } catch (e) {
      tgLastError = { ok: false, error: 'tg-network', detail: String(e).slice(0, 100) + (e.name === 'AbortError' ? ' (timeout 8s)' : '') };
      tgResult = null;
    }
  }
  if (tgLastError) return { ok: false, body: tgLastError };

  if (isLong) {
    var msgUrl = 'https://api.telegram.org/bot' + token + '/sendMessage';
    for (var i = 0; i < fullText.length; i += 4000) {
      try {
        var rMsg = await fetchWithTimeout(msgUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId, text: fullText.slice(i, i + 4000) })
        }, NET_TIMEOUT);
        if (!rMsg.ok) return { ok: false, body: { ok: false, error: 'tg-text-failed', status: rMsg.status } };
      } catch (e) {
        return { ok: false, body: { ok: false, error: 'tg-text-network', detail: String(e).slice(0, 100) } };
      }
    }
  }
  return { ok: true, messageId: tgResult.result && tgResult.result.message_id };
}
