// POST { address, signature, timestamp, nonce, httpMethod? }
// httpMethod: 'GET' (derive existing) or 'POST' (create new) — tries GET first
// Gets the real client IP from Next.js request headers
function clientIp(req) {
  return (
    (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    req.headers['x-real-ip'] ||
    req.socket?.remoteAddress ||
    ''
  );
}
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { address, signature, timestamp, nonce = 0, httpMethod = 'GET' } = req.body || {};
  if (!address || !signature || !timestamp)
    return res.status(400).json({ error: 'address, signature, timestamp required' });

  const endpoint = httpMethod === 'POST'
    ? 'https://clob.polymarket.com/auth/api-key'
    : 'https://clob.polymarket.com/auth/derive-api-key';

  try {
    const r = await fetch(endpoint, {
      method: httpMethod,
      headers: {
        'X-Forwarded-For': clientIp(req),
        'POLY_ADDRESS':   address,
        'POLY_SIGNATURE': signature,
        'POLY_TIMESTAMP': String(timestamp),
        'POLY_NONCE':     String(nonce),
        'Content-Type':   'application/json',
      },
    });
    const data = await r.json();
    if (!r.ok) return res.status(r.status).json({ error: data.error || JSON.stringify(data) });
    return res.json(data);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
