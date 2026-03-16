import crypto from 'crypto';

function l2Sig(secret, timestamp, method, path, body = '') {
  return crypto
    .createHmac('sha256', secret)
    .update(timestamp + method + path + body)
    .digest('base64');
}

// POST { order, signature, apiKey, secret, passphrase }
// Attaches L2 HMAC auth headers and submits signed order to Polymarket CLOB
// Gets the real client IP from Next.js request headers
function clientIp(req) {
  return (
    (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    req.headers['x-real-ip'] ||
    req.socket?.remoteAddress ||
    ''
  );
}
// Gets the real client IP from Next.js request headers

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { order, signature, apiKey, secret, passphrase } = req.body || {};
  if (!order || !signature || !apiKey || !secret || !passphrase)
    return res.status(400).json({ error: 'order, signature, apiKey, secret, passphrase required' });

  const timestamp = String(Date.now());
  const path      = '/order';
  const method    = 'POST';

  const payload = {
    order:     { ...order, signature },
    owner:     order.maker,
    orderType: 'GTC',
  };

  const body = JSON.stringify(payload);
  const hmac = l2Sig(secret, timestamp, method, path, body);

  try {
    const r = await fetch(`https://clob.polymarket.com${path}`, {
      method: 'POST',
      headers: {
        'Content-Type':    'application/json',
        'X-Forwarded-For': clientIp(req),
        'POLY_ADDRESS':    order.maker,
        'POLY_SIGNATURE':  hmac,
        'POLY_TIMESTAMP':  timestamp,
        'POLY_PASSPHRASE': passphrase,
        'POLY_API_KEY':    apiKey,
      },
      body,
    });
    const data = await r.json();
    return res.status(r.ok ? 200 : r.status).json(data);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
