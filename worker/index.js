// ==============================================
// PuffStick Order — Telegram Notifier Worker v2.1
// ==============================================
// PURPOSE
// - Receive order notifications from branch devices via HTTP POST
// - Branch sends multipart: { orderId, photo (PNG blob), caption (text) }
// - Worker forwards to Telegram sendPhoto using token from secrets
// - Worker patches Firebase order: notified=true on success
// - Token never appears in branch source code
//
// v2.1 CHANGE LOG (fix: intermittent multi-minute hang, root cause = no
// timeout on outbound fetch calls; a slow/stalled Telegram or Firebase
// response would hang the Worker indefinitely with no retry/fallback)
// - Added fetchWithTimeout() — aborts any outbound fetch after 8s
// - Telegram sendPhoto now retries once on timeout/network error before
//   failing back to the branch
// - No change to endpoints, request/response shape, or Firebase schema
//
// SECURITY MODEL
// - TELEGRAM_BOT_TOKEN stored only in Cloudflare Secrets (encrypted)
// - To revoke token: update secret in Cloudflare dashboard — branches unaffected
// - CORS restricted to known origin (maya4artdev.github.io)
// - Optional: anti-abuse check — verify orderId exists in Firebase before forwarding
//
// ENDPOINTS
// - POST /send-order   (main — called from branch when confirming order)
// - POST /resend       (admin manual resend from history)
// - GET  /health       (uptime check)
//
// DEPLOYMENT
// - Worker URL: https://puffstick-telegram-notifier.<account>.workers.dev/
// - Secrets needed: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, FIREBASE_URL, FIREBASE_PATH
// - No cron trigger needed (removed — replaced by direct HTTP call)
// ==============================================

var ALLOWED_ORIGIN = 'https://maya4artdev.github.io';

export default {
  async fetch(request, env, ctx) {
    var url = new URL(request.url);

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return corsResponse(null, 204);
    }

    // GET /health — uptime check
    if (url.pathname === '/health' && request.method === 'GET') {
      return corsResponse({ ok: true, ts: Date.now() }, 200);
    }

    // POST /send-order — main path (branch confirms order)
    if (url.pathname === '/send-order' && request.method === 'POST') {
      return await handleSendOrder(request, env);
    }

    // POST /resend — admin manual resend
    if (url.pathname === '/resend' && request.method === 'POST') {
      return await handleResend(request, env);
    }

    return corsResponse({ ok: false, error: 'not-found' }, 404);
  }
};

// ============================================================
// CORS helper
// ============================================================
function corsResponse(body, status) {
  var headers = {
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400'
  };
  if (body === null) {
    return new Response(null, { status: status, headers: headers });
  }
  headers['Content-Type'] = 'application/json';
  return new Response(JSON.stringify(body), { status: status, headers: headers });
}

// ============================================================
// fetchWithTimeout — abort a fetch if it takes too long
// v2.1: prevents a stalled upstream (Telegram/Firebase) from hanging
// the Worker with no response, which is the confirmed root cause of
// the intermittent multi-minute delay reported 2026-07-02
// ============================================================
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
// POST /send-order — branch device sends multipart
// FormData fields:
//   - orderId  (string)   — Firebase order key
//   - photo    (Blob/PNG) — invoice image rendered by branch
//   - caption  (string)   — Telegram caption text
// ============================================================
async function handleSendOrder(request, env) {
  var token = env.TELEGRAM_BOT_TOKEN;
  var chatId = env.TELEGRAM_CHAT_ID;
  var fbUrl = env.FIREBASE_URL;
  var fbPath = env.FIREBASE_PATH || 'puffstick';

  if (!token || !chatId || !fbUrl) {
    return corsResponse({ ok: false, error: 'worker-misconfigured' }, 500);
  }

  // Parse multipart from branch
  var formData;
  try {
    formData = await request.formData();
  } catch (e) {
    return corsResponse({ ok: false, error: 'bad-multipart' }, 400);
  }

  var orderId = formData.get('orderId');
  var photo = formData.get('photo');
  var caption = formData.get('caption') || '';
  // v2.2: Telegram sendPhoto caption max = 1024 chars.
  // Long orders (multi-location branches) → short photo caption + full text as follow-up message.
  var fullText = caption;
  var isLong = caption.length > 1000;
  if (isLong) {
    caption = caption.slice(0, 940);
    var cut = caption.lastIndexOf('\n');
    if (cut > 200) caption = caption.slice(0, cut);
    caption += '\n…(รายละเอียดเต็มในข้อความถัดไป)';
  }

  if (!orderId || !photo) {
    return corsResponse({ ok: false, error: 'missing-fields' }, 400);
  }

  // Anti-abuse: verify order exists in Firebase before sending
  // (prevents someone abusing Worker URL to spam Telegram with fake photos)
  var orderEp = fbUrl + '/' + fbPath + '/orders/' + orderId + '.json';
  var orderData;
  try {
    var rOrd = await fetchWithTimeout(orderEp, {}, 8000);
    if (!rOrd.ok) {
      return corsResponse({ ok: false, error: 'fb-fetch-failed', status: rOrd.status }, 502);
    }
    orderData = await rOrd.json();
  } catch (e) {
    return corsResponse({
      ok: false,
      error: 'fb-network',
      detail: String(e).slice(0, 100) + (e.name === 'AbortError' ? ' (timeout 8s)' : '')
    }, 502);
  }

  if (!orderData || !orderData.id) {
    return corsResponse({ ok: false, error: 'order-not-found' }, 404);
  }

  // Forward to Telegram sendPhoto — timeout 8s, retry once on failure
  var tgUrl = 'https://api.telegram.org/bot' + token + '/sendPhoto';
  var tgResult = null;
  var tgLastError = null;
  var tgAttempt;

  for (tgAttempt = 1; tgAttempt <= 2; tgAttempt++) {
    // FormData must be rebuilt each attempt — a Blob body can only be read once
    var tgForm = new FormData();
    tgForm.append('chat_id', chatId);
    tgForm.append('photo', photo, 'invoice.png');
    tgForm.append('caption', caption);

    try {
      var rTg = await fetchWithTimeout(tgUrl, { method: 'POST', body: tgForm }, 8000);
      tgResult = await rTg.json();
      if (rTg.ok && tgResult.ok) {
        tgLastError = null;
        break; // success — exit retry loop
      }
      tgLastError = {
        error: 'tg-failed',
        status: rTg.status,
        detail: (tgResult && tgResult.description) || 'unknown'
      };
    } catch (e) {
      tgLastError = {
        error: 'tg-network',
        detail: String(e).slice(0, 100) + (e.name === 'AbortError' ? ' (timeout 8s)' : '')
      };
      tgResult = null;
    }
    // attempt 1 failed — loop continues to attempt 2
    // attempt 2 failed — loop ends, tgLastError carries the final failure
  }

  if (tgLastError) {
    // Don't mark notified — let branch see error + admin can resend
    return corsResponse({ ok: false, error: tgLastError.error, status: tgLastError.status, detail: tgLastError.detail }, 502);
  }
  // v2.2: follow-up full text (sendMessage limit 4096 → chunk at 4000)
  if (isLong) {
    var msgUrl = 'https://api.telegram.org/bot' + token + '/sendMessage';
    for (var i = 0; i < fullText.length; i += 4000) {
      try {
        var rMsg = await fetchWithTimeout(msgUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId, text: fullText.slice(i, i + 4000) })
        }, 8000);
        if (!rMsg.ok) {
          return corsResponse({ ok: false, error: 'tg-text-failed', status: rMsg.status }, 502);
        }
      } catch (e) {
        return corsResponse({ ok: false, error: 'tg-text-network', detail: String(e).slice(0, 100) }, 502);
      }
    }
  }
  // Success — mark notified=true in Firebase
  try {
    await fetchWithTimeout(orderEp, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        notified: true,
        notifiedAt: Date.now(),
        notifiedBy: 'worker-proxy',
        notifyError: null
      })
    }, 8000);
  } catch (e) {
    // Telegram already sent — log but don't fail the response
    // (branch will see ok=true; Firebase mark can be retried)
  }

  return corsResponse({ ok: true, tg: { message_id: tgResult.result && tgResult.result.message_id } }, 200);
}

// ============================================================
// POST /resend — admin manual resend from history
// Same as /send-order — accepts re-rendered photo from admin device
// ============================================================
async function handleResend(request, env) {
  // Same logic as send-order — branch re-renders PNG and resends
  return await handleSendOrder(request, env);
}